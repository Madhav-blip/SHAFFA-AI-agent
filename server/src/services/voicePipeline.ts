/**
 * Voice pipeline — wake word → STT → AI reasoning → tool execution → TTS.
 *
 * Runtime layout:
 *   [browser/desktop client]                     [server]
 *   wake-word engine (porcupine / openWakeWord)
 *        └─ opens mic stream ──► WebSocket ──► STT (whisper.cpp local or
 *                                              Deepgram streaming)
 *                                                └─ transcript ──► runAgentPipeline()
 *                                                                    └─ tool calls
 *                                              TTS (ElevenLabs / Piper local)
 *        ◄─ audio chunks ◄── WebSocket ◄────────┘
 *
 * The web client in src/components/shell/CommandBar.tsx uses the browser
 * SpeechRecognition + speechSynthesis APIs as a zero-dependency fallback of
 * this same pipeline.
 */

export interface VoiceSession {
  id: string;
  state: "waking" | "listening" | "reasoning" | "speaking" | "idle";
  startedAt: number;
}

const sessions = new Map<string, VoiceSession>();

export const voicePipeline = {
  open(id: string): VoiceSession {
    const session: VoiceSession = { id, state: "waking", startedAt: Date.now() };
    sessions.set(id, session);
    return session;
  },

  /** Called by the STT bridge when a final transcript arrives. */
  async onTranscript(id: string, transcript: string, reason: (t: string) => Promise<{ text: string }>) {
    const session = sessions.get(id);
    if (!session) throw new Error("no session");
    session.state = "reasoning";
    const result = await reason(transcript);
    session.state = "speaking";
    // hand result.text to the TTS provider; stream chunks back over the socket
    return result;
  },

  close(id: string) {
    sessions.delete(id);
  },
};
