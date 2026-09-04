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

// ---------- Словарь, опечатки, фрагменты ----------
// Порядок = частотность: важен для разрешения неоднозначностей (cnt->can, а не cat).
const WORD_TOP = "the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me can just like time more i'm don't can't it's that's cannot";
const WORD_FREQ = (WORD_TOP + " i you he she it we they me him us them my your his her our their this that these those there here where when why how what who which a an the and or but nor so yet for of at by on in into onto to from with about as like through during before after between up down out off over under again further then once all any both each few more most other some such no not only own same than too very could may might must shall should would ought need dare used said tell told ask asked answer answered goes went gone come came gets got gotten make makes made take takes took taken give gives gave given know knows knew known think thinks thought feel feels felt see sees saw seen say tell ask answer work worked play played live lived like liked love loved want wanted need needed help helped try tried use used find found show showed study studied learn learned watch watched ok okay yes no oh ah well sure please thanks thank hello hi bye goodbye mister excuse sorry " +
"be am is are was were been being have has had having do does did doing say says said tell tells told go went gone get got make made take took give gave know knew think thought feel seem become leave put mean keep let begin help talk turn start show hear play run move believe hold bring happen write wrote read sit stood lose paid meet set change led understand watch follow stop create speak allow add spend grow open walk win offer remember love consider appear buy wait serve die send build stay fall cut reach kill remain suggest raise pass sell require report decide pull return explain hope develop carry break receive agree support hit touch force charge cost enjoy finish visit travel fly drive ride swim cook clean wash wear choose decide plan call invite join miss catch teach learn time day week month year morning evening night today tomorrow yesterday now early late soon often always never sometimes usually every all any some more most much many few little lot big small large long short high low new old young good bad great happy sad beautiful nice kind free busy easy hard fast slow hot cold warm cool right wrong true false sure ready open first last next other same own only just still even also back away home house room door key school shop store market park restaurant hotel airport station bank hospital office car bus train plane ship bike phone computer book paper money water food bread milk coffee tea apple egg fish meat cheese bag box table chair bed window door clothes shirt shoes hat coat family friend mother father sister brother daughter son wife husband baby people person man woman boy girl child children name job boss meeting business teacher student lesson question idea thing place city town country street road weather rain sun snow wind holiday trip journey remember forget weather than then there their theyre cant dont doesnt isnt arent wasnt werent havent hasnt hadnt wont wouldnt couldnt shouldnt didnt doesnt dont lets thats theres its whats whos wheres whens whys hows youre were theyre im ive ill id cant " +
"gate flight flights boarding luggage suitcase baggage delay delayed cancelled seat seats aisle passport security customs terminal airline pilot crew landing takeoff runway reservation reception lobby view towel shower breakfast lunch dinner checkout checkin menu dish pasta pizza dessert delicious waiter bill drink wine taxi driver traffic fare ride destination doctor sick ill pain fever cough medicine prescription pharmacy symptoms throat headache price cheap expensive discount fitting receipt cashier cash shirt sweater shoes size colour color favorite favourite behaviour behavior travelling traveling centre center theatre gray grey check cheque tire tyre museum wonderful visited interesting excited tired bored sunny rainy windy cloudy Excuse excuse program programme meter metre mom mum dad " +
"london paris kyiv kiev ukraine france england britain canada america italy spain germany poland turkey egypt japan china tokyo monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december john mary anna alex mike sarah david").split(/\s+/);
// Нормализация: нижний регистр + дедупликация (порядок = частотность)
(function () {
  const seen = new Set(), out = [];
  WORD_FREQ.forEach(w => {
    w = String(w).toLowerCase();
    if (w && !seen.has(w)) { seen.add(w); out.push(w); }
  });
  WORD_FREQ.length = 0;
  out.forEach(w => WORD_FREQ.push(w));
})();
const KNOWN = new Set();
WORD_FREQ.forEach(w => KNOWN.add(w));
// Безапострофные формы ("cant", "dont") — НЕ считаем известными словами,
// чтобы fuzzy-поиск исправлял их в can't / don't.
['cant','dont','doesnt','isnt','arent','wasnt','werent','wont','didnt','couldnt','wouldnt','shouldnt','havent','hasnt','hadnt','theyre','whats','thats','theres','whos','wheres','whens','whys','hows','youre'].forEach(w => KNOWN.delete(w));
// Явная карта сокращений без апострофа: fuzzy-поиск здесь гадает
// (cant->can вместо can't и меняет смысл), поэтому фиксируем напрямую.
const NO_APO_FIX = {
  cant: "can't", dont: "don't", doesnt: "doesn't", isnt: "isn't",
  arent: "aren't", wasnt: "wasn't", werent: "weren't", wont: "won't",
  didnt: "didn't", couldnt: "couldn't", wouldnt: "wouldn't",
  shouldnt: "shouldn't", havent: "haven't", hasnt: "hasn't",
  hadnt: "hadn't", theyre: "they're", whats: "what's", thats: "that's",
  theres: "there's", whos: "who's", wheres: "where's", whens: "when's",
  whys: "why's", hows: "how's", youre: "you're"
};
// Дополнительные обычные слова, чтобы не помечать их как опечатки
['quite','quiet','enough','almost','already','often','really','rather','pretty','across','along','behind','below','beside','inside','outside','without','within','two','three','four','five','six','seven','eight','nine','ten','first','second','email','internet','website','message','messages','photo','photos','video','cinema','vegetables','fruit','fruits','juice','salad','soup','sandwich','jacket','dress','skirt','jeans','socks','gloves','scarf','boots','ticket','tickets','map','guide','women','gym','app','bus','gym','yoga','smartphone','laptop','key','keys','wallet','passport','near','far','ago','yet','still','else','together','around','such','ever','upon','elsewhere','anywhere','somewhere','nowhere','everywhere','anybody','somebody','nobody','everybody','anyone','someone','noone','everything','something','nothing','anything','little','whole','whose','whom','shall','ought','dare','forward','toward','towards','among','until','unless','while','though','although','because','since','despite','except','onto','past','plus','minus','over','under','nearby','abroad','ahead','asleep','awake','alive'].forEach(w => KNOWN.add(w));

