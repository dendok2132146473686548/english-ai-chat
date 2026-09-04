// Conversation AI: ситуации, живой диалог, память, адаптация.
// Формат ситуации: {id, titleRu, opener, followups[], events[]}

const SITUATIONS = [
  { id: 'cafe_london', titleRu: 'Кафе в Лондоне',
    opener: 'Imagine you are visiting London for the first time. You enter a small café. What would you say to the waiter?',
    followups: ['The waiter smiles and asks what you would like. What do you order?', 'Your coffee is ready, but it is very hot. What do you say?', 'You want to pay. How do you ask for the bill?'],
    events: ['Suddenly it starts raining outside. The waiter says something. What do you answer?'] },
  { id: 'paris_phone', titleRu: 'Потерянный телефон',
    opener: 'You are walking through Paris when suddenly you realize that you have lost your phone. What do you do?',
    followups: ['You ask a nearby police officer for help. What would you say to him?', 'The officer asks where you last saw your phone. What do you answer?', 'Good news! Someone found your phone. What do you say?'],
    events: ['Your friend calls you from a café nearby. She invites you to join her. What do you say?'] },
  { id: 'airport', titleRu: 'Аэропорт',
    opener: 'You are at the airport. Your flight is in two hours. You go to the check-in desk. What do you say?',
    followups: ['The agent asks if you have any bags to check in. What do you answer?', 'You want a window seat. How do you ask for it?', 'Security asks you to open your bag. What do you say?'],
    events: ['Oh no! Your flight is delayed by one hour. The agent apologizes. What do you say?'] },
  { id: 'restaurant', titleRu: 'Ресторан',
    opener: 'You are in a cozy Italian restaurant. The waiter brings you the menu. He asks if you are ready to order. What do you say?',
    followups: ['You ordered pasta, but the waiter brings pizza. What do you say?', 'The food is delicious. The waiter asks if everything is okay. What do you answer?', 'You are full and happy. How do you ask for the bill?'],
    events: ['The chef comes out and asks if you liked the food. What do you tell him?'] },
  { id: 'doctor', titleRu: 'Врач',
    opener: 'You are not feeling well, so you visit a doctor. The doctor asks: "What seems to be the problem?" What do you say?',
    followups: ['The doctor asks how long you have felt this way. What do you answer?', 'The doctor asks if you take any medicine. What do you say?', 'The doctor gives you a prescription. What do you ask?'],
    events: ['The nurse comes in and asks you to wait a little. What do you answer?'] },
  { id: 'shop', titleRu: 'Магазин одежды',
    opener: 'You are in a clothing shop. You like a blue sweater, but you need a bigger size. What do you say to the assistant?',
    followups: ['The assistant brings another size. You want to try it on. What do you ask?', 'The sweater fits perfectly, but it is a bit expensive. What do you say?', 'You decide to buy it. What do you say at the cash desk?'],
    events: ['The assistant says there is a 20% discount today. How do you react?'] },
  { id: 'hotel', titleRu: 'Гостиница',
    opener: 'You arrive at a hotel in the evening. The receptionist asks if you have a reservation. What do you say?',
    followups: ['The receptionist asks for your passport. What do you answer?', 'You are in your room, but the shower does not work. You call reception. What do you say?', 'In the morning you want to know when breakfast starts. What do you ask?'],
    events: ['The receptionist says your room has a wonderful view of the sea. What do you say?'] },
  { id: 'friend', titleRu: 'Новый знакомый',
    opener: 'At a party you meet a friendly person from Canada. She asks where you are from. What do you say?',
    followups: ['She asks what you do in your free time. What do you answer?', 'She asks if you have ever been to Canada. What do you say?', 'You like talking to her. How do you suggest meeting again?'],
    events: ['She tells a funny joke and laughs. How do you react?'] },
  { id: 'taxi', titleRu: 'Такси',
    opener: 'You get into a taxi in a new city. The driver asks where you would like to go. What do you say?',
    followups: ['The driver does not understand the address. How do you explain it?', 'You are in a hurry. What do you say to the driver?', 'You arrive. How much is it, and how do you pay?'],
    events: ['There is a traffic jam. The driver suggests another road. What do you answer?'] },
  { id: 'movie', titleRu: 'Фильм',
    opener: 'Your friend asks what kind of movies you like. What do you answer?',
    followups: ['She asks about the last movie you watched. What do you tell her?', 'She did not like that movie at all. How do you react?', 'You decide to watch a movie together this weekend. What do you suggest?'],
    events: ['She says she cried at the end of the film. What do you say?'] },
  { id: 'weather', titleRu: 'Погода',
    opener: 'It is a beautiful sunny morning. Your neighbor says hello and talks about the weather. What do you say?',
    followups: ['He asks what the weather is usually like in your city. What do you answer?', 'He says tomorrow will rain all day. How do you react?', 'You want to go for a walk together. What do you suggest?'],
    events: ['Suddenly a strong wind starts. What do you say?'] },
  { id: 'work', titleRu: 'Работа',
    opener: 'A colleague asks how your work project is going. What do you answer?',
    followups: ['She asks what was the most difficult part. What do you say?', 'Your boss liked your work. How do you feel about it?', 'A colleague asks for your help with a task. What do you answer?'],
    events: ['Your manager announces good news for the whole team. How do you react?'] },
  { id: 'birthday', titleRu: 'День рождения',
    opener: 'Your friend is having a birthday party on Saturday. She invites you. What do you say?',
    followups: ['You ask what gift she would like. What do you say?', 'At the party you meet her family. How do you greet them?', 'You are leaving the party. What do you say goodbye?'],
    events: ['She loves your gift very much. How do you react?'] },
  { id: 'market', titleRu: 'Рынок',
    opener: 'You are at a colorful food market. You want to buy some fresh apples. What do you say to the seller?',
    followups: ['The apples cost more than you expected. What do you say?', 'You also want some cheese. How do you ask for it?', 'You buy everything. How do you thank the seller?'],
    events: ['The seller gives you an extra apple for free. What do you say?'] },
  { id: 'park', titleRu: 'Парк',
    opener: 'You are walking in a park. A friendly dog runs up to you. Its owner apologizes. What do you say?',
    followups: ['The owner asks if you like dogs. What do you answer?', 'You talk about your own pets or childhood. What do you say?', 'It was nice talking. How do you say goodbye?'],
    events: ['The dog brings you a ball and wants to play. What do you say?'] },
];

