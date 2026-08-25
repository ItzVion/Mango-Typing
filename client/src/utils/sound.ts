let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType, gainStart = 0.15) {
  try {
    const audioCtx = getCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainStart, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Audio not available (e.g. no user gesture yet) — fail silently.
  }
}

// Short bright blip for a correctly popped balloon / correct keystroke.
export const playPop = () => tone(720, 0.12, "sine", 0.18);

// Lower, quicker blip for a mistake.
export const playError = () => tone(160, 0.15, "sawtooth", 0.15);

// Short engine "vroom" blip that pitches up with car speed (0-1).
export const playEngine = (speed: number) => tone(90 + speed * 220, 0.08, "square", 0.06);
