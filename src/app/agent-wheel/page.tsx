"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getUser } from "@/lib/auth";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type Prize = {
  id: string;
  tr: string;
  en: string;
  detailTr: string;
  detailEn: string;
  color: string;
  textColor: string;
  visual: "cash" | "coin" | "extraRoll" | "phone" | "tablet" | "watch" | "console" | "laptop" | "dyson" | "vacation";
  image: string;
  imageTone?: "contain" | "cover";
  weight: number;
};

type SpinResult = {
  id: string;
  prizeId: string;
  prizeName: string;
  createdAt: string;
};

type AgentWheelAudioBuffers = {
  reelClick?: AudioBuffer;
  winMain?: AudioBuffer;
  winBells: AudioBuffer[];
  ready: boolean;
  loadPromise?: Promise<void>;
};

const WHEEL_MAIN_SPIN_MS = 8400;
const WHEEL_SETTLE_MS = 7800;
const WHEEL_SETTLE_DURATION_MS = 1150;
const WHEEL_STOP_MS = WHEEL_SETTLE_MS + WHEEL_SETTLE_DURATION_MS;
const WHEEL_RESULT_MS = WHEEL_STOP_MS + 320;
const AGENT_WHEEL_SOUND_FILES = {
  reelClick: "/sounds/agent-wheel/reel-click.wav",
  winMain: "/sounds/agent-wheel/Money%20Winner.wav",
  winBells: [
    "/sounds/agent-wheel/win-bell-jackpot.wav",
    "/sounds/agent-wheel/win-bell-1.wav",
    "/sounds/agent-wheel/win-bell-2.wav",
  ],
};

const PRIZES: Prize[] = [
  {
    id: "gbp2000",
    tr: "2000 GBP",
    en: "2000 GBP",
    detailTr: "Nakit hediye",
    detailEn: "Cash prize",
    color: "#d8aa48",
    textColor: "#111827",
    visual: "coin",
    image: "https://commons.wikimedia.org/wiki/Special:Redirect/file/British_Currency_-_United_Kingdom_Money_-_GBP_Pounds.jpg?width=500",
    imageTone: "cover",
    weight: 1,
  },
  {
    id: "extra_roll",
    tr: "Ekstra Çevirme",
    en: "Extra Roll",
    detailTr: "Bir kez daha çark çevirme hakkı",
    detailEn: "One more wheel spin",
    color: "#070b10",
    textColor: "#ffffff",
    visual: "extraRoll",
    image: "",
    weight: 2,
  },
  {
    id: "iphone",
    tr: "iPhone 17 Pro Max",
    en: "iPhone 17 Pro Max",
    detailTr: "Premium telefon",
    detailEn: "Premium phone",
    color: "#d7a842",
    textColor: "#111827",
    visual: "phone",
    image: "/images/agent-wheel/iphone-prize.png",
    imageTone: "contain",
    weight: 3,
  },
  {
    id: "macbook",
    tr: "Mac Book",
    en: "Mac Book",
    detailTr: "Laptop hediyesi",
    detailEn: "Laptop prize",
    color: "#d7a842",
    textColor: "#111827",
    visual: "laptop",
    image: "/images/agent-wheel/macbook-prize-v2.png",
    weight: 4,
  },
  {
    id: "gold",
    tr: "Tam Altin",
    en: "Tam Altin",
    detailTr: "Altın hediyesi",
    detailEn: "Gold prize",
    color: "#070b10",
    textColor: "#ffffff",
    visual: "cash",
    image: "/images/agent-wheel/tam-altin-prize.png",
    imageTone: "contain",
    weight: 6,
  },
  {
    id: "dyson",
    tr: "Dyson Hediye Çeki",
    en: "Dyson Gift Card",
    detailTr: "Ev teknolojisi",
    detailEn: "Home technology",
    color: "#090d13",
    textColor: "#ffffff",
    visual: "dyson",
    image: "/images/agent-wheel/dyson-gift-card.png",
    imageTone: "contain",
    weight: 8,
  },
  {
    id: "ipad",
    tr: "iPad",
    en: "iPad",
    detailTr: "Tablet hediyesi",
    detailEn: "Tablet prize",
    color: "#070b10",
    textColor: "#ffffff",
    visual: "tablet",
    image: "/images/agent-wheel/ipad-prize.png",
    imageTone: "contain",
    weight: 10,
  },
  {
    id: "watch",
    tr: "Apple Watch",
    en: "Apple Watch",
    detailTr: "Akıllı saat",
    detailEn: "Smart watch",
    color: "#d8aa48",
    textColor: "#111827",
    visual: "watch",
    image: "/images/agent-wheel/apple-watch-prize.png",
    imageTone: "contain",
    weight: 13,
  },
  {
    id: "playstation",
    tr: "PlayStation 5",
    en: "PlayStation 5",
    detailTr: "Oyun konsolu",
    detailEn: "Game console",
    color: "#090d13",
    textColor: "#ffffff",
    visual: "console",
    image: "/ps5.png",
    weight: 16,
  },
  {
    id: "vacation",
    tr: "Tatil",
    en: "Vacation",
    detailTr: "Tatil paketi",
    detailEn: "Holiday package",
    color: "#070b10",
    textColor: "#ffffff",
    visual: "vacation",
    image: "/images/agent-wheel/vacation-prize.png",
    imageTone: "cover",
    weight: 37,
  },
];

function getPrizeName(prize: Prize, locale: "tr" | "en") {
  return locale === "tr" ? prize.tr : prize.en;
}

function pickRandomIndex(max: number) {
  const random = pickRandomFloat();
  return Math.floor(random * max);
}

function pickRandomFloat() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] / 4294967296;
  }

  return Math.random();
}

function pickWeightedPrizeIndex(prizes: Prize[]) {
  const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  const roll = pickRandomFloat() * totalWeight;
  let cursor = 0;

  for (let index = 0; index < prizes.length; index += 1) {
    cursor += prizes[index].weight;
    if (roll < cursor) return index;
  }

  return prizes.length - 1;
}

function PrizeVisual({ prize }: { prize: Prize }) {
  if (prize.visual === "extraRoll") {
    return (
      <span className="prize-art extra-roll-art" role="img" aria-label={prize.en}>
        2x
      </span>
    );
  }

  return (
    <span
      className={`prize-art image ${prize.imageTone === "cover" ? "cover" : ""}`}
      role="img"
      aria-label={prize.en}
      style={
        {
          backgroundImage: `url("${prize.image}")`,
          backgroundSize: prize.imageTone === "cover" ? "cover" : "contain",
        } as CSSProperties
      }
    />
  );
}

