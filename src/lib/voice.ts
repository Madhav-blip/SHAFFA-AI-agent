/**
 * Voice output for SHAFFA — prefers a sweet, clear female English voice.
 * Browsers expose different voice sets (Windows: Zira/Jenny/Heera,
 * Chrome online: "Google UK English Female", mac: Samantha/Karen…),
 * so voices are scored rather than hard-coded.
 *
 * Robustness matters here: browsers block speechSynthesis until a user
 * gesture (autoplay policy), load voices asynchronously, and Chrome pauses
 * the queue on its own. We prime on first interaction, wait for voices,
 * and nudge the queue with resume().
 */

let cached: SpeechSynthesisVoice | null = null;
let hooked = false;
let primed = false;

/** Mic capture is muted until this epoch so SHAFFA never hears herself. */
let muteUntil = 0;
export function micMuted(): boolean {
  return Date.now() < muteUntil;
}

const FEMALE_NAMES = [
  "zira", "jenny", "aria", "heera", "kalpana", "swara", "neerja",
  "samantha", "karen", "serena", "natasha", "emma", "ava", "sonia", "libby",
];

function score(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let s = 0;
  // Local (offline) voices are the ones that reliably produce audio. Network
  // voices like "Google … Female" throw synthesis-failed without connectivity,
  // so they must never outrank a working local voice.
  if (v.localService) s += 12;
  else s -= 8;
  if (name.includes("female")) s += 9;
  if (name.includes("male") && !name.includes("female")) s -= 9;
  if (FEMALE_NAMES.some((f) => name.includes(f))) s += 7;
  if (name.includes("natural") || name.includes("neural")) s += 4; // clearer, still local on Win11
  if (lang.startsWith("en-in")) s += 4;
  else if (lang.startsWith("en-gb") || lang.startsWith("en-us")) s += 3;
  else if (lang.startsWith("en")) s += 1;
  else s -= 6;
  return s;
}

function ensureHook(synth: SpeechSynthesis): void {
  if (hooked) return;
  hooked = true;
  synth.addEventListener?.("voiceschanged", () => {
    cached = null; // re-pick once the real voice list arrives
  });
}

export function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const synth = window.speechSynthesis;
  ensureHook(synth);
  if (cached) return cached;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  cached = [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
  return cached;
}

/**
 * Warm up the speech engine inside a user gesture. Browsers require a prior
 * interaction before programmatic speech (e.g. wake-word or automation
 * triggered) is allowed to play. Call this from a click/keydown handler.
 */
export function primeVoice(): void {
  if (primed || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  primed = true;
  try {
    const synth = window.speechSynthesis;
    ensureHook(synth);
    synth.getVoices();
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    synth.speak(warm);
    synth.resume();
  } catch {
    /* engine unavailable — speak() will no-op gracefully */
  }
}

function utter(synth: SpeechSynthesis, text: string, useDefaultVoice = false): void {
  const words = text.split(/\s+/).length;
  try {
    if (synth.speaking || synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // First attempt uses the scored (local, female) voice; a retry drops the
    // explicit voice so the browser falls back to its guaranteed default.
    const voice = useDefaultVoice ? null : pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 1.0; // unhurried and clear
    u.pitch = 1.1; // a touch brighter
    u.volume = 1;
    // Mute the mic only while audio is actually playing. If TTS never starts
    // (no OS voice / blocked), onstart won't fire and the short bridge below
    // expires, keeping the mic responsive.
    u.onstart = () => {
      muteUntil = Date.now() + Math.min(22_000, 900 + words * 360);
    };
    u.onend = () => {
      muteUntil = Math.min(muteUntil, Date.now() + 250);
    };
    u.onerror = (e) => {
      // "interrupted"/"canceled" are benign — they fire when we replace one
      // utterance with the next. Only real failures matter.
      if (e.error === "interrupted" || e.error === "canceled") return;
      if (e.error === "synthesis-failed" && !useDefaultVoice) {
        // The selected voice can't synthesize (often a network voice offline).
        // Retry once with the browser's default local voice.
        cached = null;
        setTimeout(() => utter(synth, text, true), 60);
        return;
      }
      muteUntil = 0;
      if (process.env.NODE_ENV !== "production") console.warn("[shaffa tts] error:", e.error);
    };
    synth.speak(u);
    // Chrome occasionally starts paused; nudge it.
    setTimeout(() => {
      try { synth.resume(); } catch { /* ignore */ }
    }, 120);
  } catch {
    muteUntil = 0;
  }
}

/** Diagnostics: list the voices the browser exposes and which one we pick. */
export function voiceReport(): { picked: string | null; total: number; voices: string[] } {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return { picked: null, total: 0, voices: [] };
  const voices = window.speechSynthesis.getVoices();
  const picked = pickVoice();
  return {
    picked: picked ? `${picked.name} (${picked.lang}, ${picked.localService ? "local" : "network"})` : null,
    total: voices.length,
    voices: voices.map((v) => `${v.name} [${v.lang}${v.localService ? "" : ", network"}]`),
  };
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return;
  const synth = window.speechSynthesis;
  ensureHook(synth);

  // Short bridge so the mic ignores the instant before audio begins; onstart
  // extends this for the real duration, onend/onerror release it. Bounded, so
  // a misbehaving TTS engine can never permanently deafen the recognizer.
  muteUntil = Date.now() + 900;

  if (synth.getVoices().length > 0) {
    utter(synth, clean);
    return;
  }
  // Voices not loaded yet (first call in Chrome) — speak once they arrive,
  // with a short fallback so we never hang silently.
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    utter(synth, clean);
  };
  synth.addEventListener?.("voiceschanged", go, { once: true } as AddEventListenerOptions);
  setTimeout(go, 300);
}
