# DeepAudio

Aplicação web completa para remover ruído de áudios com **DeepFilterNet executado localmente**. O frontend React envia o arquivo ao backend Express, que converte o áudio com FFmpeg, processa com DeepFilterNet usando `--pf` e disponibiliza o WAV limpo para download.

Nenhum serviço externo é necessário durante o uso.

## Funcionalidades

- Upload por seleção ou drag-and-drop.
- WAV, MP3, M4A, OGG, FLAC, AAC, WMA, WebM e MP4.
- Validação de extensão, MIME type e tamanho.
- Nome seguro gerado por UUID, sem usar o nome original.
- Conversão automática para WAV PCM 16-bit, mono, 48 kHz.
- DeepFilterNet com pós-filtro `--pf`.
- Progresso separado para upload, conversão e limpeza.
- Download seguro somente da pasta processada.
- Histórico persistido dos processamentos recentes.
- Remoção individual e limpeza de arquivos antigos.
- Logs no console e em `storage/logs/app.log`.
- Verificação de FFmpeg, DeepFilterNet, storage e limite no startup.
- Interface responsiva em português brasileiro.

## Estrutura

```text
DeepAudio/
├── backend/
│   └── src/
│       ├── config/          # ambiente e logger
│       ├── constants/       # extensões e MIME types
│       ├── middleware/      # upload Multer
│       ├── routes/          # rotas HTTP
│       ├── services/        # FFmpeg, DeepFilterNet, storage e checks
│       ├── utils/           # execução segura de processos
│       ├── app.js
│       └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       ├── api.js
│       ├── App.jsx
│       └── styles.css
├── storage/
│   ├── original/
│   ├── converted/
│   ├── processed/
│   └── logs/
├── deploy/nginx-deepaudio.conf
├── ecosystem.config.cjs
├── .env.example
└── package.json
```

## Fluxo técnico

1. `POST /api/audio/upload` valida o arquivo e salva em `storage/original/<uuid>.<ext>`.
2. O backend responde `202` com o ID e inicia o processamento.
3. FFmpeg executa com argumentos separados por `spawn`:

   ```powershell
   ffmpeg -i "entrada" -ar 48000 -ac 1 -c:a pcm_s16le "audio_48k_pcm.wav"
   ```

4. O WAV convertido é salvo em `storage/converted/<uuid>.wav`.
5. DeepFilterNet executa com argumentos separados por `spawn`:

   ```powershell
   deepFilter "audio_48k_pcm.wav" --pf --output-dir "saida"
   ```

6. O resultado final é movido para `storage/processed/<uuid>.wav`.
7. O frontend consulta `GET /api/audio/status/:id` e libera o download ao finalizar.

O código não concatena nomes de arquivo em comandos de shell. `spawn` usa `shell: false` e arrays de argumentos.

## Requisitos

- Node.js 20 LTS ou superior.
- npm 10 ou superior.
- Python **3.11**.
- Git.
- Rust/Cargo.
- FFmpeg.
- DeepFilterNet.
- Windows: Visual Studio 2022 Build Tools com **Desktop development with C++**.

## Instalação no Windows 10/11 ou Windows Server

Execute o PowerShell como administrador para instalar os pré-requisitos.

### 1. Python 3.11

```powershell
winget install Python.Python.3.11
```

Não use Python 3.14 para esta instalação.

### 2. Git

```powershell
winget install Git.Git
```

Feche e abra o PowerShell:

```powershell
git --version
```

### 3. Rust e Cargo

```powershell
winget install Rustlang.Rustup
```

Feche e abra o PowerShell:

```powershell
rustc --version
cargo --version
```

### 4. FFmpeg

```powershell
winget install Gyan.FFmpeg
```

Feche e abra o PowerShell:

```powershell
ffmpeg -version
```

### 5. Visual Studio Build Tools

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

No instalador, selecione a carga de trabalho **Desktop development with C++**.

### 6. Ambiente Python do DeepFilterNet

