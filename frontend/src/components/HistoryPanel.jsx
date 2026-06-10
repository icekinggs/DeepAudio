import { Download, RefreshCw, Trash2 } from "lucide-react";
import { downloadUrl } from "../api.js";

const statusLabels = {
  queued: "Na fila",
  converting: "Convertendo",
  processing: "Processando",
  completed: "Concluido",
  failed: "Falhou",
};

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HistoryPanel({
  records,
  loading,
  onRefresh,
  onDelete,
  onCleanup,
}) {
  return (
    <section className="tool-section">
      <div className="tool-heading">
        <div>
          <span>Historico</span>
          <h2>Processamentos recentes</h2>
        </div>
        <div className="tool-actions">
          <button className="button button--secondary" type="button" onClick={onRefresh}>
            <RefreshCw size={17} />
            Atualizar
          </button>
          <button className="button button--ghost" type="button" onClick={onCleanup}>
            Limpar antigos
          </button>
        </div>
      </div>

      <div className="job-list">
        {loading ? (
          <div className="empty-state">Carregando historico...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">Nenhum processamento encontrado.</div>
        ) : (
          records.map((record) => (
            <article className="job-item" key={record.id}>
              <div>
                <strong>{record.id}</strong>
                <span>
                  {formatBytes(record.inputSize)}
                  {record.outputSize ? ` -> ${formatBytes(record.outputSize)}` : ""}
                  {record.createdAt ? ` · ${formatDate(record.createdAt)}` : ""}
                </span>
              </div>
              <span className={`status-pill status-pill--${record.status}`}>
                {statusLabels[record.status] || record.status}
                {record.status === "queued" && record.queue
                  ? ` #${record.queue.position}`
                  : ""}
              </span>
              <div className="job-actions">
                {record.downloadUrl && (
                  <a
                    className="icon-button"
                    href={downloadUrl(record.downloadUrl)}
                    aria-label="Baixar audio"
                  >
                    <Download size={18} />
                  </a>
                )}
                {!["queued", "converting", "processing"].includes(record.status) && (
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onDelete(record.id)}
                    aria-label="Remover processamento"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
