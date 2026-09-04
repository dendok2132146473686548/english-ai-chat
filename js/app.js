// Главный контроллер: экраны, диалог, оценка, прогресс.
let convo = null; // {id, date, situation, step, usedFollowups, usedEvent, turns:[], evals:[], minutes}

document.addEventListener('DOMContentLoaded', () => {
  initHome();
  bindEvents();
  showView('home');
  updateOnline();
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
});

function updateOnline() {
  document.getElementById('no-net').classList.toggle('hidden', navigator.onLine);
}

function bindEvents() {
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b =>
    b.addEventListener('click', () => showView(b.dataset.nav)));
  document.getElementById('btn-start').addEventListener('click', startConversation);
  document.getElementById('btn-continue').addEventListener('click', continueConversation);
  document.getElementById('btn-send').addEventListener('click', handleSend);
  document.getElementById('btn-finish').addEventListener('click', finishConversation);
  document.getElementById('btn-back').addEventListener('click', () => {
    if (convo && !convo.finished) { finishConversation(true); } else showView('home');
  });
  document.getElementById('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  document.getElementById('btn-mode-text').addEventListener('click', () => setInputMode('text'));
  document.getElementById('btn-mode-voice').addEventListener('click', () => setInputMode('voice'));
  document.getElementById('btn-talk').addEventListener('click', handleTalk);
  document.getElementById('btn-again').addEventListener('click', startConversation);
  document.getElementById('btn-to-progress').addEventListener('click', () => showView('progress'));
  document.getElementById('btn-back-home').addEventListener('click', () => showView('home'));
  document.getElementById('sel-level').addEventListener('change', e => {
    db.profile.level = e.target.value; saveDb(); initHome();
  });
  document.getElementById('sel-mode').addEventListener('change', e => {
    db.profile.mode = e.target.value; saveDb();
  });
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.nav === name));
  if (name === 'progress') renderProgress();
  if (name === 'home') initHome();
  document.getElementById('views').scrollTop = 0;
}

// ---------- HOME ----------
function initHome() {
  const sel = document.getElementById('sel-level');
  sel.innerHTML = LEVELS.map(l => `<option value="${l.id}" ${l.id === db.profile.level ? 'selected' : ''}>${l.id} — ${l.name}</option>`).join('');
  document.getElementById('sel-mode').value = db.profile.mode;
  document.getElementById('home-level').textContent = db.profile.level;
  document.getElementById('home-count').textContent = db.stats.conversations;
  const scores = db.stats.scores;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  document.getElementById('home-progress').style.width = Math.min(100, avg) + '%';
  document.getElementById('home-avg').textContent = scores.length ? `Средний балл: ${avg}/100` : 'Начните первый разговор';
  const hasLast = db.lastConversationId && db.conversations.some(c => c.id === db.lastConversationId && !c.finished);
  document.getElementById('btn-continue').style.display = hasLast ? '' : 'none';
}

// ---------- CHAT ----------
function startConversation() {
  const situation = pickSituation();
  convo = {
    id: 'c' + Date.now(), date: new Date().toISOString().slice(0, 10),
    situation, step: 0, usedFollowups: [], usedEvent: false,
    turns: [], evals: [], finished: false, startTime: Date.now(),
  };
  document.getElementById('chat').innerHTML = '';
  document.getElementById('chat-topic').textContent = situation.titleRu;
  showView('chat');
  setInputMode(db.profile.voice ? 'voice' : 'text');
  aiSay(situation.opener);
}

function continueConversation() {
  const last = db.conversations.find(c => c.id === db.lastConversationId && !c.finished);
  if (!last) { startConversation(); return; }
  convo = last;
  document.getElementById('chat').innerHTML = '';
  document.getElementById('chat-topic').textContent = convo.situation.titleRu;
  showView('chat');
  convo.turns.forEach(t => {
    if (t.role === 'ai') addBubble('ai', t.text);
    else addBubble('user', t.text);
  });
  const next = nextAiMessage('', convo);
  setTimeout(() => aiSay(next), 600);
}

function setInputMode(mode) {
  db.profile.voice = (mode === 'voice');
  saveDb();
  document.getElementById('btn-mode-text').classList.toggle('active', mode === 'text');
  document.getElementById('btn-mode-voice').classList.toggle('active', mode === 'voice');
  document.getElementById('text-row').classList.toggle('hidden', mode !== 'text');
  document.getElementById('voice-row').classList.toggle('hidden', mode !== 'voice');
  if (mode === 'voice' && !Voice.supportedRec()) {
    document.getElementById('voice-text').textContent = 'Голосовой ввод недоступен в этом браузере. Пишите текстом.';
  }
}

