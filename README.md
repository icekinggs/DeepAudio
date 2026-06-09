# DeepAudio

DeepAudio é uma aplicação web completa para reduzir ruído em arquivos de áudio
usando FFmpeg e DeepFilterNet. A interface permite enviar um arquivo,
acompanhar o processamento em tempo real e baixar um WAV limpo ao final.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

## Visão Geral

O projeto foi pensado para rodar em um servidor próprio, sem depender de APIs
externas durante o uso. O backend recebe o upload, valida o arquivo, converte o
áudio para um formato compatível, executa o DeepFilterNet e entrega o resultado
processado com segurança.

Principais recursos:

- Upload por seleção de arquivo ou drag-and-drop.
- Suporte a WAV, MP3, M4A, OGG, FLAC, AAC, WMA, WebM e MP4.
- Validação de extensão, MIME type e tamanho.
- Nome de arquivo seguro gerado por UUID.
- Conversão automática para WAV PCM 16-bit, mono, 48 kHz.
- Redução de ruído com DeepFilterNet e pós-filtro `--pf`.
- Progresso separado para upload, conversão e processamento.
- Download protegido somente da pasta `storage/processed`.
- Limpeza automática de jobs expirados e arquivos órfãos.
- Logs no console e em `storage/logs/app.log`.
- Scripts de instalação e desinstalação para Debian 13.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, Vite, lucide-react |
| Backend | Node.js, Express 5, Multer, Pino |
| Processamento | FFmpeg, DeepFilterNet |
| Deploy | systemd, Nginx, PM2 opcional |
| Storage | Arquivos locais e `storage/jobs.json` |

## Estrutura

```text
DeepAudio/
  backend/
    src/
      config/       Ambiente e logger
      constants/    Extensões e MIME types aceitos
      middleware/   Upload com Multer
      routes/       Rotas HTTP
      services/     FFmpeg, DeepFilterNet, storage e health checks
      utils/        Execução segura de processos
      app.js
      server.js
  frontend/
    src/
      components/
      api.js
      App.jsx
      styles.css
  scripts/
    dev.js
    install-debian13.sh
    uninstall-debian13.sh
  deploy/
    nginx-deepaudio.conf
  docs/
    uninstall-debian13.md
  storage/
    original/
    converted/
    processed/
    logs/
```

## Fluxo de Processamento

1. `POST /api/audio/upload` valida o arquivo e salva em
   `storage/original/<uuid>.<ext>`.
2. O backend responde `202 Accepted` e inicia o processamento em background.
3. FFmpeg converte o áudio:

   ```bash
   ffmpeg -i "entrada" -ar 48000 -ac 1 -c:a pcm_s16le "audio_48k_pcm.wav"
   ```

4. DeepFilterNet reduz o ruído:

   ```bash
   deepFilter "audio_48k_pcm.wav" --pf --output-dir "saida"
   ```

5. O WAV final é movido para `storage/processed/<uuid>.wav`.
6. O frontend consulta `GET /api/audio/status/:id` até finalizar.

Os comandos usam `spawn`, `shell: false` e arrays de argumentos. O código não
concatena nomes de arquivos enviados pelo usuário em comandos de shell.

## Requisitos

- Node.js 20 LTS ou superior.
- npm 10 ou superior.
- Python 3.11.
- FFmpeg.
- DeepFilterNet.
- Git.
- Rust/Cargo.
- Windows: Visual Studio 2022 Build Tools com Desktop development with C++.

## Configuração

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Configuração padrão:

```dotenv
PORT=3001
MAX_FILE_SIZE_MB=200
FFMPEG_PATH=ffmpeg
DEEPFILTER_COMMAND=deepFilter
STORAGE_DIR=./storage
CORS_ORIGIN=http://localhost:5173
CLEANUP_MAX_AGE_HOURS=24
LOG_LEVEL=info

VITE_API_URL=
VITE_MAX_FILE_SIZE_MB=200
```

Mantenha `MAX_FILE_SIZE_MB` e `VITE_MAX_FILE_SIZE_MB` com o mesmo valor.
Variáveis `VITE_*` são incorporadas durante o build do frontend.

## Desenvolvimento

Instale as dependências:

```bash
npm install
```

Inicie backend e frontend juntos:

```bash
npm run dev
```

Serviços locais:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

Também é possível iniciar cada workspace separadamente:

```bash
npm run dev:backend
npm run dev:frontend
```

## Produção

Gere o build e inicie o backend:

```bash
npm install
npm run build
npm start
```

O Express serve o frontend gerado em `frontend/dist`.

Validação completa:

```bash
npm run check
```

## Instalação no Windows

Execute o PowerShell como administrador e instale os pré-requisitos:

```powershell
winget install Python.Python.3.11
winget install Git.Git
winget install Rustlang.Rustup
winget install Gyan.FFmpeg
winget install Microsoft.VisualStudio.2022.BuildTools
winget install OpenJS.NodeJS.LTS
```

