// Evaluation AI: Grammar / Vocabulary / Naturalness / Context.
// Короткие исправления, режим Gentle / Normal / Teacher.

const GRAMMAR_RULES = [
  { re: /\bi have went\b/i, fix: 'I went', why: 'С "last year / yesterday" используем Past Simple: I went (не have went).' },
  { re: /\bi have go\b/i, fix: 'I went / I have gone', why: 'После have нужен Past Participle: gone.' },
  { re: /\bwhere i can\b/i, fix: 'where can I', why: 'Порядок слов в вопросе: where can I...?' },
  { re: /\bwant change\b/i, fix: 'want to change', why: 'После want используем to + глагол.' },
  { re: /\bwant go\b/i, fix: 'want to go', why: 'После want используем to + глагол.' },
  { re: /\bcan you explain me\b/i, fix: 'can you explain to me', why: 'Explain to me (не explain me).' },
  { re: /\bi booked room\b/i, fix: 'I booked a room', why: 'Перед исчисляемым существительным нужен артикль: a room.' },
  { re: /\byesterday i go\b/i, fix: 'yesterday I went', why: 'Yesterday → Past Simple: went.' },
  { re: /\bhe (go|have|do)\b/i, fix: 'he goes / has / does', why: 'С he/she/it к глаголу добавляем -s.' },
  { re: /\bchilds\b/i, fix: 'children', why: 'Множественное число: child → children.' },
  { re: /\bmuch peoples\b/i, fix: 'many people', why: 'People — исчисляемое: many people.' },
  { re: /\bi am agree\b/i, fix: 'I agree', why: 'Agree не требует am: I agree.' },
];

function evaluateAnswer(raw, question) {
  const errors = [];
  const text = (raw || '').trim();
  if (!text) {
    return { empty: true, grammar: 0, vocabulary: 0, naturalness: 0, context: 0, corrections: [], better: null, vocab: [] };
  }

  // --- Grammar: правила + эвристики ---
  GRAMMAR_RULES.forEach(r => {
    if (r.re.test(text)) {
      const m = text.match(r.re);
      errors.push({ type: 'grammar', original: m ? m[0] : '', correction: r.fix, explanation: r.why });
    }
  });
  if (/^\s*[a-z]/.test(text)) {
    errors.push({ type: 'grammar', original: text.trim()[0], correction: text.trim()[0].toUpperCase(), explanation: 'Предложение начинаем с большой буквы.' });
  }
  const grammar = Math.max(0, 100 - errors.filter(e => e.type === 'grammar').length * 18);

  // --- Vocabulary: разнообразие и уместность ---
  const words = text.toLowerCase().split(/[^a-z']+/).filter(w => w.length > 1);
  const uniq = new Set(words);
  let vocabulary = 70;
  if (words.length >= 6 && uniq.size / words.length > 0.6) vocabulary = 88;
  if (words.length >= 10) vocabulary = Math.min(100, vocabulary + 8);
  if (/(very very|good good)/.test(text.toLowerCase())) vocabulary -= 12;
  vocabulary = Math.max(0, Math.min(100, vocabulary));

  // --- Naturalness: сокращения, естественные конструкции ---
  let naturalness = 72;
  if (/(i'm|don't|can't|it's|that's|i'd|let's)/i.test(text)) naturalness += 12;
  if (/^(yes|sure|of course)/i.test(text)) naturalness += 6;
  if (words.length <= 2) naturalness -= 18;
  if (/(can you give me|i want a)/i.test(text)) naturalness -= 8;
  naturalness = Math.max(0, Math.min(100, naturalness));

  // --- Context: соответствие вопросу ---
  const q = (question || '').toLowerCase();
  const qWords = q.split(/[^a-z]+/).filter(w => w.length > 3 && !/what|would|your|with|from|that|this|have|does|when|where|which|about|there/.test(w));
  const t = text.toLowerCase();
  let hit = 0;
  qWords.forEach(w => { if (t.includes(w)) hit++; });
  let context = qWords.length ? Math.round((hit / qWords.length) * 100) : 75;
  // короткие ответы да/нет на вопрос — нормально
  if (/^(yes|no|sure|okay|ok)\b/.test(t) && /\?/.test(question || '')) context = Math.max(context, 70);
  // совсем не по теме
  if (words.length > 4 && hit === 0 && qWords.length >= 3) context = 35;
  context = Math.max(0, Math.min(100, context));

  // --- Better-версия: только первая реальная ошибка, минимально ---
  let better = null;
  const g = errors.find(e => e.type === 'grammar' && e.correction);
  if (g && !/^[A-Z]$/.test(g.correction)) {
    better = text.replace(new RegExp(escapeRe(g.original), 'i'), g.correction);
    if (better === text) better = null;
  }

  return { empty: false, grammar, vocabulary, naturalness, context, corrections: errors.slice(0, 3), better, vocab: [] };
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Подсчёт слов для отчёта + новые слова
function extractNewWords(text) {
  const common = new Set(('i,you,he,she,it,we,they,a,an,the,and,or,but,to,of,in,on,at,for,with,my,your,his,her,our,their,is,are,was,were,be,been,have,has,had,do,does,did,will,would,can,could,should,not,no,yes,very,so,too,me,him,us,them,this,that,these,those,what,when,where,who,how,why,if,then,than,as,by,from,up,out,about,into,over,after,before,there,here,all,any,some,more,most,other,such,only,own,same,than').split(','));
  const words = text.toLowerCase().split(/[^a-z']+/).filter(w => w.length > 3 && !common.has(w));
  return [...new Set(words)].slice(0, 10);
}
