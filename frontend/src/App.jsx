import { useCallback, useEffect, useState } from "react";
import {
  AudioLines,
  Clock3,
  Github,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  cleanupFiles,
  deleteProcessing,
  getHistory,
  getStatus,
  uploadAudio,
} from "./api.js";
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
    return "Formato inválido. Selecione um arquivo de áudio compatível.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `O arquivo excede o limite de ${MAX_FILE_SIZE_MB} MB.`;
  }
  return "";
}

function App() {
  const [view, setView] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [processStatus, setProcessStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await getHistory());
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "history") loadHistory();
  }, [view, loadHistory]);

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
        throw new Error(
          current.error || "Não foi possível processar este áudio.",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
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
    try {
      await deleteProcessing(id);
      setHistory((items) => items.filter((item) => item.id !== id));
      setMessage({ type: "success", text: "Processamento apagado." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function cleanupHistory() {
    try {
      const cleanup = await cleanupFiles();
      setMessage({ type: "success", text: cleanup.message });
      await loadHistory();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  const processing = !["idle", "completed"].includes(processStatus);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <nav className="nav-tabs" aria-label="Navegação principal">
          <button
            className={view === "upload" ? "active" : ""}
            type="button"
            onClick={() => setView("upload")}
          >
            <AudioLines size={17} />
            Limpar áudio
          </button>
          <button
            className={view === "history" ? "active" : ""}
            type="button"
            onClick={() => setView("history")}
          >
            <Clock3 size={17} />
            Histórico
          </button>
        </nav>
        <span className="local-badge">
          <span />
          IA local ativa
        </span>
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
              ×
            </button>
          </div>
        )}

        {view === "upload" ? (
          <div className="hero-layout">
            <div className="hero-copy">
              <span className="hero-kicker">DeepFilterNet + FFmpeg</span>
              <h2>
                Clareza para sua voz.
                <br />
                <span>Sem nuvem. Sem espera.</span>
              </h2>
              <p>
                Uma ferramenta profissional para reduzir ruído de gravações,
                entrevistas, podcasts e reuniões diretamente no seu servidor.
              </p>
              <div className="feature-list">
                <span>
                  <ShieldCheck size={19} />
                  Privacidade total
                </span>
                <span>
                  <AudioLines size={19} />
                  Conversão automática para 48 kHz
                </span>
                <span>
                  <LockKeyhole size={19} />
                  Arquivos sob seu controle
                </span>
              </div>
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
          </div>
        ) : (
          <HistoryPanel
            records={history}
            loading={historyLoading}
            onRefresh={loadHistory}
            onDelete={removeHistoryItem}
            onCleanup={cleanupHistory}
          />
        )}
      </main>

      <footer>
        <span>DeepAudio · Processamento local com DeepFilterNet</span>
        <span>
          <LockKeyhole size={14} />
          Nenhum arquivo sai do servidor
        </span>
        <Github size={16} aria-label="Código local" />
      </footer>
    </div>
  );
}

export default App;
