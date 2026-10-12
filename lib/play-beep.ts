let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playBeep() {
  try {
    const c = getCtx();
    c.resume().then(() => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(c.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    });
  } catch {
    // ponytail: AudioContext may fail in some envs, silent fallback
  }
}
