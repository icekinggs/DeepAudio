import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileAudio,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { getStatus, uploadAudio } from "./api.js";
import { Brand } from "./components/Brand.jsx";
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [processStatus, setProcessStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);

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

  const processing = !["idle", "completed"].includes(processStatus);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand />
        <span className="header-label">
          <Sparkles size={16} />
          IA para áudio
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

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="hero-kicker">
              <WandSparkles size={16} />
              Redução inteligente de ruído
            </div>
            <h1 id="hero-title">
              Áudio mais limpo, voz mais clara.
            </h1>
            <p>
              Melhore gravações, entrevistas, aulas, reuniões e podcasts com
              um fluxo simples: envie o arquivo, aguarde o processamento e
              baixe o resultado.
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

          <div className="feature-row" aria-label="Benefícios">
            <article>
              <Sparkles size={20} />
              <strong>Tratamento automático</strong>
              <span>Reduz ruídos e interferências comuns</span>
            </article>
            <article>
              <Clock3 size={20} />
              <strong>Processo simples</strong>
              <span>Envie, acompanhe e baixe o arquivo final</span>
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
            <h2>Do arquivo original ao áudio tratado</h2>
          </div>
          <div className="steps-grid">
            <article>
              <span className="step-number">1</span>
              <strong>Envie o áudio</strong>
              <p>Escolha ou arraste a gravação que você quer melhorar.</p>
            </article>
            <article>
              <span className="step-number">2</span>
              <strong>Aguarde o tratamento</strong>
              <p>A IA analisa a gravação e reduz os ruídos identificados.</p>
            </article>
            <article>
              <span className="step-number">
                <CheckCircle2 size={20} />
              </span>
              <strong>Baixe o resultado</strong>
              <p>Receba o arquivo final em WAV pronto para utilizar.</p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <Brand />
        <span>Áudios temporários são removidos automaticamente.</span>
      </footer>
    </div>
  );
}

export default App;