// --- Память: извлекаем факты из ответов ---
function extractFacts(text) {
  const facts = [];
  let m;
  m = text.match(/i live in ([a-z\s]+?)[.,!?]?$/i);
  if (m) facts.push('lives in ' + cap(m[1].trim()));
  m = text.match(/i have (\w+) (daughters?|sons?|children|kids)/i);
  if (m) facts.push('has ' + m[1] + ' ' + m[2].toLowerCase());
  m = text.match(/my name is ([a-z]+)/i);
  if (m) facts.push('name is ' + cap(m[1]));
  m = text.match(/i am (\d+) years old/i);
  if (m) facts.push(m[1] + ' years old');
  m = text.match(/i (like|love) ([a-z\s]+?)[.,!?]?$/i);
  if (m) facts.push('likes ' + m[2].trim().toLowerCase());
  return facts;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function rememberFacts(text) {
  extractFacts(text).forEach(f => {
    if (!db.memory.facts.includes(f)) {
      db.memory.facts.push(f);
      if (db.memory.facts.length > 20) db.memory.facts.shift();
    }
  });
  saveDb();
}

// --- Выбор ситуации без повторов ---
function pickSituation() {
  const fresh = SITUATIONS.filter(s => !db.usedTopics.includes(s.id));
  const pool = fresh.length ? fresh : SITUATIONS;
  const s = pool[Math.floor(Math.random() * pool.length)];
  db.usedTopics.push(s.id);
  if (db.usedTopics.length > SITUATIONS.length) db.usedTopics = [s.id];
  saveDb();
  return JSON.parse(JSON.stringify(s));
}

// --- Адаптация сложности по уровню и последним оценкам ---
function currentLevel() {
  const scores = db.stats.scores.slice(-6);
  if (scores.length >= 4) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const order = ['A1', 'A2', 'B1', 'B2', 'C1'];
    let idx = order.indexOf(db.profile.level);
    if (avg >= 85 && idx < 4) idx++;
    if (avg < 55 && idx > 0) idx--;
    return order[idx];
  }
  return db.profile.level;
}