Crie o ambiente do DeepFilterNet:

```powershell
mkdir C:\deepfilternet
cd C:\deepfilternet
py -3.11 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install "setuptools<82" wheel packaging
pip install torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu
pip install deepfilternet soundfile
deepFilter --help
```

Se o backend for iniciado fora do terminal com a venv ativa, configure:

```dotenv
DEEPFILTER_COMMAND=C:\deepfilternet\.venv\Scripts\deepFilter.exe
```

## Instalação Automática no Debian 13

O projeto inclui `scripts/install-debian13.sh`, preparado para Debian 13 amd64
com systemd, incluindo containers LXC no Proxmox.

O instalador configura:

- pacotes de sistema necessários;
- Python 3.11.15 isolado em `/opt/python/3.11.15`;
- DeepFilterNet em `/opt/deepfilternet/.venv`;
- PyTorch/Torchaudio CPU compatíveis;
- dependências Node.js e build do frontend;
- aplicação em `/opt/deepaudio`;
- usuário de serviço `deepaudio`;
- serviço systemd;
- reverse proxy Nginx.

Recomendação mínima:

- 4 vCPU;
- 4 GB de RAM;
- 12 GB de disco;
- Debian 13 amd64.

Instalação:

```bash
chmod +x scripts/install-debian13.sh
sudo DOMAIN=audio.exemplo.com bash scripts/install-debian13.sh
```

Opções úteis:

```bash
sudo \
  DOMAIN=audio.exemplo.com \
  MAX_FILE_SIZE_MB=500 \
  CLEANUP_MAX_AGE_HOURS=48 \
  BUILD_JOBS=2 \
  bash scripts/install-debian13.sh
```

Após instalar:

```bash
systemctl status deepaudio
journalctl -u deepaudio -f
curl http://127.0.0.1:3001/api/health
```

## Desinstalação no Debian 13

Para desfazer a instalação automatizada:

```bash
sudo bash scripts/uninstall-debian13.sh
```

Por padrão, o script remove:

- serviço systemd `deepaudio`;
- site Nginx do DeepAudio;
- `/opt/deepaudio`;
- `/var/lib/deepaudio`;
- `/opt/deepfilternet`;
- `/opt/python/3.11.15`;
- usuário e grupo `deepaudio`.

Pacotes do sistema são mantidos por segurança, pois podem ser usados por outros
serviços. Para removê-los também:

```bash
sudo REMOVE_SYSTEM_PACKAGES=1 bash scripts/uninstall-debian13.sh
```

Para manter dados e cache:

```bash
sudo REMOVE_APP_DATA=0 bash scripts/uninstall-debian13.sh
```

Veja [docs/uninstall-debian13.md](docs/uninstall-debian13.md) para todas as
opções.

## PM2

Build e inicialização:

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs deepaudio
pm2 save
```

No Windows, configure `DEEPFILTER_COMMAND` com o caminho absoluto do executável
antes de iniciar pelo PM2.

## API

### `POST /api/audio/upload`

Campo multipart: `audio`.

Retorna `202 Accepted` com ID do job, status inicial e URL de consulta.

### `GET /api/audio/status/:id`

Retorna um dos status:

- `uploaded`
- `converting`
- `processing`
- `completed`
- `failed`

### `GET /api/audio/download/:id`

Baixa o WAV processado quando o job está concluído.

## Solução de Problemas

### `502 Bad Gateway` durante o processamento

Verifique se o serviço foi morto por falta de memória:

```bash
journalctl -u deepaudio -n 120 --no-pager
dmesg -T | grep -i -E 'killed process|out of memory|oom'
```

Se o DeepFilterNet passar da memória disponível, adicione RAM, configure swap
ou processe arquivos menores.

### `deepFilter: Permission denied`

Execute novamente o instalador Debian. Ele corrige proprietário e permissões de
leitura/execução em `/opt/deepfilternet`.

```bash
sudo bash scripts/install-debian13.sh
```

### `ModuleNotFoundError: No module named 'torchaudio.backend'`

Use as versões CPU fixadas:

```bash
pip uninstall torch torchaudio -y
pip install torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu
```

### DeepFilterNet não processa um WAV

Converta antes:

```bash
ffmpeg -i "entrada.wav" -ar 48000 -ac 1 -c:a pcm_s16le "audio_48k_pcm.wav"
deepFilter "audio_48k_pcm.wav" --pf --output-dir "saida"
```

O backend já executa essa conversão automaticamente.

## Segurança

- IDs são gerados no backend com UUID.
- O nome original nunca é usado em caminhos de comando.
- Extensão e MIME type são validados.
- Tamanho de upload é limitado pelo Multer.
- FFmpeg e DeepFilterNet usam `spawn` com `shell: false`.
- Downloads são limitados à pasta de arquivos processados.
- Arquivos antigos são removidos automaticamente.

Para exposição pública, adicione autenticação, rate limiting, HTTPS,
verificação antimalware e isolamento de processo conforme sua infraestrutura.
