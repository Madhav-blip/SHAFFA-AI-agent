/**
 * Voice output for SHAFFA — prefers a sweet, clear female English voice.
 * Browsers expose different voice sets (Windows: Zira/Jenny/Heera,
 * Chrome online: "Google UK English Female", mac: Samantha/Karen…),
 * so voices are scored rather than hard-coded.
 */

let cached: SpeechSynthesisVoice | null = null;
let hooked = false;

const FEMALE_NAMES = [
  "zira", "jenny", "aria", "heera", "kalpana", "swara", "neerja",
  "samantha", "karen", "serena", "natasha", "emma", "ava", "sonia", "libby",
];

function score(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let s = 0;
  if (name.includes("female")) s += 9;
  if (name.includes("male") && !name.includes("female")) s -= 9;
  if (FEMALE_NAMES.some((f) => name.includes(f))) s += 7;
  if (name.includes("natural") || name.includes("online")) s += 3; // neural voices are far clearer
  if (name.includes("google")) s += 3;
  if (lang.startsWith("en-in")) s += 4;
  else if (lang.startsWith("en-gb") || lang.startsWith("en-us")) s += 3;
  else if (lang.startsWith("en")) s += 1;
  else s -= 6;
  return s;
}

export function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const synth = window.speechSynthesis;
  if (!hooked) {
    hooked = true;
    // Voice list loads async in Chrome — re-pick once it arrives.
    synth.addEventListener?.("voiceschanged", () => {
      cached = null;
    });
  }
  if (cached) return cached;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  cached = [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
  return cached;
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = 1.0; // unhurried and clear
  utterance.pitch = 1.12; // a touch brighter
  utterance.volume = 1;
  synth.speak(utterance);
}
