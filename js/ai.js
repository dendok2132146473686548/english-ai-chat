// Нейросеть (Google Gemini) для проверки ответов и ведения диалога.
// Локальный движок (evaluator.js / conversation.js) остаётся фолбэком:
// при любой ошибке сети/ключа тихо переключаемся на него.
// Файл безопасен для Node-тестов: fetch вызывается только внутри async-функций.
const AI_DEFAULT_MODEL = 'gemini-2.0-flash';
const AI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

function aiSettings() {
  if (!db.ai) db.ai = { enabled: false, key: '', model: AI_DEFAULT_MODEL };
  return db.ai;
}
function aiReady() {
  const s = aiSettings();
  return !!(s.enabled && (s.key || '').trim());
}

function clampScore(v, fallback) {
  const n = Math.round(Number(v));
  if (!isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

// ---------- Проверка ответа ----------
// Просит у модели СТРОГО JSON, затем parseCheckResult маппит его
// в формат локального evaluateAnswer: {corrections, fragments, better,
// natural, grammar, vocabulary, naturalness, context} (+ unclear).
function buildCheckerPrompt(userText, lastAiText, situation, level) {
  const topic = situation ? (situation.titleRu + ' / ' + situation.id) : 'everyday conversation';
  return 'You are an English teacher checking a Russian-speaking student\'s answer.\n' +
    'Student level: ' + level + '. Be lenient for low levels, strict for high levels.\n' +
    'Situation: ' + topic + '.\n' +
    'Your last question was: "' + lastAiText + '"\n' +
    'Student answer: "' + userText + '"\n\n' +
    'RULES:\n' +
    '1. Find REAL mistakes only: grammar, wrong word, clear typo. Minimal fragments (2-5 words), "original" must be an EXACT substring of the student answer.\n' +
    '2. NEVER invent mistakes. If the answer is fully correct, return empty corrections.\n' +
    '3. If the answer is correct but unnatural, put it in "natural" (NOT in corrections).\n' +
    '4. If the answer is meaningless gibberish (random letters, no English words), return {"unclear": true} and nothing else.\n' +
    '5. "better" = full corrected sentence, or null when there are no corrections.\n' +
    '6. Explanations ("explanation") in Russian, one short sentence.\n\n' +
    'Reply with ONLY this JSON, no other text:\n' +
    '{"unclear": false, "corrections": [{"original": "...", "correction": "...", "type": "grammar|vocabulary|spelling", "explanation": "..."}], ' +
    '"better": "..."|null, "natural": {"sentence": "..."}|null, ' +
    '"grammar": 0-100, "vocabulary": 0-100, "naturalness": 0-100, "context": 0-100}';
}

function stripCodeFences(s) {
  return String(s || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function parseCheckResult(jsonText, raw) {
  let obj;
  try {
    obj = JSON.parse(stripCodeFences(jsonText));
  } catch (e) {
    throw new Error('bad AI json');
  }
  if (obj && obj.unclear === true) {
    return { unclear: true, corrections: [], fragments: [], better: null, natural: null, grammar: 0, vocabulary: 0, naturalness: 0, context: 0, source: 'ai' };
  }
  const list = Array.isArray(obj.corrections) ? obj.corrections : [];
  const corrections = [];
  list.forEach(c => {
    const original = String((c && c.original) || '').trim();
    const correction = String((c && c.correction) || '').trim();
    if (!original || !correction || original.toLowerCase() === correction.toLowerCase()) return;
    // "original" обязан быть куском ответа пользователя — иначе это выдумка
    if (String(raw).toLowerCase().indexOf(original.toLowerCase()) < 0) return;
    const type = /vocab|lexic/i.test(c.type || '') ? 'vocabulary' : (/spell|typo/i.test(c.type || '') ? 'spelling' : 'grammar');
    corrections.push({ type, original, correction, explanation: String((c && c.explanation) || '') });
    if (corrections.length >= 6) return;
  });
  const hasErr = corrections.length > 0;
  return {
    unclear: false,
    corrections,
    fragments: corrections.map(c => ({ from: c.original, to: c.correction })),
    better: (typeof obj.better === 'string' && obj.better.trim() && hasErr) ? obj.better.trim() : null,
    natural: (!hasErr && obj.natural && typeof obj.natural.sentence === 'string' && obj.natural.sentence.trim())
      ? { sentence: obj.natural.sentence.trim() } : null,
    grammar: clampScore(obj.grammar, hasErr ? 70 : 95),
    vocabulary: clampScore(obj.vocabulary, hasErr ? 70 : 95),
    naturalness: clampScore(obj.naturalness, hasErr ? 70 : 95),
    context: clampScore(obj.context, 90),
    source: 'ai',
  };
}

// ---------- Диалог ----------
// История в формате Gemini contents; системная инструкция задаёт роль.
function buildDialoguePrompt(userText, turns, situation, level) {
  const cfg = (typeof LEVEL_SPEECH !== 'undefined' && LEVEL_SPEECH[level]) || { maxWords: 22 };
  const topic = situation ? (situation.titleRu + ' / ' + situation.id) : 'everyday conversation';
  const opener = situation ? situation.opener : '';
  const system = 'You are a friendly English conversation partner role-playing this situation: ' + topic + '.\n' +
    'Situation start: "' + opener + '"\n' +
    'Student level: ' + level + '. Use SIMPLE short English (max ~' + cfg.maxWords + ' words per reply).\n' +
    'RULES: react briefly to what the student just said, stay inside the situation, then ask ONE short follow-up question. ' +
    'English only, no Russian, no corrections, no explanations, no quotes around the reply.';
  const history = (turns || [])
    .filter(t => t && (t.role === 'ai' || t.role === 'user'))
    .slice(-10)
    .map(t => ({ role: t.role === 'ai' ? 'model' : 'user', parts: [{ text: t.text }] }));
  history.push({ role: 'user', parts: [{ text: userText }] });
  return { system, contents: history };
}

function cleanReply(text) {
  return String(text || '').replace(/^["«»]+|["«»]+$/g, '').trim().slice(0, 400);
}

// ---------- Сеть ----------
async function geminiCall(system, contents, opts) {
  opts = opts || {};
  const key = (aiSettings().key || '').trim();
  if (!key) throw new Error('no key');
  const model = aiSettings().model || AI_DEFAULT_MODEL;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: contents,
    generationConfig: { temperature: opts.json ? 0.2 : 0.7, maxOutputTokens: opts.json ? 700 : 220 },
  };
  if (opts.json) body.generationConfig.responseMimeType = 'application/json';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), (typeof LIMITS !== 'undefined' ? LIMITS.requestTimeoutMs : 8000));
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const text = parts.map(p => p.text || '').join('').trim();
    if (!text) throw new Error('empty response');
    return text;
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function checkAnswerAI(userText, lastAiText, situation, level) {
  const text = await geminiCall(
    'You check English answers and reply with strict JSON only.',
    [{ role: 'user', parts: [{ text: buildCheckerPrompt(userText, lastAiText, situation, level) }] }],
    { json: true }
  );
  return parseCheckResult(text, userText);
}

async function nextReplyAI(userText, turns, situation, level) {
  const p = buildDialoguePrompt(userText, turns, situation, level);
  const text = await geminiCall(p.system, p.contents, {});
  const reply = cleanReply(text);
  if (!reply) throw new Error('empty response');
  return reply;
}

async function aiPing() {
  const text = await geminiCall('Reply with exactly: OK', [{ role: 'user', parts: [{ text: 'ping' }] }], {});
  if (!/ok/i.test(text)) throw new Error('unexpected reply');
  return true;
}
