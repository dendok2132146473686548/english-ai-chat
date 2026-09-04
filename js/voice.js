// Voice: распознавание речи + озвучка AI. Архитектура с fallback на текст.
const Voice = {
  supportedRec() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },
  supportedTts() {
    return 'speechSynthesis' in window;
  },
  recognition: null,
  listening: false,

  // Распознать одну фразу, вернуть текст через callback
  listenOnce(onText, onError) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError && onError('unsupported'); return; }
    try { if (this.recognition) this.recognition.abort(); } catch (e) {}
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    this.recognition = r;
    this.listening = true;
    r.onresult = (ev) => {
      this.listening = false;
      const t = ev.results[0][0].transcript;
      onText && onText(t);
    };
    r.onerror = () => { this.listening = false; onError && onError('error'); };
    r.onend = () => { this.listening = false; };
    try { r.start(); } catch (e) { this.listening = false; onError && onError('error'); }
  },
  stop() {
    try { if (this.recognition) this.recognition.abort(); } catch (e) {}
    this.listening = false;
  },

  // Озвучить текст AI
  speak(text) {
    if (!this.supportedTts()) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.95;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
};