const TOPIC_WORDS = {
  airport: ['gate','flight','flights','boarding','luggage','suitcase','baggage','delay','delayed','cancelled','seat','seats','window','aisle','passport','security','checkin','airline','terminal'],
  cafe_london: ['coffee','tea','menu','waiter','bill','table','cake','sugar','milk','order'],
  paris_phone: ['phone','lost','police','help','call','number','found'],
  restaurant: ['menu','dish','pasta','pizza','order','waiter','bill','dessert','table','drink','wine','delicious'],
  doctor: ['doctor','sick','pain','fever','cough','medicine','prescription','appointment','symptoms','throat','headache'],
  shop: ['shop','size','shirt','sweater','shoes','price','cheap','expensive','discount','fitting','receipt'],
  hotel: ['hotel','room','reservation','reception','key','breakfast','checkout','night','stay','floor','view','shower','towel'],
  friend: ['friend','name','meet','city','country','family','work','hobby','weekend','party'],
  taxi: ['taxi','driver','street','address','traffic','fare','ride','destination','station','hurry'],
  movie: ['movie','film','cinema','actor','story','watch'],
  weather: ['weather','sunny','rain','wind','cloud','snow','hot','cold','forecast','umbrella','walk'],
  work: ['work','project','boss','manager','meeting','deadline','office','colleague','task','salary'],
  birthday: ['birthday','gift','party','cake','wish','invite','family'],
  market: ['market','apple','apples','cheese','price','fresh','seller','kilo'],
  park: ['park','dog','walk','tree','ball','play'],
};
Object.keys(TOPIC_WORDS).forEach(k => TOPIC_WORDS[k].forEach(w => KNOWN.add(w)));

// Слова-связки: их можно включать в общий фрагмент исправления
const CONNECTOR = new Set(['a','an','the','to','of','in','on','at','for','and','or','my','your','his','her','its','our','their','is','are','was','were','be','it','this','that','as','by','with','from','me','you','we','they','he','she','i']);

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[n];
}

