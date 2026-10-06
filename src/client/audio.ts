// Audio: every sound is synthesised with WebAudio (no assets to download). Little sound effects for
// combat, loot, magic, ships and UI, plus gentle generative music whose mood follows where you are
// (town, wilds, night, space, ocean, caves, dungeons). Starts on the first click or key press.

export type Mood = "town" | "wild" | "night" | "space" | "ocean" | "cave" | "dungeon" | "menu";

export type Sfx =
  | "swing"
  | "arrow"
  | "magic"
  | "hit"
  | "crit"
  | "hurt"
  | "die"
  | "coin"
  | "loot"
  | "levelup"
  | "jump"
  | "splash"
  | "click"
  | "quest"
  | "laser"
  | "cannon"
  | "warp"
  | "boom"
  | "door"
  | "heal"
  | "chop"
  | "bite";

interface MoodDef {
  scale: number[];
  root: number;
  bpm: number;
  wave: OscillatorType;
  pad: number[];
  density: number;
  bright: number;
}

// Scales as semitone offsets; roots as MIDI notes.
const MOODS: Record<Mood, MoodDef> = {
  menu: { scale: [0, 2, 4, 7, 9], root: 60, bpm: 76, wave: "triangle", pad: [0, 7, 16], density: 0.55, bright: 2400 },
  town: { scale: [0, 2, 4, 7, 9], root: 62, bpm: 92, wave: "triangle", pad: [0, 4, 7], density: 0.6, bright: 2600 },
  wild: { scale: [0, 2, 3, 7, 9], root: 57, bpm: 84, wave: "triangle", pad: [0, 7, 14], density: 0.45, bright: 2000 },
  night: { scale: [0, 3, 5, 7, 10], root: 55, bpm: 66, wave: "sine", pad: [0, 3, 10], density: 0.35, bright: 1400 },
  space: { scale: [0, 2, 4, 6, 7, 11], root: 60, bpm: 70, wave: "sine", pad: [0, 7, 11, 18], density: 0.4, bright: 3200 },
  ocean: { scale: [0, 2, 4, 5, 7, 9], root: 62, bpm: 108, wave: "square", pad: [0, 4, 7], density: 0.55, bright: 1800 },
  cave: { scale: [0, 2, 3, 7, 8], root: 50, bpm: 60, wave: "sine", pad: [0, 7], density: 0.3, bright: 1100 },
  dungeon: { scale: [0, 1, 3, 7, 8], root: 52, bpm: 72, wave: "sawtooth", pad: [0, 3, 7], density: 0.4, bright: 900 }
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private echo!: DelayNode;
  private noise!: AudioBuffer;
  private mood: Mood = "menu";
  private nextBeat = 0;
  private beat = 0;
  private melodyStep = 0;
  private padVoices: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  volumes = { master: 0.8, music: 0.5, sfx: 0.8 };
  muted = false;
  private lastPlayed = new Map<Sfx, number>();

  constructor() {
    const start = () => this.unlock();
    addEventListener("pointerdown", start, { once: false });
    addEventListener("keydown", start, { once: false });
  }

  private unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    // A soft echo shared by music and effects for a cosy, roomy sound.
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = 0.33;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    this.echo.connect(fb).connect(this.echo);
    this.echo.connect(wet).connect(this.master);
    this.music.connect(this.master);
    this.music.connect(this.echo);
    this.sfx.connect(this.master);
    this.master.connect(ctx.destination);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.nextBeat = ctx.currentTime + 0.1;
    this.startPad();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volumes.master, t, 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music * 0.32, t, 0.3);
    this.sfx.gain.setTargetAtTime(this.volumes.sfx * 0.55, t, 0.05);
  }

  setMood(m: Mood): void {
    if (m === this.mood) return;
    this.mood = m;
    this.melodyStep = 0;
    this.startPad();
  }

  // ── music ────────────────────────────────────────────────────────────────────

  private startPad(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (this.padVoices) {
      const old = this.padVoices;
      old.gain.gain.setTargetAtTime(0, t, 0.8);
      setTimeout(() => old.osc.forEach((o) => o.stop()), 4000);
    }
    const def = MOODS[this.mood];
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.09, t, 1.5);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = def.bright * 0.4;
    gain.connect(lp).connect(this.music);
    const osc: OscillatorNode[] = [];
    for (const off of def.pad) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = midi(def.root - 12 + off);
        o.detune.value = det;
        o.connect(gain);
        o.start();
        osc.push(o);
      }
    }
    this.padVoices = { osc, gain };
  }

  private note(freq: number, at: number, dur: number, vol: number, wave: OscillatorType, bright: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = bright;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    o.connect(f).connect(g).connect(this.music);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  /** Call every frame: schedules the next few beats of music. */
  update(): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || this.volumes.music <= 0) return;
    const def = MOODS[this.mood];
    const step = 60 / def.bpm / 2; // eighth notes
    while (this.nextBeat < ctx.currentTime + 0.25) {
      const at = this.nextBeat;
      const b = this.beat % 16;
      // Bass on the downbeats, following a slow I-vi-IV-V-ish walk.
      const prog = [0, -3, -7, -5][Math.floor(this.beat / 16) % 4];
      if (b % 8 === 0) this.note(midi(def.root - 24 + prog + 12 * (this.mood === "cave" ? 0 : 1)), at, step * 7, 0.11, "sine", 600);
      // Melody: a wandering walk over the scale, with rests.
      if (Math.random() < def.density && (b % 2 === 0 || Math.random() < 0.3)) {
        this.melodyStep = Math.max(-2, Math.min(9, this.melodyStep + Math.round((Math.random() - 0.5) * 4)));
        const sc = def.scale;
        const deg = ((this.melodyStep % sc.length) + sc.length) % sc.length;
        const oct = Math.floor(this.melodyStep / sc.length);
        const n = def.root + prog + sc[deg] + 12 * oct;
        this.note(midi(n), at, step * (Math.random() < 0.3 ? 3 : 1.6), 0.07, def.wave, def.bright);
      }
      // Ocean gets a little shanty "oom-pah"; town a soft chime on the off-beat.
      if (this.mood === "ocean" && b % 4 === 2) this.note(midi(def.root - 12 + prog + 7), at, step, 0.05, "triangle", 1200);
      if (this.mood === "town" && b === 6) this.note(midi(def.root + 24 + prog), at, step * 4, 0.025, "sine", 4000);
      this.nextBeat += step;
      this.beat += 1;
    }
  }

  // ── effects ─────────────────────────────────────────────────────────────────

  private tone(freq: number, to: number, dur: number, vol: number, wave: OscillatorType = "sine", delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(dur: number, vol: number, from: number, to: number, type: BiquadFilterType = "bandpass", delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  play(s: Sfx, volume = 1): void {
    if (!this.ctx || this.muted || this.volumes.sfx <= 0) return;
    // Don't machine-gun the same sound.
    const now = performance.now();
    if (now - (this.lastPlayed.get(s) ?? 0) < 40) return;
    this.lastPlayed.set(s, now);
    const v = volume;
    switch (s) {
      case "swing":
        this.hiss(0.18, 0.5 * v, 600, 3000);
        break;
      case "arrow":
        this.tone(1400, 700, 0.12, 0.15 * v, "triangle");
        this.hiss(0.1, 0.2 * v, 3000, 6000, "highpass");
        break;
      case "magic":
        this.tone(500, 1200, 0.25, 0.12 * v, "sine");
        this.hiss(0.3, 0.15 * v, 800, 200, "lowpass");
        break;
      case "hit":
        this.tone(180, 60, 0.12, 0.35 * v, "triangle");
        this.hiss(0.06, 0.3 * v, 1500, 500);
        break;
      case "crit":
        this.tone(220, 70, 0.15, 0.4 * v, "triangle");
        this.tone(1800, 2600, 0.12, 0.08 * v, "sine", 0.03);
        break;
      case "hurt":
        this.tone(140, 70, 0.2, 0.35 * v, "square");
        break;
      case "die":
        this.tone(600, 120, 0.4, 0.15 * v, "triangle");
        this.hiss(0.3, 0.2 * v, 900, 200);
        break;
      case "coin":
        this.tone(1320, 1320, 0.08, 0.12 * v, "square");
        this.tone(1760, 1760, 0.18, 0.12 * v, "square", 0.07);
        break;
      case "loot":
        [880, 1100, 1320].forEach((f, i) => this.tone(f, f, 0.15, 0.1 * v, "triangle", i * 0.06));
        break;
      case "levelup":
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.35, 0.12 * v, "triangle", i * 0.09));
        break;
      case "quest":
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, f, i === 3 ? 0.6 : 0.2, 0.12 * v, "square", i * 0.12));
        break;
      case "jump":
        this.tone(300, 700, 0.15, 0.12 * v, "sine");
        break;
      case "splash":
        this.hiss(0.4, 0.4 * v, 1200, 300, "lowpass");
        break;
      case "click":
        this.tone(900, 700, 0.04, 0.08 * v, "triangle");
        break;
      case "laser":
        this.tone(1600, 300, 0.16, 0.12 * v, "square");
        break;
      case "cannon":
        this.tone(90, 35, 0.6, 0.5 * v, "sine");
        this.hiss(0.5, 0.5 * v, 700, 80, "lowpass");
        break;
      case "warp":
        this.tone(200, 2400, 0.8, 0.12 * v, "sawtooth");
        this.hiss(0.8, 0.2 * v, 400, 5000);
        break;
      case "boom":
        this.tone(70, 30, 0.8, 0.5 * v, "sine");
        this.hiss(0.9, 0.6 * v, 1200, 60, "lowpass");
        break;
      case "door":
        this.tone(220, 180, 0.12, 0.2 * v, "square");
        this.tone(160, 140, 0.12, 0.18 * v, "square", 0.1);
        break;
      case "heal":
        [660, 880, 1320].forEach((f, i) => this.tone(f, f * 1.02, 0.4, 0.07 * v, "sine", i * 0.05));
        break;
      case "chop":
        this.tone(200, 120, 0.08, 0.3 * v, "square");
        this.hiss(0.08, 0.3 * v, 2000, 800);
        break;
      case "bite":
        this.tone(900, 1400, 0.1, 0.15 * v, "sine");
        this.tone(900, 1400, 0.1, 0.15 * v, "sine", 0.15);
        break;
    }
  }
}
