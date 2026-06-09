import {
  CheckCircle2,
  Clock3,
  Download,
  FileAudio,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { downloadUrl } from "../api.js";

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const statusConfig = {
  completed: { label: "Concluído", icon: CheckCircle2 },
  failed: { label: "Falhou", icon: TriangleAlert },
  processing: { label: "Processando", icon: LoaderCircle },
  converting: { label: "Convertendo", icon: LoaderCircle },
  uploaded: { label: "Na fila", icon: Clock3 },
};

export function HistoryPanel({
  records,
  loading,
  onRefresh,
  onDelete,
  onCleanup,
}) {
  return (
    <section className="history-section">
      <div className="history-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={15} />
            Arquivos locais
          </div>
          <h1>Histórico recente</h1>
          <p>Consulte, baixe ou apague processamentos armazenados neste servidor.</p>
        </div>
        <div className="history-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={loading ? "spin" : ""} size={17} />
            Atualizar
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={onCleanup}
          >
            <Trash2 size={17} />
            Apagar temporários
          </button>
        </div>
      </div>

      <div className="history-list">
        {!loading && records.length === 0 && (
          <div className="empty-state">
            <FileAudio size={31} />
            <strong>Nenhum processamento recente</strong>
            <span>Os próximos áudios processados aparecerão aqui.</span>
          </div>
        )}

        {records.map((record) => {
          const status = statusConfig[record.status] || statusConfig.uploaded;
          const StatusIcon = status.icon;
          const inProgress = ["uploaded", "processing", "converting"].includes(
            record.status,
          );

          return (
            <article className="history-item" key={record.id}>
              <span className="history-item__file">
                <FileAudio size={22} />
              </span>
              <div className="history-item__main">
                <strong>Áudio {record.id.slice(0, 8)}</strong>
                <span>
                  {record.originalExtension.toUpperCase().replace(".", "")} ·{" "}
                  {formatBytes(record.inputSize)} · {formatDate(record.createdAt)}
                </span>
              </div>
              <span
                className={`status-pill status-pill--${record.status}`}
              >
                <StatusIcon
                  className={inProgress ? "spin" : ""}
                  size={15}
                />
                {status.label}
              </span>
              <div className="history-item__actions">
                {record.downloadUrl && (
                  <a
                    className="icon-button"
                    href={downloadUrl(record.downloadUrl)}
                    aria-label="Baixar áudio limpo"
                    title="Baixar áudio limpo"
                  >
                    <Download size={18} />
                  </a>
                )}
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label="Apagar processamento"
                  title="Apagar processamento"
                  onClick={() => onDelete(record.id)}
                  disabled={inProgress}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
