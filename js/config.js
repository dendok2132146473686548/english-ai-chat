// Конфигурация: уровни, режимы обратной связи, лимиты.
const LEVELS = [
  { id: 'A1', name: 'Начальный', desc: 'Простые фразы' },
  { id: 'A2', name: 'Базовый', desc: 'Повседневные темы' },
  { id: 'B1', name: 'Средний', desc: 'Свободные разговоры' },
  { id: 'B2', name: 'Выше среднего', desc: 'Сложные темы' },
  { id: 'C1', name: 'Продвинутый', desc: 'Как носитель' },
];

const FEEDBACK_MODES = [
  { id: 'gentle', name: 'Мягкий', desc: 'Минимум исправлений' },
  { id: 'normal', name: 'Обычный', desc: 'Важные ошибки + советы' },
  { id: 'teacher', name: 'Учитель', desc: 'Подробные объяснения' },
];

// Сложность речи AI по уровням
const LEVEL_SPEECH = {
  A1: { maxWords: 12, simple: true },
  A2: { maxWords: 16, simple: true },
  B1: { maxWords: 22, simple: false },
  B2: { maxWords: 28, simple: false },
  C1: { maxWords: 34, simple: false },
};

const LIMITS = { requestTimeoutMs: 8000, maxHistoryTurns: 60 };
