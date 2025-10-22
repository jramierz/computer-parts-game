// SONIDOS DE LAS TARJETAS 
const sounds = {
  computadora: document.getElementById('snd-computadora'),
  teclado: document.getElementById('snd-teclado'),
  mouse: document.getElementById('snd-mouse')
};

let unlocked = false;
function unlockAudioOnce() {
  if (unlocked) return;
  unlocked = true;
  Object.values(sounds).forEach(a => { try { a.volume = 1; a.pause(); } catch {} });
  document.removeEventListener('pointerdown', unlockAudioOnce, { once: true });
  document.removeEventListener('keydown',   unlockAudioOnce, { once: true });
}
document.addEventListener('pointerdown', unlockAudioOnce, { once: true });
document.addEventListener('keydown',   unlockAudioOnce, { once: true });

function stopAllExcept(key) {
  Object.entries(sounds).forEach(([k, a]) => {
    if (!a) return;
    if (k !== key) {
      try { a.pause(); a.currentTime = 0; } catch {}
    }
  });
}

// Reproducir nombre de una parte
function playPart(key) {
  const audio = sounds[key];
  if (!audio) return;
  stopAllExcept(key);
  try { audio.currentTime = 0; } catch {}
  audio.play().catch(() => {});

  const card = document.querySelector(`.card[data-key="${key}"]`);
  if (card) {
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 500);
  }
}

// LISTENERS DE TARJETAS 
let isRepeatingError = false;

function onCardPressed(key) {
  if (windowMode === 'guiada') {
    const objetivo = sequence[stepIndex];

    // Error — reproducir error y luego repetir la pregunta
    if (key !== objetivo) {
      if (isRepeatingError) return;
      isRepeatingError = true;

      markCard(key, 'err');
      showSay('Uy, inténtalo de nuevo.', 'error', `${stepIndex + 1} / ${sequence.length}`);

      stopNarration();
      stopAllExcept(null);
      try { tryAgainSnd.currentTime = 0; } catch {}
      tryAgainSnd.onended = null;
      tryAgainSnd.onended = () => {
        tryAgainSnd.onended = null;
        replayCurrentQuestion();
        isRepeatingError = false;
      };
      tryAgainSnd.play().catch(() => {
        setTimeout(() => { replayCurrentQuestion(); isRepeatingError = false; }, 800);
      });
      return;
    }

    // Acierto
    markCard(key, 'ok');
    stopAllExcept(key);
    playPart(key);
    showSay('¡Excelente! Vamos con el que sigue.', 'good', `${stepIndex + 1} / ${sequence.length}`);
    correctThenAdvance();
    return;
  }

  // MODO LIBRE
  playPart(key);
}

document.querySelectorAll('.hit').forEach(btn => {
  btn.addEventListener('click', e => onCardPressed(e.currentTarget.dataset.key));
  btn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCardPressed(e.currentTarget.dataset.key);
    }
  });
});

const keyMap = { 'c': 'computadora', 't': 'teclado', 'm': 'mouse' };
window.addEventListener('keydown', (e) => {
  const k = (e.key || '').toLowerCase();
  if (keyMap[k]) onCardPressed(keyMap[k]);
});

// MASCOTA / MENÚ DE BURBUJAS 
const mascota = document.getElementById('mascota');
const bubbles = document.getElementById('bubbles');
let windowMode = 'libre';

mascota.addEventListener('click', (e) => {
  if (e.target.closest('.mascota-bubbles')) return;
  mascota.classList.toggle('open');
  mascota.setAttribute('aria-expanded', mascota.classList.contains('open'));
});
document.addEventListener('click', (e) => {
  if (!mascota.contains(e.target)) {
    mascota.classList.remove('open');
    mascota.setAttribute('aria-expanded', 'false');
  }
});
bubbles.querySelectorAll('.bubble-btn').forEach(btn => {
  btn.addEventListener('click', () => changeWindow(btn.dataset.window));
});
function changeWindow(mode) {
  windowMode = mode;
  mascota.classList.remove('open');
  mascota.setAttribute('aria-expanded', 'false');
  if (mode === 'libre') exitGuided();
  else enterGuided();
}

// GLOBO DE DIÁLOGO 
const say     = document.getElementById('say');
const sayText = document.getElementById('sayText');
const sayStep = document.getElementById('sayStep');

function showSay(msg, state = 'ask', stepLabel = null) {
  if (!say) return;
  say.classList.remove('is-ask', 'is-good', 'is-error');
  say.classList.add(state === 'good' ? 'is-good' : state === 'error' ? 'is-error' : 'is-ask');
  if (sayText) sayText.textContent = msg;
  if (sayStep) sayStep.textContent = stepLabel ?? '';
}

// ENSEÑANZA GUIADA 
let sequence = ['mouse', 'teclado', 'computadora'];
let stepIndex = 0;

const ask = {
  mouse:   document.getElementById('ask-mouse'),
  teclado: document.getElementById('ask-teclado'),
  computadora:
    document.getElementById('ask-computadora') ||
    document.getElementById('ask-computer')
};
const tryAgainSnd  = document.getElementById('try-again');
const greatNextSnd = document.getElementById('great-next');
const finishSnd    = document.getElementById('finish');

