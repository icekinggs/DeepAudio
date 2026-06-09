import { RefreshCw } from "lucide-react";

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function AdminPanel({ summary, loading, onRefresh }) {
  const byStatus = summary?.storage?.jobs?.byStatus || {};
  const folders = summary?.storage?.folders || {};

  return (
    <section className="tool-section">
      <div className="tool-heading">
        <div>
          <span>Admin</span>
          <h2>Fila, storage e limites</h2>
        </div>
        <button className="button button--secondary" type="button" onClick={onRefresh}>
          <RefreshCw size={17} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Carregando painel...</div>
      ) : (
        <div className="admin-grid">
          <article>
            <span>Fila</span>
            <strong>{summary?.queue?.queuedCount || 0}</strong>
            <small>
              {summary?.queue?.running
                ? `Processando ${summary.queue.currentJobId}`
                : "Nenhum job em execucao"}
            </small>
          </article>
          <article>
            <span>Total de jobs</span>
            <strong>{summary?.storage?.jobs?.total || 0}</strong>
            <small>
              {Object.entries(byStatus)
                .map(([status, count]) => `${status}: ${count}`)
                .join(" | ") || "Sem jobs"}
            </small>
          </article>
          <article>
            <span>Rate limit</span>
            <strong>{summary?.limits?.uploadRateLimitMax ?? 0}</strong>
            <small>uploads por janela configurada</small>
          </article>
          <article>
            <span>Token</span>
            <strong>{summary?.limits?.accessTokenEnabled ? "Ativo" : "Livre"}</strong>
            <small>controle opcional por bearer token</small>
          </article>
          {Object.entries(folders).map(([name, info]) => (
            <article key={name}>
              <span>{name}</span>
              <strong>{formatBytes(info.bytes)}</strong>
              <small>{info.files} arquivo(s)</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