```powershell
mkdir C:\deepfilternet
cd C:\deepfilternet
py -3.11 -m venv .venv
.\.venv\Scripts\activate
```

### 7. Dependências Python

```powershell
python -m pip install --upgrade pip
pip install "setuptools<82" wheel packaging
pip install torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu
pip install deepfilternet soundfile
```

Teste:

```powershell
deepFilter --help
```

### 8. Teste manual obrigatório

```powershell
ffmpeg -i "entrada.wav" -ar 48000 -ac 1 -c:a pcm_s16le "audio_48k_pcm.wav"
mkdir saida
deepFilter "audio_48k_pcm.wav" --pf --output-dir "saida"
```

### 9. Node.js

Instale o Node.js LTS:

```powershell
winget install OpenJS.NodeJS.LTS
```

Feche e abra o PowerShell:

```powershell
node --version
npm --version
```

## Configuração da aplicação

Na pasta do projeto:

```powershell
Copy-Item .env.example .env
npm install
```

Se o backend for iniciado fora do PowerShell que ativou o ambiente virtual, configure o executável completo no `.env`:

```dotenv
DEEPFILTER_COMMAND=C:\deepfilternet\.venv\Scripts\deepFilter.exe
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
HISTORY_LIMIT=50
LOG_LEVEL=info
VITE_API_URL=
VITE_MAX_FILE_SIZE_MB=200
```

Mantenha `MAX_FILE_SIZE_MB` e `VITE_MAX_FILE_SIZE_MB` com o mesmo valor. Variáveis `VITE_*` são incorporadas durante o build.

## Desenvolvimento

Com o ambiente Python ativo ou `DEEPFILTER_COMMAND` configurado:

```powershell
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Saúde: `http://localhost:3001/api/health`

Também é possível iniciar separadamente:

```powershell
npm run dev:backend
npm run dev:frontend
```

## Produção

O Express serve o build do frontend.

```powershell
npm install
npm run build
npm start
```

Acesse `http://localhost:3001`.

Validação de código e build:

```powershell
npm run check
```

## API

### `POST /api/audio/upload`

Campo multipart: `audio`. Retorna `202` com ID, status inicial e URL de consulta.

### `GET /api/audio/status/:id`

Retorna `uploaded`, `converting`, `processing`, `completed` ou `failed`.

### `GET /api/audio/download/:id`

Baixa o WAV processado usando `res.download`.

### `GET /api/audio/history`

Lista os processamentos recentes sem expor caminhos absolutos.

### `DELETE /api/audio/:id`

Remove original, convertido, processado e registro de histórico.

### `POST /api/audio/cleanup`

Remove registros e arquivos com idade superior a `CLEANUP_MAX_AGE_HOURS`.

## PM2 no Windows ou Linux

Instale:

```powershell
npm install --global pm2
```

Faça o build e inicie:

```powershell
npm run build
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs deepaudio
pm2 save
```

No Windows, o PM2 precisa receber o caminho absoluto do DeepFilterNet no `.env`:

```dotenv
DEEPFILTER_COMMAND=C:\deepfilternet\.venv\Scripts\deepFilter.exe
```

Para iniciar o PM2 com o Windows, uma opção prática é:

```powershell
npm install --global pm2-windows-startup
pm2-startup install
pm2 save
```

Confirme a política de segurança e manutenção desse pacote antes de usá-lo em servidor corporativo.

## Serviço Windows com NSSM

1. Baixe e instale o NSSM.
2. Faça `npm run build`.
3. Abra PowerShell como administrador:

```powershell
nssm install DeepAudio
```

Configure na janela:

- **Path:** caminho de `node.exe`, obtido com `where.exe node`.
- **Startup directory:** pasta raiz do projeto.
- **Arguments:** `backend\src\server.js`.
- **Environment:** `NODE_ENV=production` e, se necessário, as variáveis do `.env`.

Depois:

```powershell
nssm start DeepAudio
nssm status DeepAudio
```