const narratorClips = [ ask.mouse, ask.teclado, ask.computadora, tryAgainSnd, greatNextSnd, finishSnd ];

function stopNarration() {
  narratorClips.forEach(a => { if (a) { try { a.pause(); a.currentTime = 0; } catch {} } });
  if (tryAgainSnd)  tryAgainSnd.onended  = null;
  if (greatNextSnd) greatNextSnd.onended = null;
  if (finishSnd)    finishSnd.onended    = null;
}

function speak(clip) {
  if (!clip) return;
  stopNarration();
  stopAllExcept(null);
  clip.play().catch(() => {});
}

// Repetir pregunta actual (sin barajar ni avanzar)
function replayCurrentQuestion() {
  const key = sequence[stepIndex];
  const labels = { mouse: 'mouse', teclado: 'teclado', computadora: 'computadora' };
  showSay(`¿Puedes ayudarme a encontrar el ${labels[key]}?`, 'ask', `${stepIndex + 1} / ${sequence.length}`);
  speak(ask[key]);
}

// Barajar cualquier arreglo
function shuffleArray(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function enterGuided() {
  document.body.classList.add('mode-guided');
  sequence = shuffleArray(['mouse', 'teclado', 'computadora']);
  stepIndex = 0;
  nextStep();
}

function exitGuided() {
  document.body.classList.remove('mode-guided');
  stopNarration();
  stepIndex = 0;
  if (say) { say.classList.remove('is-good', 'is-error'); say.classList.add('is-ask'); }
  alreadyCelebrated = false;
}

function nextStep() {
  if (stepIndex >= sequence.length) {
    showSay('¡Lo lograste!', 'good', '✔');
    speak(finishSnd);
    celebrateOnce();
    return;
  }

  const key = sequence[stepIndex];
  const labels = { mouse: 'mouse', teclado: 'teclado', computadora: 'computadora' };

  const grid = document.querySelector('.grid');
  if (grid) { grid.classList.remove('slide'); void grid.offsetWidth; grid.classList.add('slide'); }

  shuffleGrid();

  showSay(`¿Puedes ayudarme a encontrar el ${labels[key]}?`, 'ask', `${stepIndex + 1} / ${sequence.length}`);
  speak(ask[key]);
}

function correctThenAdvance() {
  stopNarration();
  stopAllExcept(null);

  const isLast = (stepIndex >= sequence.length - 1);
  if (isLast) {
    showSay('¡Lo lograste!', 'good', '✔');
    speak(finishSnd);
    celebrateOnce();
    return;
  }

  try { greatNextSnd.currentTime = 0; } catch {}
  greatNextSnd.onended = null;
  greatNextSnd.onended = () => {
    greatNextSnd.onended = null;
    stepIndex++;
    nextStep();
  };
  greatNextSnd.play().catch(() => {
    stepIndex++;
    setTimeout(nextStep, 700);
  });
}

// FEEDBACK VISUAL 
function markCard(key, cls) {
  const card = document.querySelector(`.card[data-key="${key}"]`);
  if (!card) return;
  card.classList.remove('ok', 'err');
  void card.offsetWidth;
  card.classList.add(cls);
  setTimeout(() => card.classList.remove(cls), cls === 'ok' ? 700 : 450);
}

// BARAJAR LAS TARJETAS 
function shuffleGrid() {
  const grid = document.querySelector('.grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.card'));

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.forEach(card => grid.appendChild(card));

  grid.classList.remove('shuf');
  void grid.offsetWidth;
  grid.classList.add('shuf');
  setTimeout(() => grid.classList.remove('shuf'), 260);
}

// CELEBRACIÓN FINAL (CONFETTI + PARTY HORN) 
const partyHorn = document.getElementById('sfx-party');
if (partyHorn) partyHorn.volume = 0.2;
let alreadyCelebrated = false;

function launchConfettiFrom(el) {
  if (!window.confetti || !el) return;
  const r = el.getBoundingClientRect();
  const x = (r.left + r.width * 0.35) / window.innerWidth;
  const y = (r.top  + r.height * 0.65) / window.innerHeight;
  const base = { origin: { x, y } };

  const fire = (ratio, opts) => {
    window.confetti(Object.assign({}, base, opts, {
      particleCount: Math.floor(320 * ratio)
    }));
  };
  fire(0.25, { spread: 30, startVelocity: 55, angle: 80 });
  fire(0.2,  { spread: 50, angle: 60 });
  fire(0.35, { spread: 85, decay: 0.91, scalar: 0.9, angle: 70 });
  fire(0.15, { spread: 100, startVelocity: 35, decay: 0.92, scalar: 1.15, angle: 65 });
}

function celebrateOnce() {
  if (alreadyCelebrated) return;
  alreadyCelebrated = true;

  const onDone = () => {
    try { partyHorn.currentTime = 0; } catch {}
    partyHorn?.play().catch(()=>{});
    launchConfettiFrom(mascota);
    setTimeout(() => { alreadyCelebrated = false; }, 3500);
  };

  if (finishSnd) {
    finishSnd.onended = null;
    finishSnd.onended = () => {
      finishSnd.onended = null;
      onDone();
    };
    setTimeout(onDone, Math.max(1200, (finishSnd.duration || 1.2) * 1000 + 100));
  } else {
    setTimeout(onDone, 1200);
  }
}
