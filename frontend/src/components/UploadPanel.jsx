import { useRef, useState } from "react";
import { FileAudio, ShieldCheck, UploadCloud, X } from "lucide-react";

const allowedExtensions = [
  ".wav",
  ".mp3",
  ".m4a",
  ".ogg",
  ".oga",
  ".flac",
  ".aac",
  ".wma",
  ".webm",
  ".mp4",
];

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadPanel({
  selectedFile,
  onSelect,
  onSubmit,
  maxFileSizeMb,
  disabled,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function selectCandidate(file) {
    if (file) onSelect(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    selectCandidate(event.dataTransfer.files?.[0]);
  }

  return (
    <section className="upload-card">
      <div className="eyebrow">
        <ShieldCheck size={16} />
        Processamento 100% local
      </div>
      <h1>Envie seu áudio</h1>
      <p className="lead">
        Remova ruídos, chiados e sons de fundo com inteligência artificial,
        sem enviar seus arquivos para serviços externos.
      </p>

      <div
        className={`dropzone ${dragging ? "dropzone--active" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={allowedExtensions.join(",")}
          onChange={(event) => selectCandidate(event.target.files?.[0])}
          hidden
        />
        <span className="dropzone__icon">
          <UploadCloud size={30} />
        </span>
        <strong>Arraste e solte seu áudio aqui</strong>
        <span>ou</span>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          Selecionar áudio
        </button>
        <small>
          WAV, MP3, M4A, OGG, FLAC e outros · até {maxFileSizeMb} MB
        </small>
      </div>

      {selectedFile && (
        <div className="selected-file">
          <span className="selected-file__icon">
            <FileAudio size={22} />
          </span>
          <span className="selected-file__content">
            <strong title={selectedFile.name}>{selectedFile.name}</strong>
            <small>{formatBytes(selectedFile.size)}</small>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Remover arquivo"
            onClick={() => onSelect(null)}
            disabled={disabled}
          >
            <X size={19} />
          </button>
        </div>
      )}

      <button
        type="button"
        className="button button--primary button--wide"
        onClick={onSubmit}
        disabled={!selectedFile || disabled}
      >
        Remover ruído do áudio
      </button>
    </section>
  );
}
