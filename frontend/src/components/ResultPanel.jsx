import { CheckCircle2, Download, RotateCcw } from "lucide-react";
import { downloadUrl } from "../api.js";

export function ResultPanel({ result, onReset }) {
  return (
    <section className="result-card">
      <span className="result-card__icon">
        <CheckCircle2 size={42} />
      </span>
      <div className="eyebrow">Processamento concluído</div>
      <h1>Áudio limpo gerado com sucesso</h1>
      <p className="lead">
        A redução de ruído foi concluída e seu novo arquivo está pronto.
      </p>
      <a
        className="button button--primary button--wide"
        href={downloadUrl(result.downloadUrl)}
      >
        <Download size={19} />
        Baixar áudio limpo
      </a>
      <button
        type="button"
        className="button button--ghost button--wide"
        onClick={onReset}
      >
        <RotateCcw size={18} />
        Processar outro áudio
      </button>
    </section>
  );
}