function handleTalk() {
  const btn = document.getElementById('btn-talk');
  if (Voice.listening) { Voice.stop(); btn.textContent = '🎤 Говорите…'; return; }
  btn.textContent = '🔴 Слушаю… (нажмите чтобы стоп)';
  document.getElementById('voice-text').textContent = '';
  Voice.listenOnce(
    (text) => {
      btn.textContent = '🎤 Говорите…';
      document.getElementById('voice-text').textContent = '"' + text + '"';
      handleUserText(text);
    },
    () => {
      btn.textContent = '🎤 Говорите…';
      document.getElementById('voice-text').textContent = 'Не расслышал. Попробуйте ещё раз или напишите текстом.';
    }
  );
}

function handleSend() {
  const input = document.getElementById('answer-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  handleUserText(text);
}

let checking = false;
function handleUserText(text) {
  if (!convo || checking) return;
  checking = true;
  setStatus('Проверяю…');
  const btn = document.getElementById('btn-send');
  btn.disabled = true; btn.textContent = '…';
  addBubble('user', text);
  convo.turns.push({ role: 'user', text });

  setTimeout(() => {
    try {
      const lastAi = [...convo.turns].reverse().find(t => t.role === 'ai');
      const ev = evaluateAnswer(text, lastAi ? lastAi.text : '');
      convo.evals.push(ev);
      saveTurnError(ev, text);
      showCorrection(text, ev);
      const reply = nextAiMessage(text, convo);
      convo.step++;
      setTimeout(() => {
        aiSay(reply);
        checking = false;
        btn.disabled = false; btn.textContent = '➤';
        setStatus('');
      }, 900);
    } catch (e) {
      checking = false;
      btn.disabled = false; btn.textContent = '➤';
      addBubble('ai', 'Something went wrong. Please try again. / Что-то пошло не так. Попробуйте ещё раз.');
      setStatus('');
    }
  }, 600);
}

function showCorrection(text, ev) {
  const mode = db.profile.mode; // gentle | normal | teacher
  let html = '';

  if (ev.corrections.length) {
    // ❌ Ошибки: компактные строки «фрагмент → исправление»
    const rows = ev.corrections.map(c =>
      `<div class="fix-row"><span class="bad">❌ <code>${escapeHtml(c.original)}</code></span><span class="arrow">→</span><span class="good">✅ <code>${escapeHtml(c.correction)}</code></span></div>`
    ).join('');
    html += `<div class="fix-title">${ev.corrections[0].type === 'grammar' ? 'Grammar' : escapeHtml(ev.corrections[0].type)}</div>${rows}`;
    if (ev.better) html += `<div class="fix-better"><b>Better:</b> “${escapeHtml(ev.better)}”</div>`;
  } else if (ev.natural && mode !== 'gentle') {
    // ⚠️ Грамматика чистая, но можно естественнее — не как ошибка
    html += `<div class="fix-ok">✅ Correct</div>
      <div class="fix-natural">⚠️ <b>More natural:</b> “${escapeHtml(ev.natural.sentence)}”</div>`;
  } else {
    // ✅ Всё хорошо
    html += `<div class="fix-ok">✅ Correct</div>`;
  }

  // Подробнее — скрыто по умолчанию (в режиме teacher раскрыто сразу)
  const marks = `Grammar ${mark(ev.grammar)} · Vocabulary ${mark(ev.vocabulary)} · Naturalness ${mark(ev.naturalness)} · Context ${mark(ev.context)}`;
  const details = ev.corrections.map(c =>
    `<div class="why">❌ ${escapeHtml(c.original)} → ✅ ${escapeHtml(c.correction)} — ${escapeHtml(c.explanation)}</div>`
  ).join('');
  const open = mode === 'teacher' ? ' open' : '';
  if (ev.corrections.length || mode === 'teacher') {
    html += `<details class="fix-details"${open}><summary>Подробнее</summary><div class="marks">${marks}</div>${details}</details>`;
  }

  const d = document.createElement('div');
  d.className = 'fix';
  d.innerHTML = html;
  const chat = document.getElementById('chat');
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  convo.turns.push({ role: 'correction', text: html });
}

function mark(score) {
  if (score >= 85) return '✅';
  if (score >= 65) return '⚠️';
  return '❌';
}
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function aiSay(text) {
  setStatus('AI печатает…');
  setTimeout(() => {
    addBubble('ai', text);
    convo.turns.push({ role: 'ai', text });
    if (db.profile.voice) Voice.speak(text);
    persistConvo();
    setStatus('');
  }, 700);
}

function addBubble(role, text) {
  const chat = document.getElementById('chat');
  const d = document.createElement('div');
  d.className = 'bubble ' + role;
  d.innerHTML = `<div class="who">${role === 'ai' ? 'AI' : 'Вы'}</div>${escapeHtml(text)}`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function setStatus(t) { document.getElementById('chat-status').textContent = t; }

function saveTurnError(ev, text) {
  ev.corrections.forEach(c => {
    const ex = db.errors.find(e => e.text === c.original && e.correction === c.correction);
    if (ex) ex.count++;
    else db.errors.push({ type: 'grammar', text: c.original, correction: c.correction, count: 1, date: new Date().toISOString().slice(0, 10) });
  });
  const words = extractNewWords(text);
  words.forEach(w => { if (!db.vocab.some(v => v.word === w)) db.vocab.push({ word: w, date: new Date().toISOString().slice(0, 10) }); });
  saveDb();
}

function persistConvo() {
  if (!convo) return;
  const i = db.conversations.findIndex(c => c.id === convo.id);
  if (i >= 0) db.conversations[i] = convo;
  else db.conversations.push(convo);
  db.lastConversationId = convo.id;
  saveDb();
}

// ---------- FINISH + REPORT ----------
function finishConversation(auto) {
  if (!convo) { showView('home'); return; }
  convo.finished = true;
  convo.minutes = Math.max(1, Math.round((Date.now() - convo.startTime) / 60000));
  const evs = convo.evals;
  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const report = {
    grammar: avg(evs.map(e => e.grammar)),
    vocabulary: avg(evs.map(e => e.vocabulary)),
    naturalness: avg(evs.map(e => e.naturalness)),
    comprehension: avg(evs.map(e => e.context)),
  };
  report.total = Math.round((report.grammar + report.vocabulary + report.naturalness + report.comprehension) / 4);
  convo.report = report;
  db.stats.conversations++;
  db.stats.minutes += convo.minutes;
  db.stats.scores.push(report.total);
  if (db.stats.scores.length > 30) db.stats.scores.shift();
  persistConvo();
  saveDb();
  renderReport(report);
  showView('report');
  convo = null;
}

function renderReport(r) {
  document.getElementById('report-scores').innerHTML = `
    <div><small>Grammar</small><br><b>${r.grammar}</b></div>
    <div><small>Vocabulary</small><br><b>${r.vocabulary}</b></div>
    <div><small>Naturalness</small><br><b>${r.naturalness}</b></div>
    <div><small>Comprehension</small><br><b>${r.comprehension}</b></div>`;
  const good = [], bad = [];
  if (r.grammar >= 75) good.push('You used past tense and articles correctly in most sentences.');
  else bad.push('Past Simple vs Present Perfect, articles (a/the).');
  if (r.comprehension >= 75) good.push('You understood questions well.');
  else bad.push('Read questions carefully, answer to the point.');
  if (r.vocabulary >= 75) good.push('Good useful vocabulary for the situation.');
  else bad.push('More varied words, fewer repetitions.');
  if (r.naturalness >= 75) good.push('Your phrases sound natural.');
  else bad.push('More natural ways to describe experiences (contractions, everyday phrases).');
  if (!good.length) good.push('You kept the conversation going — great!');
  document.getElementById('report-good').innerHTML = good.map(g => `<li>${g}</li>`).join('');
  document.getElementById('report-bad').innerHTML = bad.map(g => `<li>${g}</li>`).join('');
  const words = db.vocab.slice(-8).map(v => v.word);
  document.getElementById('report-words').innerHTML = words.length
    ? words.map(w => `<span>${escapeHtml(w)}</span>`).join('')
    : '<span class="muted">—</span>';
  const weak = r.grammar <= r.vocabulary && r.grammar <= r.naturalness ? 'grammar' : (r.vocabulary <= r.naturalness ? 'vocabulary' : 'natural phrases');
  document.getElementById('report-next').textContent =
    `Next time we will practice ${weak}. Try a new situation — for example, a restaurant or a trip.`;
}

// ---------- PROGRESS ----------
function renderProgress() {
  document.getElementById('p-count').textContent = db.stats.conversations;
  document.getElementById('p-min').textContent = db.stats.minutes;
  const scores = db.stats.scores;
  document.getElementById('p-avg').textContent = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '—';
  document.getElementById('p-words').textContent = db.vocab.length;
  const convos = db.conversations.filter(c => c.report);
  const avg = (f) => convos.length ? Math.round(convos.reduce((a, c) => a + c.report[f], 0) / convos.length) : 0;
  const rows = [['Grammar', avg('grammar')], ['Vocabulary', avg('vocabulary')], ['Naturalness', avg('naturalness')]];
  document.getElementById('p-bars').innerHTML = rows.map(([n, v]) =>
    `<div class="bar-row"><span>${n}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('');
  const last = db.stats.scores.slice(-10);
  document.getElementById('p-chart').innerHTML = last.length
    ? last.map(s => `<i style="height:${s}%" title="${s}"></i>`).join('')
    : '<span class="muted">Пока нет данных</span>';
  const errs = [...db.errors].sort((a, b) => b.count - a.count).slice(0, 5);
  document.getElementById('p-errors').innerHTML = errs.length
    ? errs.map(e => `<div class="err">❌ ${escapeHtml(e.text)} → ✅ ${escapeHtml(e.correction)} <span class="muted">×${e.count}</span></div>`).join('')
    : '<p class="muted">Ошибок пока нет — так держать!</p>';
}