export default function AgentWheelPage() {
  const { locale } = useLanguage();
  const spinTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const celebrationTimer = useRef<number | null>(null);
  const spinWheelRef = useRef<() => void>(() => {});
  const dismissWinningScreenRef = useRef<() => boolean>(() => false);
  const audioStartFrame = useRef<number | null>(null);
  const winAudioFrame = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioMasterGainRef = useRef<GainNode | null>(null);
  const audioBuffersRef = useRef<AgentWheelAudioBuffers>({
    winBells: [],
    ready: false,
  });
  const audioSourceRefs = useRef<AudioBufferSourceNode[]>([]);
  const soundEnabledRef = useRef(true);
  const sampleSequenceActiveRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wheelSettling, setWheelSettling] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);

  const role = me?.role as string | undefined;
  const canUseWheel =
    role === "ADMIN" || role === "MANAGER" || role === "SALES" || role === "PREVIEW";
  const sliceAngle = 360 / PRIZES.length;

  const wheelGradient = useMemo(
    () =>
      PRIZES.map((prize, index) => {
        const start = index * sliceAngle;
        const end = (index + 1) * sliceAngle;
        return `${prize.color} ${start}deg ${end}deg`;
      }).join(", "),
    [sliceAngle],
  );
  const winningPrize = result ? PRIZES.find((prize) => prize.id === result.prizeId) : null;

  useEffect(() => {
    setMounted(true);
    setMe(getUser());
    preloadAudioBuffers();

    return () => {
      if (spinTimer.current) window.clearTimeout(spinTimer.current);
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
      if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
      if (audioStartFrame.current) window.cancelAnimationFrame(audioStartFrame.current);
      if (winAudioFrame.current) window.cancelAnimationFrame(winAudioFrame.current);
      stopAudioSources();
      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }
    };
  }, []);

  useEffect(() => {
    function handleSpaceSpin(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'button, input, textarea, select, [contenteditable="true"], [role="button"]',
        )
      ) {
        return;
      }

      event.preventDefault();
      if (dismissWinningScreenRef.current()) return;
      spinWheelRef.current();
    }

    window.addEventListener("keydown", handleSpaceSpin);

    return () => {
      window.removeEventListener("keydown", handleSpaceSpin);
    };
  }, []);

  function preloadAudioBuffers() {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    void ensureAudioBuffers(ctx);
  }

  async function decodeAudioFile(ctx: AudioContext, src: string) {
    const response = await fetch(src);
    const data = await response.arrayBuffer();

    return ctx.decodeAudioData(data.slice(0));
  }

  function ensureAudioBuffers(ctx: AudioContext) {
    const buffers = audioBuffersRef.current;

    if (buffers.ready) return buffers.loadPromise ?? Promise.resolve();
    if (buffers.loadPromise) return buffers.loadPromise;

    buffers.loadPromise = Promise.all([
      decodeAudioFile(ctx, AGENT_WHEEL_SOUND_FILES.reelClick),
      decodeAudioFile(ctx, AGENT_WHEEL_SOUND_FILES.winMain),
      ...AGENT_WHEEL_SOUND_FILES.winBells.map((src) => decodeAudioFile(ctx, src)),
    ])
      .then(([reelClick, winMain, ...winBells]) => {
        buffers.reelClick = reelClick;
        buffers.winMain = winMain;
        buffers.winBells = winBells;
        buffers.ready = true;
      })
      .catch(() => {
        buffers.ready = false;
      });

    return buffers.loadPromise;
  }

  function getReadyAudioBuffers(ctx: AudioContext) {
    void ensureAudioBuffers(ctx);

    const buffers = audioBuffersRef.current;
    if (!buffers.ready || !buffers.reelClick || buffers.winBells.length === 0) {
      return null;
    }

    return buffers;
  }

  function stopAudioSources() {
    audioSourceRefs.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already stopped sources throw in some browsers.
      }
    });

    audioSourceRefs.current = [];
  }

  function playBufferAt(
    ctx: AudioContext,
    buffer: AudioBuffer,
    when: number,
    volume: number,
    playbackRate = 1,
    offset = 0,
    duration?: number,
  ) {
    if (!soundEnabledRef.current) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const safeWhen = Math.max(when, ctx.currentTime + 0.004);
    const playDuration = duration ?? Math.max(0.01, buffer.duration - offset);
    const realDuration = playDuration / playbackRate;

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, safeWhen);
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), safeWhen);
    gain.gain.setTargetAtTime(0.0001, safeWhen + Math.max(0.012, realDuration - 0.018), 0.012);

    source.connect(gain);
    gain.connect(audioOutput(ctx));
    source.onended = () => {
      audioSourceRefs.current = audioSourceRefs.current.filter((item) => item !== source);
    };
    audioSourceRefs.current.push(source);
    source.start(safeWhen, offset, playDuration);
  }

  function playHotBellGlintAt(ctx: AudioContext, when: number, frequency: number, volume: number) {
    if (!soundEnabledRef.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const safeWhen = Math.max(when, ctx.currentTime + 0.004);

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, safeWhen);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.035, safeWhen + 0.08);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency, safeWhen);
    filter.Q.setValueAtTime(10, safeWhen);

    gain.gain.setValueAtTime(0.0001, safeWhen);
    gain.gain.exponentialRampToValueAtTime(volume, safeWhen + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, safeWhen + 0.145);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioOutput(ctx));
    osc.start(safeWhen);
    osc.stop(safeWhen + 0.17);
  }

  function playSampleSpinSounds() {
    if (!soundEnabledRef.current) return true;

    const ctx = ensureAudioContext();
    if (!ctx) return false;

    const buffers = getReadyAudioBuffers(ctx);
    if (!buffers || !buffers.reelClick) return false;

    const reelClick = buffers.reelClick;
    stopAudioSources();

    const start = ctx.currentTime + 0.035;
    let elapsed = 0;
    const spinClickDuration = WHEEL_STOP_MS - 170;

    while (elapsed < spinClickDuration) {
      const progress = elapsed / spinClickDuration;
      const volume = 0.48 + (1 - progress) * 0.24;
      const rate = 1.48 - progress * 0.34;

      playBufferAt(ctx, reelClick, start + elapsed / 1000, volume, rate);
      elapsed += 48 + Math.pow(progress, 2.05) * 210;
    }

    [
      { time: WHEEL_SETTLE_MS + 40, volume: 0.62, rate: 0.92 },
      { time: WHEEL_SETTLE_MS + 230, volume: 0.58, rate: 0.82 },
      { time: WHEEL_STOP_MS - 72, volume: 0.7, rate: 0.74 },
      { time: WHEEL_STOP_MS + 12, volume: 0.82, rate: 0.66 },
    ].forEach((hit) => {
      playBufferAt(
        ctx,
        reelClick,
        start + hit.time / 1000,
        hit.volume,
        hit.rate,
      );
    });

    return true;
  }

  function playSampleWinSound() {
    if (!soundEnabledRef.current) return true;

    const ctx = ensureAudioContext();
    if (!ctx) return false;

    const buffers = getReadyAudioBuffers(ctx);
    if (!buffers) return false;

    const start = ctx.currentTime + 0.025;
    if (buffers.winMain) {
      playBufferAt(ctx, buffers.winMain, start, 0.86, 1);
      return true;
    }

    const jackpotBell = buffers.winBells[0];
    if (!jackpotBell) return false;
    const accentBell = buffers.winBells[1] ?? jackpotBell;
    const hits = [
      0, 42, 84, 126, 168, 210, 254, 298, 344, 390, 438, 486, 536, 588, 642, 700,
    ];

    hits.forEach((delay, index) => {
      const bell = index % 4 === 3 ? accentBell : jackpotBell;
      const rate = 1.92 + Math.min(index, 10) * 0.035 + (index % 2) * 0.08;
      const volume = index < 12 ? 0.34 : 0.28;
      playBufferAt(
        ctx,
        bell,
        start + delay / 1000,
        volume,
        rate,
        0,
        0.075,
      );
      playHotBellGlintAt(ctx, start + delay / 1000 + 0.006, 3120 + (index % 5) * 260, 0.028);
    });

    playBufferAt(ctx, jackpotBell, start + 0.82, 0.4, 2.42, 0, 0.11);
    playHotBellGlintAt(ctx, start + 0.82, 4186.01, 0.06);
    playHotBellGlintAt(ctx, start + 0.89, 4698.63, 0.044);

    return true;
  }

  function ensureAudioContext() {
    if (typeof window === "undefined") return null;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
      audioMasterGainRef.current = audioContextRef.current.createGain();
      audioMasterGainRef.current.gain.value = soundEnabled ? 0.72 : 0;
      audioMasterGainRef.current.connect(audioContextRef.current.destination);
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function audioOutput(ctx: AudioContext) {
    if (!audioMasterGainRef.current) {
      audioMasterGainRef.current = ctx.createGain();
      audioMasterGainRef.current.gain.value = soundEnabled ? 0.72 : 0;
      audioMasterGainRef.current.connect(ctx.destination);
    }

    return audioMasterGainRef.current;
  }

  function setSoundMaster(enabled: boolean) {
    const ctx = audioContextRef.current;
    const master = audioMasterGainRef.current;

    if (!ctx || !master) return;
    if (enabled && ctx.state === "suspended") void ctx.resume();

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(enabled ? 0.72 : 0, ctx.currentTime, 0.025);
  }

  function toggleSound() {
    setSoundEnabled((current) => {
      const next = !current;
      soundEnabledRef.current = next;
      if (next) ensureAudioContext();
      if (!next) {
        stopAudioSources();
      }
      setSoundMaster(next);
      return next;
    });
  }

  function playTickAt(ctx: AudioContext, start: number, progress: number) {
    const output = audioOutput(ctx);
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    const snapFilter = ctx.createBiquadFilter();
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    const snapVolume = 0.2 + (1 - progress) * 0.2;
    const bodyVolume = 0.09 + (1 - progress) * 0.045;
    const decay = 0.032 + progress * 0.046;

    snap.type = "triangle";
    snap.frequency.setValueAtTime(1880 - progress * 440, start);
    snap.frequency.exponentialRampToValueAtTime(820 - progress * 120, start + 0.026);

    snapFilter.type = "bandpass";
    snapFilter.frequency.setValueAtTime(3100 - progress * 760, start);
    snapFilter.Q.setValueAtTime(8, start);

    snapGain.gain.setValueAtTime(0.0001, start);
    snapGain.gain.exponentialRampToValueAtTime(snapVolume, start + 0.003);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, start + decay);

    body.type = "triangle";
    body.frequency.setValueAtTime(340 - progress * 80, start);
    body.frequency.exponentialRampToValueAtTime(215 - progress * 42, start + 0.03);

    bodyGain.gain.setValueAtTime(0.0001, start);
    bodyGain.gain.exponentialRampToValueAtTime(bodyVolume, start + 0.006);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);

    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(output);
    body.connect(bodyGain);
    bodyGain.connect(output);
    snap.start(start);
    snap.stop(start + 0.09);
    body.start(start);
    body.stop(start + 0.07);
  }

  function playSlotBellStrike(
    ctx: AudioContext,
    output: GainNode,
    strikeStart: number,
    baseFrequency: number,
    volume: number,
    decayScale = 1,
  ) {
    const mallet = ctx.createOscillator();
    const malletGain = ctx.createGain();
    const malletFilter = ctx.createBiquadFilter();
    const partials = [
      { ratio: 1, gain: 0.16, decay: 0.42 },
      { ratio: 2.17, gain: 0.095, decay: 0.34 },
      { ratio: 2.93, gain: 0.068, decay: 0.28 },
      { ratio: 4.46, gain: 0.036, decay: 0.2 },
      { ratio: 6.21, gain: 0.02, decay: 0.15 },
    ];

    mallet.type = "square";
    mallet.frequency.setValueAtTime(3600, strikeStart);
    mallet.frequency.exponentialRampToValueAtTime(1250, strikeStart + 0.018);
    malletFilter.type = "highpass";
    malletFilter.frequency.setValueAtTime(1200, strikeStart);
    malletGain.gain.setValueAtTime(0.0001, strikeStart);
    malletGain.gain.exponentialRampToValueAtTime(0.045 * volume, strikeStart + 0.002);
    malletGain.gain.exponentialRampToValueAtTime(0.0001, strikeStart + 0.028);
    mallet.connect(malletFilter);
    malletFilter.connect(malletGain);
    malletGain.connect(output);
    mallet.start(strikeStart);
    mallet.stop(strikeStart + 0.04);

    partials.forEach((partial, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const frequency = baseFrequency * partial.ratio;

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, strikeStart);
      osc.detune.setValueAtTime(index % 2 === 0 ? 7 : -5, strikeStart);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(frequency, strikeStart);
      filter.Q.setValueAtTime(14 - index * 1.5, strikeStart);

      gain.gain.setValueAtTime(0.0001, strikeStart);
      gain.gain.exponentialRampToValueAtTime(partial.gain * volume, strikeStart + 0.006);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        strikeStart + partial.decay * decayScale,
      );

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      osc.start(strikeStart);
      osc.stop(strikeStart + partial.decay * decayScale + 0.05);
    });
  }

  function playFinalLatchAt(ctx: AudioContext, start: number) {
    const output = audioOutput(ctx);
    const latchOffsets = [0, 0.082, 0.154];

    latchOffsets.forEach((offset, index) => {
      const latchStart = start + offset;
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      const snapFilter = ctx.createBiquadFilter();
      const weight = 1 - index * 0.18;

      snap.type = "triangle";
      snap.frequency.setValueAtTime(760 - index * 70, latchStart);
      snap.frequency.exponentialRampToValueAtTime(285 - index * 22, latchStart + 0.045);

      snapFilter.type = "bandpass";
      snapFilter.frequency.setValueAtTime(1700 - index * 120, latchStart);
      snapFilter.Q.setValueAtTime(12, latchStart);

      snapGain.gain.setValueAtTime(0.0001, latchStart);
      snapGain.gain.exponentialRampToValueAtTime(0.22 * weight, latchStart + 0.005);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, latchStart + 0.066);

      snap.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(output);
      snap.start(latchStart);
      snap.stop(latchStart + 0.09);
    });

    [1046.5, 1318.51].forEach((frequency, index) => {
      const bellStart = start + 0.22 + index * 0.026;
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();

      bell.type = "sine";
      bell.frequency.setValueAtTime(frequency, bellStart);

      bellGain.gain.setValueAtTime(0.0001, bellStart);
      bellGain.gain.exponentialRampToValueAtTime(0.07, bellStart + 0.018);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, bellStart + 0.32);

      bell.connect(bellGain);
      bellGain.connect(output);
      bell.start(bellStart);
      bell.stop(bellStart + 0.36);
    });
  }

  function playSynthSpinSounds() {
    if (!soundEnabled) return;

    const ctx = ensureAudioContext();
    if (!ctx) return;

    const start = ctx.currentTime + 0.025;
    const duration = (WHEEL_STOP_MS - 300) / 1000;
    let elapsed = 0;

    while (elapsed < duration) {
      const progress = elapsed / duration;
      playTickAt(ctx, start + elapsed, progress);
      elapsed += 0.042 + Math.pow(progress, 2.25) * 0.22;
    }
  }

  function playSynthWinSound() {
    if (!soundEnabled) return;

    const ctx = ensureAudioContext();
    if (!ctx) return;

    const start = ctx.currentTime + 0.02;

    [0, 0.04, 0.08, 0.12, 0.16, 0.202, 0.246, 0.292, 0.34, 0.39, 0.444, 0.502, 0.564].forEach((offset, index) => {
      playHotBellGlintAt(ctx, start + offset, 3150 + (index % 5) * 260, 0.05);
    });

    playHotBellGlintAt(ctx, start + 0.66, 4186.01, 0.07);
    playHotBellGlintAt(ctx, start + 0.73, 4698.63, 0.05);
  }

  function playSpinSounds() {
    const usingSamples = playSampleSpinSounds();
    sampleSequenceActiveRef.current = usingSamples;

    if (!usingSamples) {
      playSynthSpinSounds();
    }
  }

  function playStopSound(delayMs = 0) {
    const ctx = ensureAudioContext();
    if (ctx) playFinalLatchAt(ctx, ctx.currentTime + delayMs / 1000 + 0.01);
  }

  function playWinSound() {
    if (!playSampleWinSound()) {
      playSynthWinSound();
    }
  }

  function spinWheel() {
    if (spinning) return;

    if (spinTimer.current) window.clearTimeout(spinTimer.current);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
    if (audioStartFrame.current) window.cancelAnimationFrame(audioStartFrame.current);
    if (winAudioFrame.current) window.cancelAnimationFrame(winAudioFrame.current);
    stopAudioSources();
    sampleSequenceActiveRef.current = false;

    const prizeIndex = pickWeightedPrizeIndex(PRIZES);
    const prize = PRIZES[prizeIndex];
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.42);
    const centerAngle = prizeIndex * sliceAngle + jitter;
    const currentRotation = ((rotation % 360) + 360) % 360;
    const targetRotation = (360 - centerAngle + 360) % 360;
    const suspenseTurns = 10 + pickRandomIndex(5);
    const travel = 360 * suspenseTurns + ((targetRotation - currentRotation + 360) % 360);
    const nextRotation = rotation + travel;
    const overshootRotation = nextRotation + sliceAngle * (0.24 + Math.random() * 0.13);
    setResult(null);
    setWheelSettling(false);
    setCelebrating(false);
    setSpinning(true);
    setRotation(overshootRotation);

    audioStartFrame.current = window.requestAnimationFrame(() => {
      playSpinSounds();

      settleTimer.current = window.setTimeout(() => {
        setWheelSettling(true);
        setRotation(nextRotation);
        if (!sampleSequenceActiveRef.current) {
          playStopSound(WHEEL_SETTLE_DURATION_MS);
        }
      }, WHEEL_SETTLE_MS);

      spinTimer.current = window.setTimeout(() => {
        const nextResult: SpinResult = {
          id: `${Date.now()}-${prize.id}`,
          prizeId: prize.id,
          prizeName: getPrizeName(prize, locale),
          createdAt: new Date().toISOString(),
        };

        stopAudioSources();
        setResult(nextResult);
        setSpinning(false);
        setWheelSettling(false);
        setCelebrating(true);

        winAudioFrame.current = window.requestAnimationFrame(() => {
          playWinSound();
        });
      }, WHEEL_RESULT_MS);
    });
  }

  function dismissWinningScreen() {
    if (!result || !celebrating) return false;

    if (winAudioFrame.current) window.cancelAnimationFrame(winAudioFrame.current);
    stopAudioSources();
    setCelebrating(false);
    setResult(null);

    return true;
  }

  spinWheelRef.current = spinWheel;
  dismissWinningScreenRef.current = dismissWinningScreen;

  async function enterFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browsers can block fullscreen if it is not triggered by a direct click.
    }
  }

  if (mounted && me && !canUseWheel) {
    return (
      <main className="agent-wheel-page">
        <section className="agent-wheel-access">
          <h1>{locale === "tr" ? "Yetki yok" : "No access"}</h1>
          <p>
            {locale === "tr"
              ? "Bu çark sayfasını admin, manager ve sales rolleri kullanabilir."
              : "This wheel page is available for admin, manager and sales roles."}
          </p>
        </section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="agent-wheel-page">
      <section className="agent-wheel-hero">
        <div className="hero-glow one" />
        <div className="hero-glow two" />
        <div className="hero-top">
          <div className="hero-actions">
            <button
              type="button"
              className={`sound-toggle ${soundEnabled ? "is-on" : "is-off"}`}
              onClick={toggleSound}
              aria-pressed={soundEnabled}
            >
              <span aria-hidden="true" />
              {soundEnabled
                ? locale === "tr"
                  ? "Ses açık"
                  : "Sound on"
                : locale === "tr"
                  ? "Ses kapalı"
                  : "Sound off"}
            </button>
            <button type="button" onClick={enterFullscreen}>
              {locale === "tr" ? "Tam ekran" : "Fullscreen"}
            </button>
          </div>
        </div>

        <div className="agent-wheel-layout">
          <section className="wheel-stage" aria-label={locale === "tr" ? "Hediye çarkı" : "Prize wheel"}>
            <div
              className={`wheel-pointer ${spinning ? "is-ticking" : ""} ${
                wheelSettling ? "is-catching" : ""
              } ${
                celebrating ? "is-settling" : ""
              }`}
            >
              <span />
            </div>
            <div className="wheel-shell">
              <div
                className={`wheel-bulbs ${spinning ? "is-spinning" : ""} ${
                  celebrating ? "is-celebrating" : ""
                }`}
                aria-hidden="true"
              >
                {Array.from({ length: 36 }).map((_, index) => (
                  <span
                    key={index}
                    style={
                      {
                        "--bulb-angle": `${index * 10}deg`,
                        "--chase-delay": `${index * -34}ms`,
                        "--celebration-delay": `${(index % 6) * 55}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
              <div
                className={`wheel-face ${spinning ? "is-spinning" : ""} ${
                  wheelSettling ? "is-wheel-settling" : ""
                }`}
                style={
                  {
                    "--counter-rotation": `${-rotation}deg`,
                    background: `conic-gradient(from ${-sliceAngle / 2}deg, ${wheelGradient})`,
                    transform: `rotate(${rotation}deg)`,
                  } as CSSProperties
                }
              >
                <div className="wheel-rim" />
                {PRIZES.map((prize, index) => {
                  const angle = index * sliceAngle;

                  return (
                    <div
                      key={prize.id}
                      className="wheel-prize"
                      style={
                        {
                          "--angle": `${angle}deg`,
                          "--upright-angle": `${-(rotation + angle)}deg`,
                          "--text": prize.textColor,
                        } as CSSProperties
                      }
                    >
                      <PrizeVisual prize={prize} />
                      <strong>{getPrizeName(prize, locale)}</strong>
                    </div>
                  );
                })}
                {PRIZES.map((prize, index) => (
                  <span
                    key={`${prize.id}-divider`}
                    className="wheel-divider"
                    style={{ transform: `rotate(${index * sliceAngle - sliceAngle / 2}deg)` }}
                  />
                ))}
                <div className="wheel-center">
                  <img src="/dndwhite.png" alt="DND Cyprus" />
                </div>
              </div>
            </div>
            <div className="wheel-action-deck">
              <button
                className="spin-button main-spin"
                type="button"
                onClick={spinWheel}
                disabled={spinning}
              >
                {spinning
                  ? locale === "tr"
                    ? "Çark dönüyor..."
                    : "Spinning..."
                  : locale === "tr"
                    ? "Çarkı Çevir"
                    : "Spin the Wheel"}
              </button>
            </div>
          </section>
        </div>

        {result && celebrating ? (
          <div
            className="hero-result-wrap is-celebrating"
            role="status"
            aria-live="polite"
            onClick={dismissWinningScreen}
          >
            <div className="celebration-sky" aria-hidden="true">
              {Array.from({ length: 7 }).map((_, index) => (
                <span
                  key={`firework-${index}`}
                  className="firework"
                  style={
                    {
                      "--firework-x": `${14 + ((index * 13) % 74)}%`,
                      "--firework-y": `${14 + ((index * 19) % 48)}%`,
                      "--firework-delay": `${index * 0.22}s`,
                      "--firework-scale": `${0.78 + (index % 4) * 0.14}`,
                      "--firework-scale-end": `${0.98 + (index % 4) * 0.16}`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <div className="coin-rain" aria-hidden="true">
              {Array.from({ length: 58 }).map((_, index) => (
                <span
                  key={`coin-${index}`}
                  className="coin"
                  style={
                    {
                      "--coin-left": `${(index * 17) % 101}%`,
                      "--coin-delay": `${(index % 19) * -0.18}s`,
                      "--coin-duration": `${2.7 + (index % 7) * 0.24}s`,
                      "--coin-size": `${12 + (index % 5) * 4}px`,
                      "--coin-drift": `${((index % 9) - 4) * 10}px`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
            <div className="result-panel">
              <div className="burst" aria-hidden="true">
                {Array.from({ length: 24 }).map((_, index) => (
                  <span
                    key={index}
                    style={{ "--burst-angle": `${index * 15}deg` } as CSSProperties}
                  />
                ))}
              </div>
              <div className="result-prize-art" aria-hidden="true">
                {winningPrize ? <PrizeVisual prize={winningPrize} /> : null}
              </div>
              <span>{locale === "tr" ? "Kazanan hediye" : "Winning prize"}</span>
              <h3>{result.prizeName}</h3>
              <p>
                {winningPrize?.id === "extra_roll"
                  ? locale === "tr"
                    ? "Ekstra çevirme hakkı kazandınız. Paneli kapatıp tekrar çevirin."
                    : "You won an extra roll. Close this panel and spin again."
                  : locale === "tr"
                    ? "Tebrikler, hediye kazandınız!"
                    : "Congratulations, you won this prize!"}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .agent-wheel-page {
    width: 100%;
    height: 100vh;
    min-height: 100vh;
    display: grid;
    gap: 0;
    overflow: hidden;
    color: #f8fafc;
    background:
      linear-gradient(180deg, rgba(3, 5, 9, 0.16), rgba(3, 5, 9, 0.9)),
      url("/images/agent-wheel/luxury-stage.png") center / cover fixed,
      linear-gradient(135deg, #05070b 0%, #0f1724 45%, #030407 100%);
    padding: 0;
  }

  .agent-wheel-hero {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100vh;
    min-height: 100vh;
    border: 0;
    border-radius: 0;
    background:
      radial-gradient(circle at 34% 52%, rgba(248, 212, 119, 0.13), transparent 30%),
      radial-gradient(circle at 92% 14%, rgba(255, 215, 112, 0.13), transparent 24%),
      linear-gradient(180deg, rgba(4, 7, 13, 0.1), rgba(4, 7, 13, 0.82));
    box-shadow: none;
    padding: clamp(14px, 1.8vw, 28px);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    align-content: stretch;
  }

  .agent-wheel-hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 42%, transparent 0 22%, rgba(0, 0, 0, 0.12) 50%, rgba(0, 0, 0, 0.58) 100%),
      linear-gradient(90deg, rgba(0, 0, 0, 0.14), transparent 38%, rgba(0, 0, 0, 0.22));
    pointer-events: none;
  }

  .hero-glow {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(2px);
    opacity: 0.7;
  }

  .hero-glow.one {
    width: 280px;
    height: 280px;
    left: -90px;
    top: -80px;
    background: radial-gradient(circle, rgba(248, 212, 119, 0.2), transparent 70%);
  }

  .hero-glow.two {
    width: 340px;
    height: 340px;
    right: -140px;
    bottom: -140px;
    background: radial-gradient(circle, rgba(79, 70, 229, 0.24), transparent 70%);
  }

  .hero-top,
  .agent-wheel-layout,
  .hero-result-wrap {
    position: relative;
    z-index: 1;
  }

  .hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 16px;
    min-height: 48px;
    margin-bottom: 0;
  }

  .hero-top button {
    border: 1px solid rgba(248, 212, 119, 0.34);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff7d6;
    font-weight: 900;
    padding: 12px 16px;
    cursor: pointer;
  }

  .hero-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .sound-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .sound-toggle span {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 14px rgba(34, 197, 94, 0.8);
  }

  .sound-toggle.is-off {
    color: #cbd5e1;
    border-color: rgba(148, 163, 184, 0.36);
  }

  .sound-toggle.is-off span {
    background: #94a3b8;
    box-shadow: none;
  }

  .hero-top button:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }

  .result-panel span {
    display: block;
    color: #f8d477;
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .agent-wheel-layout {
    display: grid;
    grid-template-columns: 1fr;
    justify-items: center;
    width: min(920px, 100%);
    margin: 0 auto;
    gap: clamp(12px, 1.8vw, 22px);
    align-items: center;
    min-height: 0;
  }

  .wheel-stage {
    position: relative;
    width: min(100%, 880px);
    height: 100%;
    min-height: 0;
    display: grid;
    align-content: center;
    place-items: center;
    gap: clamp(12px, 1.6vw, 20px);
    padding: 0 10px 18px;
  }

  .wheel-shell {
    --bulb-radius: clamp(232px, 31.5vw, 335px);
    width: min(100%, 710px, calc(100vh - 170px));
    aspect-ratio: 1;
    border-radius: 999px;
    position: relative;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle, rgba(255, 255, 255, 0.32), transparent 8%),
      linear-gradient(145deg, #fff1a8 0%, #d8a334 22%, #69430d 46%, #130d07 55%, #f6c95c 100%);
    padding: clamp(14px, 1.8vw, 22px);
    box-shadow:
      0 36px 92px rgba(0, 0, 0, 0.64),
      0 0 100px rgba(248, 212, 119, 0.22),
      inset 0 0 18px rgba(255, 255, 255, 0.2);
  }

  .wheel-bulbs {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
  }

  .wheel-bulbs span {
    position: absolute;
    left: 50%;
    top: 50%;
    width: clamp(9px, 1vw, 15px);
    height: clamp(9px, 1vw, 15px);
    border-radius: 999px;
    background:
      radial-gradient(circle at 42% 35%, #ffffff 0 18%, #fff4bc 22% 44%, #f2bd3c 48% 72%, #8a5712 100%);
    box-shadow:
      0 0 10px rgba(255, 244, 188, 0.95),
      0 0 20px rgba(248, 212, 119, 0.68),
      0 0 34px rgba(248, 212, 119, 0.36);
    opacity: 0.78;
    transform:
      translate(-50%, -50%)
      rotate(var(--bulb-angle))
      translateY(calc(-1 * var(--bulb-radius)));
  }

  .wheel-bulbs.is-spinning span {
    animation: bulb-chase 0.86s linear infinite;
    animation-delay: var(--chase-delay);
  }

  .wheel-bulbs.is-celebrating span {
    animation: bulb-celebrate 0.48s ease-in-out infinite;
    animation-delay: var(--celebration-delay);
  }

  .wheel-shell::before,
  .wheel-shell::after {
    content: "";
    position: absolute;
    border-radius: inherit;
    pointer-events: none;
  }

  .wheel-shell::before {
    inset: -8px;
    background:
      repeating-conic-gradient(from -4deg, #fff7bf 0deg 2.2deg, transparent 2.2deg 14deg),
      conic-gradient(from 0deg, rgba(248, 212, 119, 0.55), rgba(103, 65, 12, 0.1), rgba(248, 212, 119, 0.55));
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 33px), #000 calc(100% - 31px), #000 calc(100% - 18px), transparent calc(100% - 14px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 33px), #000 calc(100% - 31px), #000 calc(100% - 18px), transparent calc(100% - 14px));
    filter: drop-shadow(0 0 14px rgba(248, 212, 119, 0.72));
    z-index: 1;
  }

  .wheel-shell::after {
    inset: 8px;
    border: 2px solid rgba(255, 238, 174, 0.54);
    box-shadow:
      inset 0 0 0 8px rgba(0, 0, 0, 0.42),
      inset 0 0 34px rgba(248, 212, 119, 0.2);
    z-index: 2;
  }

  .wheel-face {
    position: relative;
    z-index: 3;
    width: 100%;
    height: 100%;
    border-radius: 999px;
    overflow: hidden;
    border: 12px solid #050608;
    transition: transform ${WHEEL_MAIN_SPIN_MS / 1000}s cubic-bezier(0.06, 0.82, 0.1, 1);
    box-shadow:
      inset 0 0 0 5px rgba(255, 225, 138, 0.9),
      inset 0 0 0 12px rgba(10, 10, 10, 0.46),
      inset 0 0 54px rgba(0, 0, 0, 0.46);
  }

  .wheel-face.is-spinning {
    will-change: transform;
  }

  .wheel-face.is-wheel-settling {
    transition: transform ${WHEEL_SETTLE_DURATION_MS / 1000}s cubic-bezier(0.18, 1.45, 0.32, 1);
  }

  .wheel-face.is-wheel-settling .wheel-prize,
  .wheel-face.is-wheel-settling .wheel-center {
    transition: transform ${WHEEL_SETTLE_DURATION_MS / 1000}s cubic-bezier(0.18, 1.45, 0.32, 1);
  }

  .wheel-rim {
    position: absolute;
    inset: 10px;
    z-index: 0;
    border-radius: 999px;
    border: 2px solid rgba(255, 234, 169, 0.68);
    box-shadow:
      inset 0 0 22px rgba(0, 0, 0, 0.42),
      0 0 16px rgba(248, 212, 119, 0.25);
  }

  .wheel-divider {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;
    width: 2px;
    height: 50%;
    background: linear-gradient(to bottom, rgba(248, 212, 119, 0.95), rgba(248, 212, 119, 0));
    transform-origin: top center;
  }

  .wheel-prize {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 6;
    width: 104px;
    isolation: isolate;
    display: grid;
    justify-items: center;
    gap: 7px;
    color: var(--text);
    text-align: center;
    transform:
      translate(-50%, -50%)
      rotate(var(--angle))
      translateY(clamp(-186px, -18.5vw, -138px))
      rotate(var(--upright-angle));
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
    transition: transform ${WHEEL_MAIN_SPIN_MS / 1000}s cubic-bezier(0.06, 0.82, 0.1, 1);
  }

  .wheel-prize strong {
    position: relative;
    z-index: 2;
    color: #fff8db;
    font-size: clamp(10px, 0.98vw, 15px);
    line-height: 1.08;
    max-width: 104px;
    font-weight: 1000;
    overflow-wrap: anywhere;
    -webkit-text-stroke: 0.35px rgba(0, 0, 0, 0.75);
    text-shadow:
      0 1px 0 rgba(0, 0, 0, 0.9),
      0 2px 8px rgba(0, 0, 0, 0.78),
      0 0 14px rgba(0, 0, 0, 0.5);
  }

  .wheel-center {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 7;
    width: clamp(148px, 18vw, 196px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%) rotate(var(--counter-rotation, 0deg));
    transition: transform ${WHEEL_MAIN_SPIN_MS / 1000}s cubic-bezier(0.06, 0.82, 0.1, 1);
    border-radius: 999px;
    display: grid;
    place-items: center;
    align-content: center;
    border: 8px solid rgba(248, 212, 119, 0.94);
    background:
      radial-gradient(circle at 50% 24%, rgba(255, 255, 255, 0.14), transparent 25%),
      linear-gradient(145deg, #0a1018, #050608);
    box-shadow:
      0 0 0 7px rgba(0, 0, 0, 0.5),
      0 0 30px rgba(248, 212, 119, 0.36);
  }

  .wheel-center img {
    width: min(72%, 138px);
    height: auto;
    display: block;
    filter:
      drop-shadow(0 2px 8px rgba(255, 255, 255, 0.18))
      drop-shadow(0 10px 16px rgba(0, 0, 0, 0.42));
  }

  .wheel-pointer {
    position: absolute;
    top: 8px;
    left: 50%;
    z-index: 12;
    transform: translateX(-50%);
    transform-origin: 50% 14px;
    width: 54px;
    height: 76px;
    display: grid;
    place-items: start center;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.48));
  }

  .wheel-pointer span {
    width: 44px;
    height: 62px;
    transform-origin: 50% 13px;
    clip-path: polygon(50% 100%, 10% 32%, 28% 0, 72% 0, 90% 32%);
    background: linear-gradient(145deg, #ffe69a, #d79625 52%, #6d4410);
    border: 2px solid rgba(255, 255, 255, 0.35);
  }

  .wheel-pointer::after {
    content: "";
    position: absolute;
    top: 8px;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: radial-gradient(circle, #fff 0 18%, #ffe69a 20% 52%, #a76c13 54%);
    box-shadow: 0 0 26px rgba(248, 212, 119, 0.95);
  }

  .wheel-pointer.is-ticking {
    animation: pointer-tick ${WHEEL_MAIN_SPIN_MS / 1000}s linear 1;
  }

  .wheel-pointer.is-ticking span {
    animation: pointer-tip-flex ${WHEEL_MAIN_SPIN_MS / 1000}s linear 1;
  }

  .wheel-pointer.is-catching {
    animation: pointer-catch ${WHEEL_SETTLE_DURATION_MS / 1000}s cubic-bezier(0.18, 1.45, 0.32, 1) 1;
  }

  .wheel-pointer.is-settling {
    animation: pointer-settle 0.9s cubic-bezier(0.16, 0.88, 0.26, 1) 1;
  }

  .wheel-action-deck {
    position: relative;
    z-index: 5;
    display: grid;
    justify-items: center;
    width: min(100%, 560px);
    margin-top: clamp(-4px, -0.4vw, 0px);
  }

  .spin-button {
    min-height: 74px;
    background: linear-gradient(135deg, #f8d477, #d79526 55%, #8a5d1b) !important;
    color: #15100a !important;
    border: 0 !important;
    border-radius: 999px;
    cursor: pointer;
    font-size: clamp(22px, 2vw, 34px);
    font-weight: 1000;
    letter-spacing: 0;
    text-transform: uppercase;
    box-shadow:
      0 20px 44px rgba(215, 149, 38, 0.34),
      0 0 34px rgba(248, 212, 119, 0.26),
      inset 0 1px 0 rgba(255, 255, 255, 0.44);
  }

  .spin-button:disabled {
    opacity: 0.72;
    cursor: wait;
  }

  .main-spin {
    width: min(100%, 520px);
    padding: 0 34px;
  }

  .hero-result-wrap {
    pointer-events: none;
  }

  .hero-result-wrap.is-celebrating {
    pointer-events: auto;
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    justify-items: center;
    place-items: center;
    padding: 24px;
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 44%, rgba(248, 212, 119, 0.24), transparent 28%),
      radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.2), rgba(3, 7, 18, 0.72) 68%);
    cursor: pointer;
    animation: celebration-backdrop 8.2s ease-out both;
  }

  .result-panel {
    position: relative;
    overflow: hidden;
    min-height: 126px;
    border-radius: 18px;
    padding: 18px;
  }

  .result-panel {
    border: 1px solid rgba(74, 222, 128, 0.34);
    background: linear-gradient(135deg, rgba(22, 163, 74, 0.22), rgba(248, 212, 119, 0.12));
  }

  .hero-result-wrap.is-celebrating .result-panel {
    width: min(680px, calc(100vw - 36px));
    min-height: 430px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 10px;
    text-align: center;
    border-radius: 28px;
    border-color: rgba(248, 212, 119, 0.58);
    background:
      radial-gradient(circle at 50% 18%, rgba(255, 244, 188, 0.24), transparent 25%),
      linear-gradient(145deg, rgba(7, 11, 18, 0.86), rgba(15, 23, 42, 0.72)),
      linear-gradient(135deg, rgba(22, 163, 74, 0.18), rgba(248, 212, 119, 0.2));
    box-shadow:
      0 40px 120px rgba(0, 0, 0, 0.62),
      0 0 90px rgba(248, 212, 119, 0.28),
      inset 0 0 0 1px rgba(255, 255, 255, 0.14);
    animation: prize-reveal 0.72s cubic-bezier(0.16, 1.1, 0.22, 1) both;
  }

  .result-panel h3 {
    margin: 8px 0 5px;
    color: #fff;
    font-size: 30px;
  }

  .hero-result-wrap.is-celebrating .result-panel h3 {
    margin: 0;
    color: #fff8db;
    font-size: clamp(42px, 5vw, 78px);
    line-height: 0.94;
    text-transform: uppercase;
    text-shadow:
      0 4px 0 rgba(0, 0, 0, 0.72),
      0 0 30px rgba(248, 212, 119, 0.52);
  }

  .result-panel p {
    margin: 0;
    color: #dbeafe;
    line-height: 1.45;
  }

  .hero-result-wrap.is-celebrating .result-panel p {
    color: #fef3c7;
    font-size: clamp(17px, 1.7vw, 24px);
    font-weight: 900;
    text-transform: uppercase;
  }

  .result-prize-art {
    display: none;
  }

  .hero-result-wrap.is-celebrating .result-prize-art {
    position: relative;
    z-index: 2;
    display: grid;
    place-items: center;
    width: min(300px, 48vw);
    height: min(210px, 32vw);
    margin-bottom: 4px;
    animation: prize-pop 1.15s cubic-bezier(0.18, 1.28, 0.32, 1) both;
  }

  .hero-result-wrap.is-celebrating .result-prize-art .prize-art {
    width: min(270px, 42vw);
    height: min(180px, 28vw);
    border-radius: 24px;
    filter:
      drop-shadow(0 22px 22px rgba(0, 0, 0, 0.62))
      drop-shadow(0 0 34px rgba(248, 212, 119, 0.42));
  }

  .celebration-sky,
  .coin-rain {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .celebration-sky {
    z-index: 0;
  }

  .coin-rain {
    z-index: 3;
  }

  .burst {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .burst span {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2px;
    height: 54px;
    transform-origin: center 0;
    transform: rotate(var(--burst-angle, 0deg));
    background: linear-gradient(to bottom, rgba(248, 212, 119, 0.9), transparent);
    animation: burst 1.8s ease-out infinite;
  }

  .hero-result-wrap.is-celebrating .burst span {
    width: 4px;
    height: 190px;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(248, 212, 119, 0.7), transparent);
    animation: burst 1.1s ease-out infinite;
  }

  .firework {
    position: absolute;
    left: var(--firework-x);
    top: var(--firework-y);
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #fff8db;
    box-shadow:
      0 -70px 0 #facc15,
      50px -50px 0 #ffffff,
      72px 0 0 #f97316,
      50px 50px 0 #facc15,
      0 72px 0 #ffffff,
      -50px 50px 0 #22c55e,
      -72px 0 0 #facc15,
      -50px -50px 0 #ffffff;
    transform: translate(-50%, -50%) scale(0);
    animation: firework-pop 1.45s ease-out infinite;
    animation-delay: var(--firework-delay);
    opacity: 0;
  }

  .coin {
    position: absolute;
    left: var(--coin-left);
    top: -12vh;
    width: var(--coin-size);
    aspect-ratio: 1;
    border-radius: 999px;
    background:
      radial-gradient(circle at 34% 28%, #fff8db 0 13%, transparent 14%),
      radial-gradient(circle, #fde68a 0 34%, #eab308 36% 64%, #92400e 68% 100%);
    box-shadow:
      inset 0 0 0 2px rgba(255, 255, 255, 0.32),
      0 0 14px rgba(250, 204, 21, 0.42);
    animation: coin-rain var(--coin-duration) linear infinite;
    animation-delay: var(--coin-delay);
  }

  .agent-wheel-access {
    width: min(1440px, calc(100% - 32px));
    margin: 0 auto;
    border: 1px solid rgba(248, 212, 119, 0.2);
    border-radius: 22px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025)),
      rgba(7, 11, 18, 0.88);
    color: #f8fafc;
    padding: clamp(18px, 2vw, 24px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  }

  .prize-art {
    position: relative;
    z-index: 2;
    display: inline-grid;
    place-items: center;
    width: 86px;
    height: 62px;
    flex: 0 0 auto;
  }

  .wheel-prize .prize-art {
    width: clamp(42px, 4.5vw, 62px);
    height: clamp(34px, 3.7vw, 50px);
  }

  .prize-art.image {
    border-radius: 12px;
    overflow: hidden;
    background-position: center;
    background-repeat: no-repeat;
    filter: drop-shadow(0 11px 12px rgba(0, 0, 0, 0.46));
    transform: translateZ(0);
  }

  .prize-art.image.cover {
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
  }

  .extra-roll-art {
    border-radius: 18px;
    border: 2px solid rgba(248, 212, 119, 0.88);
    color: #fff8db;
    background:
      radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.22), transparent 36%),
      linear-gradient(145deg, #111827, #05070b);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.12),
      0 12px 18px rgba(0, 0, 0, 0.42),
      0 0 22px rgba(248, 212, 119, 0.32);
    font-size: clamp(22px, 2.2vw, 38px);
    font-weight: 1000;
    letter-spacing: 0;
  }

  .agent-wheel-access h1 {
    margin: 0 0 8px;
  }

  .agent-wheel-access p {
    margin: 0;
    color: var(--text-secondary);
  }

  @keyframes burst {
    0% {
      opacity: 0;
      transform: rotate(var(--burst-angle, 0deg)) translateY(20px) scaleY(0.18);
    }
    35% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(var(--burst-angle, 0deg)) translateY(-170px) scaleY(1);
    }
  }

  @keyframes celebration-backdrop {
    0% {
      opacity: 0;
      backdrop-filter: blur(0);
    }
    10%,
    88% {
      opacity: 1;
      backdrop-filter: blur(2px);
    }
    100% {
      opacity: 0.92;
      backdrop-filter: blur(1px);
    }
  }

  @keyframes prize-reveal {
    0% {
      opacity: 0;
      transform: translateY(34px) scale(0.7);
      filter: brightness(1.8) blur(4px);
    }
    48% {
      opacity: 1;
      transform: translateY(-10px) scale(1.06);
      filter: brightness(1.25) blur(0);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: brightness(1);
    }
  }

  @keyframes prize-pop {
    0% {
      opacity: 0;
      transform: translateY(24px) scale(0.58) rotate(-7deg);
    }
    45% {
      opacity: 1;
      transform: translateY(-12px) scale(1.12) rotate(3deg);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1) rotate(0deg);
    }
  }

  @keyframes firework-pop {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0);
      filter: blur(0);
    }
    15% {
      opacity: 1;
    }
    55% {
      opacity: 0.95;
      transform: translate(-50%, -50%) scale(var(--firework-scale));
      filter: blur(0);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(var(--firework-scale-end));
      filter: blur(3px);
    }
  }

  @keyframes coin-rain {
    0% {
      opacity: 0;
      transform: translate3d(0, -12vh, 0) rotateY(0deg) rotateZ(0deg);
    }
    8% {
      opacity: 1;
    }
    100% {
      opacity: 0.95;
      transform:
        translate3d(var(--coin-drift), 116vh, 0)
        rotateY(1080deg)
        rotateZ(420deg);
    }
  }

  @keyframes bulb-chase {
    0%,
    100% {
      opacity: 0.34;
      filter: brightness(0.72) saturate(0.9);
      box-shadow:
        0 0 4px rgba(255, 244, 188, 0.32),
        0 0 10px rgba(248, 212, 119, 0.2);
    }
    18% {
      opacity: 1;
      filter: brightness(1.85) saturate(1.2);
      box-shadow:
        0 0 12px rgba(255, 255, 255, 0.98),
        0 0 26px rgba(248, 212, 119, 0.92),
        0 0 48px rgba(248, 212, 119, 0.54);
    }
    42% {
      opacity: 0.7;
      filter: brightness(1.08) saturate(1);
      box-shadow:
        0 0 8px rgba(255, 244, 188, 0.72),
        0 0 18px rgba(248, 212, 119, 0.48);
    }
  }

  @keyframes bulb-celebrate {
    0%,
    100% {
      opacity: 0.48;
      filter: brightness(0.86) saturate(0.95);
      box-shadow:
        0 0 6px rgba(255, 244, 188, 0.46),
        0 0 14px rgba(248, 212, 119, 0.34);
    }
    50% {
      opacity: 1;
      filter: brightness(2.35) saturate(1.35);
      box-shadow:
        0 0 16px rgba(255, 255, 255, 1),
        0 0 34px rgba(248, 212, 119, 1),
        0 0 70px rgba(248, 212, 119, 0.72);
    }
  }

  @keyframes pointer-tick {
    0% {
      transform: translateX(-50%) rotate(0deg);
    }
    2%,
    7%,
    13%,
    20%,
    29%,
    41%,
    56%,
    75% {
      transform: translateX(-50%) rotate(-7deg);
    }
    4%,
    10%,
    16%,
    24%,
    34%,
    48%,
    65%,
    84% {
      transform: translateX(-50%) rotate(4deg);
    }
    6%,
    12%,
    18%,
    27%,
    38%,
    53%,
    70%,
    91% {
      transform: translateX(-50%) rotate(-2deg);
    }
    100% {
      transform: translateX(-50%) rotate(0deg);
    }
  }

  @keyframes pointer-tip-flex {
    0% {
      transform: scaleY(1) skewX(0deg);
    }
    2%,
    7%,
    13%,
    20%,
    29%,
    41%,
    56%,
    75% {
      transform: scaleY(0.98) skewX(-3deg);
    }
    4%,
    10%,
    16%,
    24%,
    34%,
    48%,
    65%,
    84% {
      transform: scaleY(1.02) skewX(2deg);
    }
    100% {
      transform: scaleY(1) skewX(0deg);
    }
  }

  @keyframes pointer-catch {
    0% {
      transform: translateX(-50%) rotate(-9deg);
    }
    22% {
      transform: translateX(-50%) rotate(6deg);
    }
    42% {
      transform: translateX(-50%) rotate(-4deg);
    }
    66% {
      transform: translateX(-50%) rotate(2deg);
    }
    100% {
      transform: translateX(-50%) rotate(0deg);
    }
  }

  @keyframes pointer-settle {
    0% {
      transform: translateX(-50%) rotate(-8deg);
    }
    25% {
      transform: translateX(-50%) rotate(5deg);
    }
    48% {
      transform: translateX(-50%) rotate(-3deg);
    }
    72% {
      transform: translateX(-50%) rotate(1.4deg);
    }
    100% {
      transform: translateX(-50%) rotate(0deg);
    }
  }

  @media (max-width: 1120px) {
    .agent-wheel-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .agent-wheel-hero {
      border-radius: 18px;
    }

    .hero-top {
      display: grid;
    }

    .wheel-shell {
      --bulb-radius: clamp(180px, 46vw, 206px);
      width: min(100%, 430px, calc(100vh - 150px));
    }

    .wheel-prize {
      width: 96px;
      gap: 4px;
      transform:
        translate(-50%, -50%)
        rotate(var(--angle))
        translateY(clamp(-112px, -23vw, -86px))
        rotate(var(--upright-angle));
    }

    .wheel-prize strong {
      font-size: 11px;
    }

    .wheel-prize .prize-art {
      transform: scale(0.68);
    }

    .wheel-center {
      width: 126px;
      border-width: 5px;
    }

    .wheel-center img {
      width: 72%;
    }

    .wheel-pointer {
      top: 6px;
      width: 42px;
      height: 58px;
    }

    .wheel-pointer span {
      width: 34px;
      height: 48px;
    }

    .wheel-pointer::after {
      top: 7px;
      width: 16px;
      height: 16px;
    }

    .hero-result-wrap.is-celebrating {
      padding: 14px;
    }

    .hero-result-wrap.is-celebrating .result-panel {
      min-height: 390px;
      border-radius: 20px;
      padding: 18px;
    }

    .hero-result-wrap.is-celebrating .result-panel h3 {
      font-size: clamp(32px, 11vw, 52px);
    }

    .hero-result-wrap.is-celebrating .result-prize-art {
      width: min(250px, 72vw);
      height: min(170px, 46vw);
    }

    .hero-result-wrap.is-celebrating .result-prize-art .prize-art {
      width: min(230px, 66vw);
      height: min(150px, 42vw);
    }

  }
`;
