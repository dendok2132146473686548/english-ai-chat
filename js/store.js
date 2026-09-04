// Хранилище: профиль, разговоры, прогресс. Всё в localStorage.
const STORE_KEY = 'english_ai_chat_v1';

const DEFAULT_DB = {
  profile: { level: 'A1', mode: 'normal', voice: false },
  stats: { conversations: 0, minutes: 0, scores: [] },
  conversations: [],   // {id, date, topic, turns:[{role,text,eval}], report, minutes}
  lastConversationId: null,
  vocab: [],           // {word, translation, date}
  errors: [],          // {type, text, correction, count, date}
  memory: { facts: [] }, // долгосрочные факты: ["two daughters", "lives in Kyiv"]
  usedTopics: [],      // id тем, чтобы не повторяться
};

let db = loadDb();

function loadDb() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign({}, DEFAULT_DB, JSON.parse(raw));
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}
function saveDb() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) {}
}
function resetDb() {
  db = JSON.parse(JSON.stringify(DEFAULT_DB));
  saveDb();
}
