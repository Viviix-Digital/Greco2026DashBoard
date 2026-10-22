let ctx: AudioContext | null = null;

/** Two short tones for a weapon alert. Browsers may block audio until the first click. */
export function beepAlert() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    [880, 660].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  } catch {
    /* audio unavailable */
  }
}
