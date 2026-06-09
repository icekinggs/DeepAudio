import { AudioWaveform } from "lucide-react";

export function Brand() {
  return (
    <div className="brand" aria-label="DeepAudio">
      <span className="brand__icon">
        <AudioWaveform size={21} strokeWidth={2.4} />
      </span>
      <span>DeepAudio</span>
    </div>
  );
}