// --- Генерация следующей реплики AI ---
// state: {situation, step, usedFollowups, usedEvents}
function nextAiMessage(userText, state) {
  const s = state.situation;
  const lvl = currentLevel();
  const cfg = LEVEL_SPEECH[lvl] || LEVEL_SPEECH.B1;

  rememberFacts(userText || '');
  const low = (userText || '').toLowerCase().trim();

  // 1. Очень короткий ответ — просим рассказать подробнее
  if (low && low.split(/\s+/).length <= 2 && !/^(yes|no|ok|okay|sure|thanks|thank you|hi|hello)\.?$/.test(low)) {
    return pick([
      'Interesting! Could you tell me a little more?',
      'I see. Can you say a bit more about that?',
      'Good! What else would you add?',
    ]);
  }

  // 2. Вопрос от пользователя — отвечаем в роли и возвращаем вопрос
  if (/\?$/.test(low)) {
    return pick([
      'Good question! In this situation I would say: "Let me check that for you." And you — what would you do next?',
      'Hmm, let me think... I would help you with that. But first, tell me — what is most important for you right now?',
    ]);
  }

  // 3. Эмоция — реагируем
  if (/(happy|great|wonderful|love|excited)/.test(low)) {
    return 'That sounds wonderful! I am happy for you. What happened next?';
  }
  if (/(sad|sorry|problem|difficult|hard|afraid|worried)/.test(low)) {
    return 'Oh, I am sorry to hear that. Do not worry, we will solve it together. What would you like to do first?';
  }
  if (/(thank)/.test(low)) {
    return 'You are very welcome! Is there anything else I can do for you?';
  }

  // 4. Память: ссылаемся на факты (раз в несколько ходов)
  if (state.step > 2 && db.memory.facts.length && Math.random() < 0.3) {
    const f = db.memory.facts[Math.floor(Math.random() * db.memory.facts.length)];
    if (/daughter|son|children|kid/.test(f)) return `By the way, you mentioned that you ${f}. Do they enjoy traveling?`;
    if (/lives in/.test(f)) return `You mentioned that you ${f}. What is the weather like there today?`;
    if (/likes/.test(f)) return `You said that you ${f}. How often do you do that?`;
  }

  // 5. Неожиданное событие (не чаще раза за разговор)
  if (!state.usedEvent && state.step >= 3 && Math.random() < 0.25 && s.events && s.events.length) {
    state.usedEvent = true;
    return s.events[0];
  }

  // 6. Следующий вопрос по ситуации
  const remaining = s.followups.filter((_, i) => !state.usedFollowups.includes(i));
  if (remaining.length) {
    const idx = s.followups.indexOf(remaining[Math.floor(Math.random() * remaining.length)]);
    state.usedFollowups.push(idx);
    return shorten(s.followups[idx], cfg.maxWords);
  }

  // 7. Ситуация исчерпана — развиваем историю свободно
  return pick([
    'And then what happened? I am curious!',
    'That is interesting. How did you feel at that moment?',
    'What would you do next in this situation?',
    'Tell me more — what did you say then?',
  ]);
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shorten(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
}
