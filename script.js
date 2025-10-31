// ====== Simple voice + text translator demo ======
// Uses Web Speech API for speech recognition & synthesis
// Uses MyMemory free translation endpoint for quick demo

// DOM
const srcLang = document.getElementById('srcLang');
const tgtLang = document.getElementById('tgtLang');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const translateBtn = document.getElementById('translateBtn');
const startRec = document.getElementById('startRec');
const stopRec = document.getElementById('stopRec');
const speakBtn = document.getElementById('speakBtn');
const copyBtn = document.getElementById('copyBtn');
const clearInput = document.getElementById('clearInput');
const downloadBtn = document.getElementById('downloadBtn');

let recognition, listening = false;

// Initialize speech recognition (if supported)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    listening = true;
    startRec.textContent = 'Listening... 🎙';
  };
  recognition.onend = () => {
    listening = false;
    startRec.textContent = '🎤 Start Speaking';
  };
  recognition.onerror = (e) => {
    console.error('Speech error', e);
    listening = false;
    startRec.textContent = '🎤 Start Speaking';
  };
  recognition.onresult = (ev) => {
    const text = Array.from(ev.results).map(r => r[0].transcript).join('');
    inputText.value = inputText.value ? inputText.value + ' ' + text : text;
    // optionally auto-translate after speech:
    translateText();
  };
} else {
  startRec.disabled = true;
  stopRec.disabled = true;
  startRec.textContent = 'Mic not supported';
}

// Start / Stop mic
startRec.addEventListener('click', () => {
  if (!recognition) return;
  // set recognition language to selected source if not 'auto'
  const lang = srcLang.value === 'auto' ? 'en-US' : srcLang.value;
  recognition.lang = lang;
  try { recognition.start(); } catch (e) { console.warn(e); }
});
stopRec.addEventListener('click', () => {
  if (!recognition) return;
  recognition.stop();
});

// Translate button
translateBtn.addEventListener('click', translateText);
clearInput.addEventListener('click', () => inputText.value = '');

// Copy / Speak / Download
copyBtn.addEventListener('click', async () => {
  if (!outputText.value) return;
  await navigator.clipboard.writeText(outputText.value);
  alert('Copied!');
});
speakBtn.addEventListener('click', () => {
  if (!outputText.value) return;
  speak(outputText.value, tgtLang.value);
});
downloadBtn.addEventListener('click', () => {
  const blob = new Blob([outputText.value || ''], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'translation.txt';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});

// Translation function using MyMemory free endpoint
async function translateText() {
  const q = inputText.value.trim();
  if (!q) return alert('Type or speak something to translate.');
  const src = srcLang.value === 'auto' ? 'auto' : srcLang.value;
  const tgt = tgtLang.value;

  // MyMemory simple endpoint: returns JSON; note: limited usage for demo
  // If src === 'auto', we'll request without explicit src (MyMemory may still translate)
  const langpair = src === 'auto' ? `${tgt}` : `${src}|${tgt}`;
  // Build URL safely
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(src === 'auto' ? 'en|' + tgt : langpair)}`;

  outputText.value = 'Translating...';
  try {
    const res = await fetch(url);
    const data = await res.json();
    // MyMemory returns a 'translatedText' at data.responseData.translatedText
    const translated = data && data.responseData && data.responseData.translatedText ? data.responseData.translatedText : '';
    outputText.value = translated || 'No translation returned.';
  } catch (err) {
    console.error(err);
    outputText.value = 'Translation failed. Check console.';
  }
}

// Simple TTS using SpeechSynthesis
function speak(text, lang) {
  if (!('speechSynthesis' in window)) return alert('Speech synthesis not supported.');
  const ut = new SpeechSynthesisUtterance(text);
  // choose voice that matches language if possible
  const voices = speechSynthesis.getVoices();
  const match = voices.find(v => v.lang && v.lang.startsWith(lang));
  if (match) ut.voice = match;
  ut.lang = lang || 'en-US';
  speechSynthesis.cancel();
  speechSynthesis.speak(ut);
}

// Optional: auto-translate when user types (debounce)
let debounce;
inputText.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    // auto-translate only if length > 2
    if (inputText.value.trim().length > 2) translateText();
  }, 800);
});