function buildContextWords(question, topicId) {
  const set = new Set();
  const add = s => String(s || '').toLowerCase().split(/[^a-z']+/).forEach(w => { if (w.length > 2) set.add(w); });
  add(question);
  (TOPIC_WORDS[topicId] || []).forEach(w => set.add(w));
  return set;
}

// Поиск опечатки: null или исправленное слово
function findTypo(w, isFirst, ctx) {
  const low = w.toLowerCase();
  if (low.length < 3 || KNOWN.has(low)) return null;
  if (/[0-9]/.test(w)) return null;
  if (/[A-Z]/.test(w.slice(1))) return null;
  if (!isFirst && /^[A-Z]/.test(w)) return null; // имена собственные
  if (low.endsWith("'s") && KNOWN.has(low.slice(0, -2))) return null; // притяжательный падеж
  // Фаза 1: только контекстные слова (тема + вопрос) — они точнее всего
  // передают намерение пользователя (geta -> gate, а не get).
  let best = null, bestD = 99, bestF = 1e9;
  ctx.forEach(cand => {
    if (cand === low) return;
    if (Math.abs(cand.length - low.length) > 2) return;
    const d = levenshtein(low, cand);
    if (d <= 2 && d > 0 && (d < bestD || (d === bestD && wordFreqIndex(cand) < bestF))) {
      best = cand; bestD = d; bestF = wordFreqIndex(cand);
    }
  });
  if (best) {
    if (/^[A-Z]/.test(w)) best = best.charAt(0).toUpperCase() + best.slice(1);
    return best;
  }
  // Фаза 2: общий словарь с жёсткими частотно-длинными ограничениями,
  // чтобы не выдумывать исправления для редких корректных слов.
  for (let i = 0; i < WORD_FREQ.length; i++) {
    const cand = WORD_FREQ[i];
    if (cand === low) continue;
    if (Math.abs(cand.length - low.length) > 2) continue;
    const d = levenshtein(low, cand);
    let maxD;
    if (low.length <= 3) maxD = (i < 80) ? 2 : 0;
    else if (low.length <= 5) maxD = (i < 600) ? 1 : 0;
    else maxD = (i < 150) ? 2 : ((i < 600) ? 1 : 0);
    if (d <= maxD && d > 0 && (d < bestD || (d === bestD && i < bestF))) { best = cand; bestD = d; bestF = i; }
  }
  if (!best) return null;
  if (/^[A-Z]/.test(w)) best = best.charAt(0).toUpperCase() + best.slice(1);
  return best;
}

// Применить исправления к тексту + карта позиций (fixedPos -> rawPos).
// Важно: первый символ вставки -> f.start, ПОСЛЕДНИЙ -> f.end-1,
// иначе границы совпадений на втором проходе съезжают (баг "can Int").
function applyFixes(text, fixes) {
  const sorted = fixes.slice().sort((a, b) => a.start - b.start);
  let out = '', map = [], last = 0;
  sorted.forEach(f => {
    for (let i = last; i < f.start; i++) { out += text[i]; map.push(i); }
    for (let i = 0; i < f.to.length; i++) {
      out += f.to[i];
      map.push(i === f.to.length - 1 ? f.end - 1 : f.start);
    }
    last = f.end;
  });
  for (let i = last; i < text.length; i++) { out += text[i]; map.push(i); }
  return { text: out, map };
}

function resolveFix(fix, m) { return (typeof fix === 'function') ? fix(m) : fix; }

function wordFreqIndex(w) {
  const i = WORD_FREQ.indexOf(w);
  return i < 0 ? 1e9 : i;
}

// Слить соседние исправления в общие фрагменты для компактного показа
function mergeRuns(raw, corrections) {
  const sorted = corrections.slice().sort((a, b) => a.rawStart - b.rawStart);
  const runs = [];
  let cur = null;
  sorted.forEach(c => {
    if (c.rawStart === undefined || c.rawEnd === undefined) return;
    if (!cur) { cur = { s: c.rawStart, e: c.rawEnd, items: [c] }; return; }
    const gap = raw.slice(cur.e, c.rawStart);
    const gt = gap.trim().toLowerCase();
    if (gap.length <= 3 && (gt === '' || CONNECTOR.has(gt))) {
      cur.e = c.rawEnd; cur.items.push(c);
    } else { runs.push(cur); cur = { s: c.rawStart, e: c.rawEnd, items: [c] }; }
  });
  if (cur) runs.push(cur);
  return runs;
}

function mergeFragments(raw, corrections) {
  return mergeRuns(raw, corrections).map(r => ({ from: raw.slice(r.s, r.e), to: runCorrected(raw, r) }));
}

function runCorrected(raw, r) {
  const items = r.items.slice().sort((a, b) => ((b.rawEnd - b.rawStart) - (a.rawEnd - a.rawStart)) || (b.rawStart - a.rawStart));
  const taken = [];
  const kept = [];
  items.forEach(c => {
    if (taken.some(([a, b]) => c.rawStart < b && a < c.rawEnd)) return;
    taken.push([c.rawStart, c.rawEnd]); kept.push(c);
  });
  kept.sort((a, b) => b.rawStart - a.rawStart);
  let frag = raw.slice(r.s, r.e);
  kept.forEach(c => {
    // Для вставки берём первую альтернативу (he goes / has / does -> he goes),
    // полную строку с вариантами оставляем только в «Подробнее».
    let to = String(c.correction).split('/')[0].trim();
    const m = raw.slice(c.rawStart, c.rawEnd).match(/[A-Za-z]/);
    if (m && /[A-Z]/.test(m[0]) && /^[a-z]/.test(to)) to = to.charAt(0).toUpperCase() + to.slice(1);
    const s = c.rawStart - r.s, e = c.rawEnd - r.s;
    frag = frag.slice(0, s) + to + frag.slice(e);
  });
  return frag;
}

function evaluateAnswer(raw, question, topicId) {
  const errors = [];
  const text = (raw || '').trim();
  if (!text) {
    return { empty: true, grammar: 0, vocabulary: 0, naturalness: 0, context: 0, corrections: [], fragments: [], better: null, natural: null, vocab: [] };
  }
  const covered = [];
  const isCovered = (s, e) => covered.some(([a, b]) => s < b && a < e);
  const contextWords = buildContextWords(question, topicId);

  // Pass 1: фразовые грамматические правила на исходном тексте
  GRAMMAR_RULES.forEach(r => {
    const m = r.re.exec(text);
    if (m) {
      const s = m.index, e = s + m[0].length;
      errors.push({ type: 'grammar', severity: 'Medium', original: m[0], correction: resolveFix(r.fix, m), explanation: r.why, rawStart: s, rawEnd: e });
      covered.push([s, e]);
    }
  });

  // Pass 2: опечатки -> рабочая копия с картой позиций
  const tokens = [];
  const tre = /[A-Za-z']+/g;
  let tm;
  while ((tm = tre.exec(text))) tokens.push({ w: tm[0], s: tm.index, e: tm.index + tm[0].length });
  const typoFixes = [];
  tokens.forEach((t, i) => {
    if (isCovered(t.s, t.e)) return;
    const low = t.w.toLowerCase();
    // Сокращения без апострофа — фиксируем напрямую, не гадаем
    if (NO_APO_FIX[low]) {
      let to = NO_APO_FIX[low];
      if (/^[A-Z]/.test(t.w)) to = to.charAt(0).toUpperCase() + to.slice(1);
      typoFixes.push({ start: t.s, end: t.e, to });
      return;
    }
    const to = findTypo(t.w, i === 0, contextWords);
    if (to && to !== t.w) typoFixes.push({ start: t.s, end: t.e, to });
  });
  const fixed1 = applyFixes(text, typoFixes);

  // Pass 3: фразовые правила на тексте с исправленными опечатками
  GRAMMAR_RULES.forEach(r => {
    const m = r.re.exec(fixed1.text);
    if (!m) return;
    const rs = fixed1.map[m.index];
    const re = fixed1.map[m.index + m[0].length - 1] + 1;
    if (rs === undefined || re === undefined || isCovered(rs, re)) return;
    errors.push({ type: 'grammar', severity: 'Medium', original: text.slice(rs, re), correction: resolveFix(r.fix, m), explanation: r.why, rawStart: rs, rawEnd: re });
    covered.push([rs, re]);
  });

  // Фиксируем опечатки как ошибки
  typoFixes.forEach(f => {
    errors.push({ type: 'Spelling', severity: 'Minor', original: text.slice(f.start, f.end), correction: f.to, explanation: 'Опечатка: ' + text.slice(f.start, f.end) + ' → ' + f.to + '.', rawStart: f.start, rawEnd: f.end });
    covered.push([f.start, f.end]);
  });

  // Pass 4: местоимение I и большая буква в начале
  const pre = /\bi\b/g;
  let pm;
  while ((pm = pre.exec(text))) {
    if (isCovered(pm.index, pm.index + 1)) continue;
    errors.push({ type: 'Spelling', severity: 'Minor', original: 'i', correction: 'I', explanation: 'Местоимение I всегда пишется с большой буквы.', rawStart: pm.index, rawEnd: pm.index + 1 });
    covered.push([pm.index, pm.index + 1]);
  }
  const fm = /^\s*[a-z]/.exec(text);
  if (fm) {
    const idx = fm[0].length - 1;
    if (!isCovered(idx, idx + 1)) {
      errors.push({ type: 'grammar', original: text[idx], correction: text[idx].toUpperCase(), explanation: 'Предложение начинаем с большой буквы.', rawStart: idx, rawEnd: idx + 1 });
      covered.push([idx, idx + 1]);
    }
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

  // --- Better-версия: splicing по runs (длинные вперёд, пересечения пропускаем).
  // Так перекрывающиеся исправления (cnt->can + where i cnt->where can I)
  // не ломают друг друга.
  const list = errors.slice(0, 10);
  const runs = mergeRuns(text, list);
  let better = null;
  const useRuns = runs.filter(r => r.items.some(c => !(c.original.length === 1 && String(c.correction).length === 1)));
  if (useRuns.length) {
    better = text;
    useRuns.slice().sort((a, b) => b.s - a.s).forEach(r => {
      better = better.slice(0, r.s) + runCorrected(text, r) + better.slice(r.e);
    });
    if (better === text) better = null;
  }
  const fragments = mergeFragments(text, list);

  // --- More natural: только если грамматика чистая, не как ошибка ---
  let natural = null;
  if (!errors.length) {
    const n = naturalSuggestion(text);
    if (n) natural = n;
  }

  return { empty: false, grammar, vocabulary, naturalness, context, corrections: list, fragments, better, natural, vocab: [] };
}

const NATURAL_RULES = [
  { re: /\bcan you give me\b/i, make: () => 'Could I have' },
  { re: /\bi want a\b/i, make: () => "I'd like a" },
];

// Возвращает {original, suggestion, sentence} или null
function naturalSuggestion(text) {
  for (const r of NATURAL_RULES) {
    const m = text.match(r.re);
    if (m) {
      const suggestion = r.make(m);
      const sentence = text.replace(r.re, suggestion);
      if (sentence !== text) return { original: m[0], suggestion, sentence };
    }
  }
  return null;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Подсчёт слов для отчёта + новые слова
function extractNewWords(text) {
  const common = new Set(('i,you,he,she,it,we,they,a,an,the,and,or,but,to,of,in,on,at,for,with,my,your,his,her,our,their,is,are,was,were,be,been,have,has,had,do,does,did,will,would,can,could,should,not,no,yes,very,so,too,me,him,us,them,this,that,these,those,what,when,where,who,how,why,if,then,than,as,by,from,up,out,about,into,over,after,before,there,here,all,any,some,more,most,other,such,only,own,same,than').split(','));
  const words = text.toLowerCase().split(/[^a-z']+/).filter(w => w.length > 3 && !common.has(w));
  return [...new Set(words)].slice(0, 10);
}
