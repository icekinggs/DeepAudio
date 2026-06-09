import { Check, Circle, LoaderCircle, Waves } from "lucide-react";

const steps = [
  { key: "uploading", label: "Enviando audio" },
  { key: "queued", label: "Aguardando na fila" },
  { key: "converting", label: "Convertendo para formato compativel" },
  { key: "processing", label: "Removendo ruido com inteligencia artificial" },
  { key: "completed", label: "Finalizado" },
];

const statusOrder = {
  uploading: 0,
  queued: 1,
  uploaded: 1,
  converting: 2,
  processing: 3,
  completed: 4,
};

export function ProgressPanel({ status, uploadProgress, fileName }) {
  const activeIndex = statusOrder[status] ?? 0;

  return (
    <section className="progress-card">
      <div className="processing-visual" aria-hidden="true">
        <span className="processing-visual__ring" />
        <Waves size={35} />
      </div>
      <div className="eyebrow">Processando arquivo</div>
      <h1>Melhorando seu audio</h1>
      <p className="lead progress-filename">{fileName}</p>

      <div className="steps">
        {steps.map((step, index) => {
          const isComplete = index < activeIndex || status === "completed";
          const isActive = index === activeIndex && status !== "completed";

          return (
            <div
              className={`step ${isActive ? "step--active" : ""} ${
                isComplete ? "step--complete" : ""
              }`}
              key={step.key}
            >
              <span className="step__icon">
                {isActive ? (
                  <LoaderCircle className="spin" size={19} />
                ) : isComplete ? (
                  <Check size={18} />
                ) : (
                  <Circle size={12} />
                )}
              </span>
              <span className="step__text">
                <strong>{step.label}</strong>
                {step.key === "uploading" && status === "uploading" && (
                  <small>{uploadProgress}% concluido</small>
                )}
                {step.key === "queued" && status === "queued" && (
                  <small>O servidor processa um audio por vez</small>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="progress-track">
        <span
          style={{
            width:
              status === "uploading"
                ? `${Math.max(uploadProgress * 0.2, 4)}%`
                : `${Math.max((activeIndex + 1) * 20, 20)}%`,
          }}
        />
      </div>
      <small className="privacy-note">
        O tempo depende da duracao do arquivo enviado.
      </small>
    </section>
  );
}
