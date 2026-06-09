import {
  Check,
  Circle,
  LoaderCircle,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";

const steps = [
  { key: "uploading", label: "Enviando áudio", icon: Upload },
  {
    key: "converting",
    label: "Convertendo para formato compatível",
    icon: Waves,
  },
  {
    key: "processing",
    label: "Removendo ruído com IA local",
    icon: Sparkles,
  },
  { key: "completed", label: "Finalizado", icon: Check },
];

const statusOrder = {
  uploading: 0,
  uploaded: 1,
  converting: 1,
  processing: 2,
  completed: 3,
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
      <h1>Melhorando seu áudio</h1>
      <p className="lead progress-filename">{fileName}</p>

      <div className="steps">
        {steps.map((step, index) => {
          const Icon = step.icon;
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
                  <small>{uploadProgress}% concluído</small>
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
                ? `${Math.max(uploadProgress * 0.25, 4)}%`
                : `${Math.max((activeIndex + 1) * 25, 25)}%`,
          }}
        />
      </div>
      <small className="privacy-note">
        O tempo depende da duração do áudio e do seu computador.
      </small>
    </section>
  );
}
