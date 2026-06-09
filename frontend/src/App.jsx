import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  FileAudio,
  History,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";
import {
  cleanupJobs,
  deleteJob,
  getAccessToken,
  getAdminSummary,
  getHistory,
  getStatus,
  setAccessToken,
  uploadAudio,
} from "./api.js";
import { AccessTokenPanel } from "./components/AccessTokenPanel.jsx";
import { AdminPanel } from "./components/AdminPanel.jsx";
import { Brand } from "./components/Brand.jsx";
import { HistoryPanel } from "./components/HistoryPanel.jsx";
import { ProgressPanel } from "./components/ProgressPanel.jsx";
import { ResultPanel } from "./components/ResultPanel.jsx";
import { UploadPanel } from "./components/UploadPanel.jsx";

const MAX_FILE_SIZE_MB = Number(import.meta.env.VITE_MAX_FILE_SIZE_MB || 200);
const allowedExtensions = new Set([
  "wav",
  "mp3",
  "m4a",
  "ogg",
  "oga",
  "flac",
  "aac",
  "wma",
  "webm",
  "mp4",
]);

function validateFile(file) {
  if (!file) return "";
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return "Formato invalido. Selecione um arquivo de audio compativel.";
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `O arquivo excede o limite de ${MAX_FILE_SIZE_MB} MB.`;
  }

  return "";
}

function App() {
  const [activeView, setActiveView] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [processStatus, setProcessStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [token, setToken] = useState(getAccessToken());

  useEffect(() => {
    setAccessToken(token);
  }, [token]);

  const withErrorMessage = useCallback(async (action) => {
    try {
      await action();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await getHistory());
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await getAdminSummary());
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "history") {
      withErrorMessage(loadHistory);
    }
    if (activeView === "admin") {
      withErrorMessage(loadSummary);
    }
  }, [activeView, loadHistory, loadSummary, withErrorMessage]);

  function chooseFile(file) {
    setMessage(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationMessage = validateFile(file);
    if (validationMessage) {
      setSelectedFile(null);
      setMessage({ type: "error", text: validationMessage });
      return;
    }

    setSelectedFile(file);
  }

  async function pollUntilFinished(id) {
    for (;;) {
      const current = await getStatus(id);
      setProcessStatus(current.status);

      if (current.status === "completed") return current;
      if (current.status === "failed") {
        throw new Error(current.error || "Nao foi possivel processar este audio.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1400));
    }
  }

  async function startProcessing() {
    const validationMessage = validateFile(selectedFile);
    if (validationMessage) {
      setMessage({ type: "error", text: validationMessage });
      return;
    }

    setMessage(null);
    setProcessStatus("uploading");
    setUploadProgress(0);

    try {
      const upload = await uploadAudio(selectedFile, setUploadProgress);
      setProcessStatus(upload.status);
      const completed = await pollUntilFinished(upload.id);
      setResult(completed);
      setProcessStatus("completed");
      await loadHistory().catch(() => {});
    } catch (error) {
      setProcessStatus("idle");
      setMessage({ type: "error", text: error.message });
    }
  }

  function resetProcessing() {
    setSelectedFile(null);
    setResult(null);
    setUploadProgress(0);
    setProcessStatus("idle");
    setMessage(null);
  }

  async function removeHistoryItem(id) {
    await withErrorMessage(async () => {
      await deleteJob(id);
      await loadHistory();
    });
  }

  async function cleanupHistory() {
    await withErrorMessage(async () => {
      const cleanup = await cleanupJobs();
      setMessage({ type: "success", text: cleanup.message });
      await loadHistory();
    });
  }

  const processing = !["idle", "completed"].includes(processStatus);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="nav-tabs" aria-label="Navegacao principal">
          <button
            className={activeView === "upload" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("upload")}
          >
            <Upload size={16} />
            Processar
          </button>
          <button
            className={activeView === "history" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("history")}
          >
            <History size={16} />
            Historico
          </button>
          <button
            className={activeView === "admin" ? "active" : ""}
            type="button"
            onClick={() => setActiveView("admin")}
          >
            <BarChart3 size={16} />
            Admin
          </button>
        </nav>
        <AccessTokenPanel token={token} onChange={setToken} />
      </header>

      <main>
        {message && (
          <div className={`alert alert--${message.type}`} role="alert">
            {message.text}
            <button
              type="button"
              aria-label="Fechar alerta"
              onClick={() => setMessage(null)}
            >
              x
            </button>
          </div>
        )}

        {activeView === "upload" && (
          <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-copy">
                <div className="hero-kicker">
                  <WandSparkles size={16} />
                  Reducao inteligente de ruido
                </div>
                <h1 id="hero-title">Audio mais limpo, voz mais clara.</h1>
                <p>
                  Envie o arquivo, acompanhe a fila de processamento e baixe o
                  resultado em WAV quando a limpeza terminar.
                </p>
              </div>

              <div className="panel-column">
                {result ? (
                  <ResultPanel result={result} onReset={resetProcessing} />
                ) : processing ? (
                  <ProgressPanel
                    status={processStatus}
                    uploadProgress={uploadProgress}
                    fileName={selectedFile?.name}
                  />
                ) : (
                  <UploadPanel
                    selectedFile={selectedFile}
                    onSelect={chooseFile}
                    onSubmit={startProcessing}
                    maxFileSizeMb={MAX_FILE_SIZE_MB}
                    disabled={processing}
                  />
                )}
              </div>

              <div className="feature-row" aria-label="Beneficios">
                <article>
                  <Sparkles size={20} />
                  <strong>Fila segura</strong>
                  <span>Processa um audio por vez para proteger o servidor</span>
                </article>
                <article>
                  <Clock3 size={20} />
                  <strong>Status claro</strong>
                  <span>Acompanhe fila, conversao, limpeza e finalizacao</span>
                </article>
                <article>
                  <FileAudio size={20} />
                  <strong>Formatos populares</strong>
                  <span>WAV, MP3, M4A, OGG, FLAC e outros</span>
                </article>
              </div>
            </section>

            <section className="how-it-works">
              <div className="section-heading">
                <span>Como funciona</span>
                <h2>Do arquivo original ao audio tratado</h2>
              </div>
              <div className="steps-grid">
                <article>
                  <span className="step-number">1</span>
                  <strong>Envie o audio</strong>
                  <p>Escolha ou arraste a gravacao que voce quer melhorar.</p>
                </article>
                <article>
                  <span className="step-number">2</span>
                  <strong>Aguarde a fila</strong>
                  <p>O servidor evita concorrencia pesada e processa em ordem.</p>
                </article>
                <article>
                  <span className="step-number">
                    <CheckCircle2 size={20} />
                  </span>
                  <strong>Baixe o resultado</strong>
                  <p>Receba o WAV final pronto para utilizar.</p>
                </article>
              </div>
            </section>
          </>
        )}

        {activeView === "history" && (
          <HistoryPanel
            records={history}
            loading={historyLoading}
            onRefresh={() => withErrorMessage(loadHistory)}
            onDelete={removeHistoryItem}
            onCleanup={cleanupHistory}
          />
        )}

        {activeView === "admin" && (
          <AdminPanel
            summary={summary}
            loading={summaryLoading}
            onRefresh={() => withErrorMessage(loadSummary)}
          />
        )}
      </main>

      <footer>
        <Brand />
        <span>Audios temporarios sao removidos automaticamente.</span>
      </footer>
    </div>
  );
}

export default App;