Garanta que a conta do serviço tenha leitura e escrita na pasta `storage`.

## Linux Debian/Ubuntu

### Instalação automática no Proxmox CT com Debian 13

O projeto inclui `scripts/install-debian13.sh`, preparado para um container LXC
**Debian 13 amd64** com systemd. Ele instala:

- pacotes de compilação, Git, Rust/Cargo, FFmpeg, Nginx, Node.js 20 e npm;
- Python 3.11.15 isolado em `/opt/python/3.11.15`;
- ambiente virtual e DeepFilterNet em `/opt/deepfilternet/.venv`;
- PyTorch/Torchaudio CPU compatíveis e `numpy<2`;
- modelo do DeepFilterNet durante a instalação, evitando download no primeiro uso;
- dependências Node.js, build do frontend e aplicação em `/opt/deepaudio`;
- usuário de serviço sem login, unit systemd e reverse proxy Nginx;
- validação final de FFmpeg, DeepFilterNet, frontend e endpoint de saúde.

Recomendação mínima para o CT:

- 4 vCPU;
- 4 GB de RAM;
- 12 GB de disco;
- Debian 13 amd64;
- acesso à internet apenas durante instalação e atualizações;
- recurso de nesting não é necessário.

Copie ou clone este projeto para o CT e execute na raiz:

```bash
chmod +x scripts/install-debian13.sh
sudo bash scripts/install-debian13.sh
```

O script é idempotente e pode ser executado novamente para atualizar a
aplicação e as dependências. A compilação do Python pode demorar alguns minutos.

Parâmetros opcionais são passados por variável de ambiente:

```bash
sudo \
  DOMAIN=audio.exemplo.com \
  MAX_FILE_SIZE_MB=500 \
  CLEANUP_MAX_AGE_HOURS=48 \
  BUILD_JOBS=2 \
  bash scripts/install-debian13.sh
```

Principais opções:

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `APP_DIR` | `/opt/deepaudio` | Diretório da aplicação |
| `APP_DATA_DIR` | `/var/lib/deepaudio` | Home/cache do serviço |
| `DEEPFILTER_DIR` | `/opt/deepfilternet` | Ambiente do DeepFilterNet |
| `MAX_FILE_SIZE_MB` | `200` | Limite de upload e do Nginx |
| `CLEANUP_MAX_AGE_HOURS` | `24` | Idade máxima dos arquivos |
| `PORT` | `3001` | Porta interna do Express |
| `DOMAIN` | vazio | Nome DNS usado pelo Nginx |
| `ENABLE_NGINX` | `1` | Use `0` para não configurar proxy |
| `BUILD_JOBS` | `2` | Paralelismo da compilação do Python |

Após instalar:

```bash
systemctl status deepaudio
journalctl -u deepaudio -f
curl http://127.0.0.1:3001/api/health
```

Acesse `http://IP_DO_CT`. Se informou `DOMAIN`, aponte o DNS para o IP e
configure HTTPS no Nginx. O script não abre firewall no Proxmox nem instala
certificado TLS, pois essas decisões dependem da rede e do domínio.

Para atualizar depois de copiar uma nova versão do projeto:

```bash
sudo bash scripts/install-debian13.sh
```

O instalador verifica se está realmente no Debian 13, exige arquitetura amd64,
valida o SHA-256 do código-fonte do Python e encerra com diagnóstico se o
DeepFilterNet não produzir um áudio de teste.

### Pacotes do sistema

```bash
sudo apt update
sudo apt install -y git curl build-essential pkg-config libssl-dev ffmpeg python3.11 python3.11-venv python3.11-dev
```

Se sua versão do Ubuntu/Debian não fornecer Python 3.11 no repositório padrão, use um repositório compatível com sua distribuição ou instale o Python 3.11 por ferramenta de gerenciamento de versões.

