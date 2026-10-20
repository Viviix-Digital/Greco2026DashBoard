type Job = {
  t: number;
  dur: number;
  step: (k: number) => void;
  done?: () => void;
  cancelled: boolean;
};

const jobs: Job[] = [];

export function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

export function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Short interruptible tween. Returns a cancel function. */
export function tween(
  dur: number,
  step: (k: number) => void,
  done?: () => void,
) {
  const job: Job = { t: 0, dur, step, done, cancelled: false };
  jobs.push(job);
  return () => {
    job.cancelled = true;
  };
}

export function tickTweens(dt: number) {
  for (let i = jobs.length - 1; i >= 0; i--) {
    const job = jobs[i];
    if (job.cancelled) {
      jobs.splice(i, 1);
      continue;
    }
    job.t += dt * 1000;
    const k = easeOut(Math.min(1, job.t / job.dur));
    job.step(k);
    if (job.t >= job.dur) {
      job.done?.();
      jobs.splice(i, 1);
    }
  }
}

type Spring = {
  el: HTMLElement;
  s: number;
  v: number;
  target: number;
  live: boolean;
};

const springs: Spring[] = [];

export function bindSpring(el: HTMLElement) {
  const s: Spring = { el, s: 1, v: 0, target: 1, live: false };
  const enter = () => {
    s.target = 1.055;
  };
  const leave = () => {
    s.target = 1;
  };
  const down = () => {
    s.target = 0.92;
  };
  const up = (ev: PointerEvent) => {
    s.target = el.contains(ev.target as Node) && el.matches(":hover") ? 1.055 : 1;
  };
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);
  el.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  springs.push(s);
  return s;
}

export function tickSprings(dt: number) {
  const stiffness = 520;
  const damping = 28;
  for (const s of springs) {
    if (!s.live) continue;
    const acc = (s.target - s.s) * stiffness - s.v * damping;
    s.v += acc * dt;
    s.s += s.v * dt;
    s.el.style.transform = `scale(${s.s.toFixed(4)})`;
  }
}

export function enableSprings() {
  for (const s of springs) s.live = true;
}
