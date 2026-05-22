let ctx: AudioContext | null = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); }
    catch { return null; }
  }
  return ctx;
}

function beep(freq: number, duration = 0.12, type: OscillatorType = "sine", vol = 0.15) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  o.type = type;
  g.gain.value = vol;
  o.connect(g).connect(c.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  o.stop(c.currentTime + duration);
}

export const sfx = {
  correct: () => { beep(880, 0.1, "triangle"); setTimeout(() => beep(1320, 0.12, "triangle"), 90); },
  wrong: () => beep(180, 0.25, "sawtooth", 0.18),
  click: () => beep(520, 0.05, "square", 0.08),
  finish: () => {
    beep(660, 0.1, "triangle");
    setTimeout(() => beep(880, 0.1, "triangle"), 110);
    setTimeout(() => beep(1100, 0.18, "triangle"), 220);
  },
  tick: () => beep(300, 0.04, "square", 0.06),
};