Instale Rust:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustc --version
cargo --version
```

### DeepFilterNet

```bash
sudo mkdir -p /opt/deepfilternet
sudo chown "$USER":"$USER" /opt/deepfilternet
cd /opt/deepfilternet
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install "setuptools<82" wheel packaging
pip uninstall torch torchaudio -y
pip install torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu
pip install deepfilternet soundfile
deepFilter --help
```

No `.env`:

```dotenv
DEEPFILTER_COMMAND=/opt/deepfilternet/.venv/bin/deepFilter
FFMPEG_PATH=/usr/bin/ffmpeg
STORAGE_DIR=/var/lib/deepaudio
CORS_ORIGIN=https://audio.exemplo.com
```

Crie o storage e dê permissão ao usuário que executa o Node:

```bash
sudo mkdir -p /var/lib/deepaudio
sudo chown -R "$USER":"$USER" /var/lib/deepaudio
```

Instale Node.js 20 LTS por um método compatível com sua distribuição, depois:

```bash
npm install
npm run build
npm install --global pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Execute o comando adicional exibido por `pm2 startup`.

## Nginx reverse proxy no Linux

Use `deploy/nginx-deepaudio.conf` como base:

```bash
sudo cp deploy/nginx-deepaudio.conf /etc/nginx/sites-available/deepaudio
sudo ln -s /etc/nginx/sites-available/deepaudio /etc/nginx/sites-enabled/deepaudio
sudo nginx -t
sudo systemctl reload nginx
```

Pontos importantes:

- `client_max_body_size` deve ser igual ou maior que `MAX_FILE_SIZE_MB`.
- `proxy_read_timeout` alto evita interromper áudios longos.
- Em produção, configure HTTPS com certificado válido.
- Defina `CORS_ORIGIN` com a URL pública exata.

## Erros conhecidos e correções

### `Cargo, the Rust package manager, is not installed or is not on PATH.`

```powershell
winget install Rustlang.Rustup
```

Feche e abra o PowerShell:

```powershell
rustc --version
cargo --version
```

### `Python314\python.exe is not a valid python interpreter`

Não use Python 3.14:

```powershell
winget install Python.Python.3.11
py -3.11 -m venv .venv
```

### `torch requires setuptools<82`

```powershell
pip install "setuptools<82" wheel packaging
```

### `ModuleNotFoundError: No module named 'torchaudio.backend'`

```powershell
pip uninstall torch torchaudio -y
pip install torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu
```

### `FileNotFoundError: [WinError 2] O sistema não pode encontrar o arquivo especificado`

Durante o DeepFilterNet, instale Git:

```powershell
winget install Git.Git
```

Feche e abra o PowerShell:

```powershell
git --version
```

Também confirme:

```powershell
ffmpeg -version
deepFilter --help
```

### `fatal: not a git repository`

Esse aviso pode ser emitido internamente pelo DeepFilterNet. A aplicação registra como warning quando o comando continua normalmente. Ele não deve interromper o processamento.

### `Couldn't find appropriate backend to handle uri ... wav`

Sempre converta primeiro:

```powershell
ffmpeg -i "entrada.wav" -ar 48000 -ac 1 -c:a pcm_s16le "audio_48k_pcm.wav"
deepFilter "audio_48k_pcm.wav" --pf --output-dir "saida"
```

A aplicação já executa essa conversão automaticamente.

## Segurança

- UUID é gerado no backend para cada upload.
- O nome original nunca é usado em caminhos ou comandos.
- Apenas extensões e MIME types permitidos são aceitos.
- O tamanho é limitado no Multer.
- FFmpeg e DeepFilterNet são executados com `spawn`, `shell: false` e array de argumentos.
- Caminhos absolutos e erros internos não são retornados ao frontend.
- Downloads são validados contra a raiz `storage/processed`.
- Arquivos antigos são removidos automaticamente a cada hora.
- Logs técnicos permanecem no servidor.

Para exposição pública, adicione autenticação, rate limiting, HTTPS, antivírus e isolamento do processo conforme os requisitos da sua infraestrutura.
