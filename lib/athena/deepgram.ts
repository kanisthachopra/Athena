import "server-only";

export const audioTypes = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/x-wav"];
export class VoiceError extends Error {
  constructor(message: string, readonly code: "unavailable" | "no_speech" | "invalid_audio" = "unavailable") { super(message); }
}

export async function transcribeAudio(audio: Uint8Array, contentType: string) {
  if (!audioTypes.includes(contentType.split(";")[0]) || audio.byteLength < 100 || audio.byteLength > 3_000_000) throw new VoiceError("Please record a short voice message.", "invalid_audio");
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) throw new VoiceError("Voice is not configured yet. You can type your message below.");
  let response: Response;
  try {
    response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&mip_opt_out=true", {
      method: "POST", headers: { Authorization: `Token ${key}`, "Content-Type": contentType },
      body: new Blob([new Uint8Array(audio)], { type: contentType }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30_000),
    });
  } catch { throw new VoiceError("I couldn’t reach voice transcription. Please try again or type below."); }
  if (!response.ok) throw new VoiceError("Voice transcription is unavailable right now. You can type instead.");
  const data = await response.json().catch(() => null);
  const result = data?.results?.channels?.[0]?.alternatives?.[0];
  if (data?.metadata?.duration > 65) throw new VoiceError("Please keep your recording under one minute.", "invalid_audio");
  if (typeof result?.transcript !== "string" || !result.transcript.trim() || (typeof result.confidence === "number" && result.confidence < 0.45)) throw new VoiceError("I didn’t quite get that. Please repeat it, or type below.", "no_speech");
  if (result.transcript.trim().length > 1200) throw new VoiceError("That message is a little long. Please record a shorter request, or type the important part below.", "invalid_audio");
  return { transcript: result.transcript.trim(), provider: "deepgram", model: "nova-3" };
}
