export const allowedAudioTypes = new Map([
  [".wav", new Set(["audio/wav", "audio/x-wav", "audio/wave"])],
  [".mp3", new Set(["audio/mpeg", "audio/mp3"])],
  [".m4a", new Set(["audio/mp4", "audio/x-m4a", "audio/m4a"])],
  [".ogg", new Set(["audio/ogg", "application/ogg"])],
  [".oga", new Set(["audio/ogg", "application/ogg"])],
  [".flac", new Set(["audio/flac", "audio/x-flac"])],
  [".aac", new Set(["audio/aac", "audio/x-aac"])],
  [".wma", new Set(["audio/x-ms-wma", "audio/wma"])],
  [".webm", new Set(["audio/webm", "video/webm"])],
  [".mp4", new Set(["audio/mp4", "video/mp4"])],
]);

export const allowedExtensions = new Set(allowedAudioTypes.keys());

export function isAllowedAudio(extension, mimeType) {
  const allowedMimeTypes = allowedAudioTypes.get(extension);
  return Boolean(allowedMimeTypes?.has(mimeType.toLowerCase()));
}
