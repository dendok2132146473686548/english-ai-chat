const fs = require('fs');
const base = 'C:/Users/USER/OneDrive/Desktop/english-ai-chat/js/';
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } };
global.window = {};
eval(
  fs.readFileSync(base + 'config.js', 'utf8') + '\n' +
  fs.readFileSync(base + 'store.js', 'utf8') + '\n' +
  fs.readFileSync(base + 'conversation.js', 'utf8') + '\n' +
  fs.readFileSync(base + 'evaluator.js', 'utf8') + '\n' +
  'global.__X={pickSituation:pickSituation,nextAiMessage:nextAiMessage,evaluateAnswer:evaluateAnswer,extractFacts:extractFacts,extractNewWords:extractNewWords,LEVELS:LEVELS,SITUATIONS:SITUATIONS,getDb:function(){return db;},setUsed:function(v){db.usedTopics=v;}};'
);
const X = global.__X;
const db = X.getDb();
let fails = 0;
function ok(c, n, x) { if (c) console.log('PASS ' + n); else { fails++; console.log('FAIL ' + n + (x ? ' :: ' + x : '')); } }

// 1. Ð¡Ð¸Ñ‚ÑƒÐ°Ñ†Ð¸Ð¸: 15 ÑˆÑ‚ÑƒÐº, Ñƒ Ð²ÑÐµÑ… ÐµÑÑ‚ÑŒ opener Ð¸ followups
ok(X.SITUATIONS.length >= 15, 'situations>=15', X.SITUATIONS.length);
ok(X.SITUATIONS.every(s => s.opener && s.followups.length >= 3), 'all have opener+followups');

// 2. Ð‘ÐµÐ· Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€Ð¾Ð²: 15 Ð¿Ð¾Ð´Ñ€ÑÐ´ â€” Ð²ÑÐµ Ñ€Ð°Ð·Ð½Ñ‹Ðµ
X.setUsed([]);
const ids = [];
for (let i = 0; i < 15; i++) ids.push(X.pickSituation().id);
ok(new Set(ids).size === 15, 'no repeats in 15', ids.join(','));

// 3. ÐŸÑ€Ð¾Ð²ÐµÑ€ÐºÐ° Ð¾Ñ‚Ð²ÐµÑ‚Ð° Ð¸Ð· Ð¢Ð—
const ev = X.evaluateAnswer('I have went to London last year.', 'What did you do last year?');
ok(ev.grammar < 100, 'grammar error detected', ev.grammar);
ok(ev.better && /I went/.test(ev.better), 'minimal correction', ev.better);
ok(ev.vocabulary > 0 && ev.naturalness > 0 && ev.context > 0, 'all 4 categories scored');

// 4. ÐŸÑ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ñ‹Ð¹ Ð¾Ñ‚Ð²ÐµÑ‚ â€” Correct
const ev2 = X.evaluateAnswer('Could I get a seat near the window?', 'Would you like a window seat?');
ok(ev2.corrections.length === 0, 'correct answer, no invented errors', JSON.stringify(ev2.corrections));

// 5. ÐŸÐ°Ð¼ÑÑ‚ÑŒ: Ñ„Ð°ÐºÑ‚Ñ‹ Ð¸Ð·Ð²Ð»ÐµÐºÐ°ÑŽÑ‚ÑÑ
const f = X.extractFacts('I live in Kyiv and I have two daughters');
ok(f.length >= 2, 'facts extracted', f.join('|'));

// 6. Ð”Ð¸Ð°Ð»Ð¾Ð³ Ð¿Ñ€Ð¾Ð´Ð¾Ð»Ð¶Ð°ÐµÑ‚ÑÑ: 10 Ñ…Ð¾Ð´Ð¾Ð² Ð±ÐµÐ· Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€Ð¾Ð² Ð²Ð¾Ð¿Ñ€Ð¾ÑÐ¾Ð² Ð¿Ð¾Ð´Ñ€ÑÐ´
X.setUsed([]);
const s = X.pickSituation();
const st = { situation: s, step: 0, usedFollowups: [], usedEvent: false };
const seen = [];
for (let i = 0; i < 10; i++) {
  const m = X.nextAiMessage('I think it is a good idea, let me tell you more about my day', st);
  st.step++;
  seen.push(m);
}
ok(new Set(seen.slice(0, 4)).size >= 3, ' varied replies', seen.slice(0,3).join(' / '));

// 7. ÐšÐ¾Ñ€Ð¾Ñ‚ÐºÐ¸Ð¹ Ð¾Ñ‚Ð²ÐµÑ‚ â€” Ð¿Ñ€Ð¾ÑÑÑ‚ Ð¿Ð¾Ð´Ñ€Ð¾Ð±Ð½ÐµÐµ, Ð° Ð½Ðµ Ð²Ð¸ÑÐ½ÐµÑ‚
const st2 = { situation: s, step: 0, usedFollowups: [], usedEvent: true };
const m2 = X.nextAiMessage('ok', st2);
ok(typeof m2 === 'string' && m2.length > 5, 'short answer handled', m2);

// 8. Ð£Ñ€Ð¾Ð²Ð½Ð¸ Ð¸ Ñ€ÐµÐ¶Ð¸Ð¼Ñ‹
ok(X.LEVELS.length === 5 && X.LEVELS[0].id === 'A1', 'levels A1-C1');

// 9. ÐÐ¾Ð²Ñ‹Ðµ ÑÐ»Ð¾Ð²Ð° Ð¸Ð·Ð²Ð»ÐµÐºÐ°ÑŽÑ‚ÑÑ
const w = X.extractNewWords('I visited a wonderful museum in London yesterday');
ok(w.includes('museum') || w.includes('wonderful') || w.includes('visited'), 'words extracted', w.join(','));

console.log(fails === 0 ? 'ALL TESTS PASSED' : fails + ' FAILED');
process.exit(fails ? 1 : 0);

