#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

APP_NAME="${APP_NAME:-deepaudio}"
APP_USER="${APP_USER:-deepaudio}"
APP_GROUP="${APP_GROUP:-deepaudio}"
APP_DIR="${APP_DIR:-/opt/deepaudio}"
APP_DATA_DIR="${APP_DATA_DIR:-/var/lib/deepaudio}"
DEEPFILTER_DIR="${DEEPFILTER_DIR:-/opt/deepfilternet}"
PYTHON_VERSION="${PYTHON_VERSION:-3.11.15}"
PYTHON_SHA256="${PYTHON_SHA256:-272179ddd9a2e41a0fc8e42e33dfbdca0b3711aa5abf372d3f2d51543d09b625}"
PYTHON_PREFIX="${PYTHON_PREFIX:-/opt/python/${PYTHON_VERSION}}"
MAX_FILE_SIZE_MB="${MAX_FILE_SIZE_MB:-200}"
CLEANUP_MAX_AGE_HOURS="${CLEANUP_MAX_AGE_HOURS:-24}"
HISTORY_LIMIT="${HISTORY_LIMIT:-50}"
PORT="${PORT:-3001}"
DOMAIN="${DOMAIN:-}"
ENABLE_NGINX="${ENABLE_NGINX:-1}"
BUILD_JOBS="${BUILD_JOBS:-2}"
SOURCE_DIR="${SOURCE_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

export DEBIAN_FRONTEND=noninteractive

log() {
  printf '\n\033[1;36m[DeepAudio]\033[0m %s\n' "$*"
}

warn() {
  printf '\n\033[1;33m[DeepAudio] AVISO:\033[0m %s\n' "$*" >&2
}

fatal() {
  printf '\n\033[1;31m[DeepAudio] ERRO:\033[0m %s\n' "$*" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  printf '\n\033[1;31m[DeepAudio] Falha na linha %s (código %s).\033[0m\n' \
    "${BASH_LINENO[0]}" "$exit_code" >&2
  exit "$exit_code"
}

trap on_error ERR

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fatal "Execute como root: sudo bash scripts/install-debian13.sh"
  fi
}

check_platform() {
  [[ -r /etc/os-release ]] || fatal "Não foi possível identificar o sistema."
  # shellcheck disable=SC1091
  source /etc/os-release

  [[ "${ID:-}" == "debian" ]] || fatal "Este instalador exige Debian."
  [[ "${VERSION_ID:-}" == "13" ]] || fatal "Este instalador exige Debian 13."
  [[ "$(dpkg --print-architecture)" == "amd64" ]] ||
    fatal "A instalação automatizada do PyTorch 2.1.2 suporta CT amd64."
  command -v systemctl >/dev/null ||
    fatal "systemd não está disponível dentro deste CT."
  [[ -f "${SOURCE_DIR}/package.json" ]] ||
    fatal "Execute o script dentro do projeto DeepAudio."
  [[ "${PORT}" =~ ^[0-9]+$ ]] && ((PORT >= 1 && PORT <= 65535)) ||
    fatal "PORT deve estar entre 1 e 65535."
  [[ "${MAX_FILE_SIZE_MB}" =~ ^[0-9]+$ ]] && ((MAX_FILE_SIZE_MB > 0)) ||
    fatal "MAX_FILE_SIZE_MB deve ser um número maior que zero."
  [[ "${CLEANUP_MAX_AGE_HOURS}" =~ ^[0-9]+$ ]] &&
    ((CLEANUP_MAX_AGE_HOURS > 0)) ||
    fatal "CLEANUP_MAX_AGE_HOURS deve ser maior que zero."
  [[ "${HISTORY_LIMIT}" =~ ^[0-9]+$ ]] && ((HISTORY_LIMIT > 0)) ||
    fatal "HISTORY_LIMIT deve ser maior que zero."
  [[ "${BUILD_JOBS}" =~ ^[0-9]+$ ]] && ((BUILD_JOBS > 0)) ||
    fatal "BUILD_JOBS deve ser maior que zero."
  if [[ -n "${DOMAIN}" ]] &&
    [[ ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
    fatal "DOMAIN contém caracteres inválidos."
  fi

  local memory_mb
  local free_disk_mb
  memory_mb="$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo)"
  free_disk_mb="$(df -Pm /opt | awk 'NR == 2 {print $4}')"

  if ((memory_mb < 3072)); then
    warn "O CT possui ${memory_mb} MB de RAM. Recomenda-se pelo menos 4 GB."
  fi
  if ((free_disk_mb < 8192)); then
    warn "Há menos de 8 GB livres em /opt."
  fi
}

stop_existing_service() {
  if systemctl list-unit-files "${APP_NAME}.service" --no-legend 2>/dev/null |
    grep -q "^${APP_NAME}.service"; then
    log "Parando serviço existente para atualização segura"
    systemctl stop "${APP_NAME}.service" || true
  fi
}

install_system_packages() {
  log "Atualizando o Debian e instalando dependências do sistema"
  apt-get update
  apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    cargo \
    curl \
    ffmpeg \
    git \
    libbz2-dev \
    libffi-dev \
    libgdbm-dev \
    liblzma-dev \
    libexpat1-dev \
    libncurses-dev \
    libnss3-dev \
    libreadline-dev \
    libsqlite3-dev \
    libssl-dev \
    libuuid1 \
    nginx \
    nodejs \
    npm \
    pkg-config \
    rsync \
    rustc \
    tk-dev \
    uuid-dev \
    xz-utils \
    zlib1g-dev
}

create_service_user() {
  log "Preparando usuário e diretórios do serviço"

  if ! getent group "${APP_GROUP}" >/dev/null; then
    groupadd --system "${APP_GROUP}"
  fi

  if ! id "${APP_USER}" >/dev/null 2>&1; then
    useradd \
      --system \
      --gid "${APP_GROUP}" \
      --home-dir "${APP_DATA_DIR}" \
      --create-home \
      --shell /usr/sbin/nologin \
      "${APP_USER}"
  fi

  install -d -o root -g "${APP_GROUP}" -m 0750 "${APP_DIR}"
  install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0750 "${APP_DATA_DIR}"
  install -d -o root -g root -m 0755 "${DEEPFILTER_DIR}"
  install -d -o root -g root -m 0755 "$(dirname "${PYTHON_PREFIX}")"
}

install_python_311() {
  if [[ -x "${PYTHON_PREFIX}/bin/python3.11" ]] &&
    "${PYTHON_PREFIX}/bin/python3.11" -c \
      "import sys; raise SystemExit(sys.version_info[:3] != tuple(map(int, '${PYTHON_VERSION}'.split('.'))))"; then
    log "Python ${PYTHON_VERSION} já está instalado"
    return
  fi

  log "Compilando Python ${PYTHON_VERSION} isolado"
  local build_root
  local archive
  build_root="$(mktemp -d)"
  archive="${build_root}/Python-${PYTHON_VERSION}.tar.xz"

  curl \
    --fail \
    --location \
    --proto '=https' \
    --tlsv1.2 \
    --output "${archive}" \
    "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz"

  printf '%s  %s\n' "${PYTHON_SHA256}" "${archive}" | sha256sum --check -
  tar -xJf "${archive}" -C "${build_root}"

  pushd "${build_root}/Python-${PYTHON_VERSION}" >/dev/null
  ./configure \
    --prefix="${PYTHON_PREFIX}" \
    --enable-shared \
    --with-ensurepip=install
  make -j "${BUILD_JOBS}"
  make altinstall
  popd >/dev/null

  printf '%s\n' "${PYTHON_PREFIX}/lib" \
    >"/etc/ld.so.conf.d/deepaudio-python311.conf"
  ldconfig
  rm -rf "${build_root}"

  "${PYTHON_PREFIX}/bin/python3.11" --version
}

install_deepfilternet() {
  log "Instalando DeepFilterNet e PyTorch CPU"
  local python="${PYTHON_PREFIX}/bin/python3.11"
  local venv="${DEEPFILTER_DIR}/.venv"

  if [[ ! -x "${venv}/bin/python" ]]; then
    "${python}" -m venv "${venv}"
  fi

  "${venv}/bin/python" -m pip install --upgrade pip
  "${venv}/bin/pip" install "setuptools<82" wheel packaging "numpy<2"
  "${venv}/bin/pip" install \
    torch==2.1.2 \
    torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cpu
  "${venv}/bin/pip" install deepfilternet soundfile

  "${venv}/bin/deepFilter" --help >/dev/null
}

preload_deepfilter_model() {
  log "Baixando e validando o modelo do DeepFilterNet"
  local test_root="${APP_DATA_DIR}/install-test"
  local input_file="${test_root}/silent.wav"
  local output_dir="${test_root}/output"

  rm -rf "${test_root}"
  install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0750 "${output_dir}"

  ffmpeg \
    -hide_banner \
    -loglevel error \
    -f lavfi \
    -i anullsrc=r=48000:cl=mono \
    -t 1 \
    -c:a pcm_s16le \
    -y \
    "${input_file}"
  chown "${APP_USER}:${APP_GROUP}" "${input_file}"

  if ! runuser -u "${APP_USER}" -- env \
    HOME="${APP_DATA_DIR}" \
    XDG_CACHE_HOME="${APP_DATA_DIR}/.cache" \
    "${DEEPFILTER_DIR}/.venv/bin/deepFilter" \
    "${input_file}" \
    --pf \
    --output-dir "${output_dir}"; then
    find "${output_dir}" -maxdepth 1 -type f -name '*.wav' -print -quit |
      grep -q . ||
      fatal "O teste do DeepFilterNet falhou e não gerou áudio."
    warn "DeepFilterNet retornou warning, mas gerou o arquivo de teste."
  fi

  find "${output_dir}" -maxdepth 1 -type f -name '*.wav' -print -quit |
    grep -q . ||
    fatal "O DeepFilterNet não gerou o arquivo de teste."
  rm -rf "${test_root}"
}

deploy_application() {
  log "Copiando a aplicação para ${APP_DIR}"
  local source_real
  local target_real
  source_real="$(realpath "${SOURCE_DIR}")"
  target_real="$(realpath -m "${APP_DIR}")"

  if [[ "${source_real}" != "${target_real}" ]]; then
    rsync -a --delete \
      --exclude '.env' \
      --exclude '.git/' \
      --exclude 'frontend/dist/' \
      --exclude 'node_modules/' \
      --exclude 'storage/' \
      "${SOURCE_DIR}/" "${APP_DIR}/"
  fi

  install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0750 \
    "${APP_DIR}/storage/original" \
    "${APP_DIR}/storage/converted" \
    "${APP_DIR}/storage/processed" \
    "${APP_DIR}/storage/logs"

  chown -R root:"${APP_GROUP}" "${APP_DIR}"
  chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}/storage"
  chmod 0750 "${APP_DIR}"
}

write_environment() {
  log "Gerando configuração de produção"
  local server_origin
  local detected_ip
  detected_ip="$(hostname -I | awk '{print $1}')"

  if [[ -n "${DOMAIN}" ]]; then
    server_origin="https://${DOMAIN}"
  else
    server_origin="http://${detected_ip:-127.0.0.1}"
  fi

  cat >"${APP_DIR}/.env" <<EOF
NODE_ENV=production
PORT=${PORT}
MAX_FILE_SIZE_MB=${MAX_FILE_SIZE_MB}
FFMPEG_PATH=/usr/bin/ffmpeg
DEEPFILTER_COMMAND=${DEEPFILTER_DIR}/.venv/bin/deepFilter
STORAGE_DIR=${APP_DIR}/storage
CORS_ORIGIN=${server_origin}
CLEANUP_MAX_AGE_HOURS=${CLEANUP_MAX_AGE_HOURS}
HISTORY_LIMIT=${HISTORY_LIMIT}
LOG_LEVEL=info
VITE_API_URL=
VITE_MAX_FILE_SIZE_MB=${MAX_FILE_SIZE_MB}
HOME=${APP_DATA_DIR}
XDG_CACHE_HOME=${APP_DATA_DIR}/.cache
EOF

  chown root:"${APP_GROUP}" "${APP_DIR}/.env"
  chmod 0640 "${APP_DIR}/.env"
}

build_application() {
  log "Instalando dependências Node.js e gerando frontend"
  pushd "${APP_DIR}" >/dev/null
  npm ci
  npm run check
  npm prune --omit=dev
  popd >/dev/null

  chown -R root:"${APP_GROUP}" "${APP_DIR}"
  chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}/storage"
}

install_systemd_service() {
  log "Instalando serviço systemd"

  cat >"/etc/systemd/system/${APP_NAME}.service" <<EOF
[Unit]
Description=DeepAudio local noise removal service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/backend/src/server.js
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0027

NoNewPrivileges=true
PrivateDevices=true
PrivateTmp=true
ProtectControlGroups=true
ProtectHome=true
ProtectKernelLogs=true
ProtectKernelModules=true
ProtectKernelTunables=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}/storage ${APP_DATA_DIR}
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now "${APP_NAME}.service"
}

configure_nginx() {
  if [[ "${ENABLE_NGINX}" != "1" ]]; then
    log "Nginx desativado por ENABLE_NGINX=${ENABLE_NGINX}"
    return
  fi

  log "Configurando Nginx"
  local server_name="${DOMAIN:-_}"

  cat >"/etc/nginx/sites-available/${APP_NAME}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${server_name};

    client_max_body_size ${MAX_FILE_SIZE_MB}M;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

  ln -sfn \
    "/etc/nginx/sites-available/${APP_NAME}" \
    "/etc/nginx/sites-enabled/${APP_NAME}"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

validate_installation() {
  log "Validando serviço e dependências"
  systemctl is-active --quiet "${APP_NAME}.service" ||
    fatal "O serviço ${APP_NAME} não iniciou. Use journalctl -u ${APP_NAME}."

  local attempts=0
  local health_file
  health_file="$(mktemp)"

  until curl --silent --show-error --fail \
    "http://127.0.0.1:${PORT}/api/health" \
    --output "${health_file}"; do
    attempts=$((attempts + 1))
    if ((attempts >= 12)); then
      journalctl -u "${APP_NAME}" -n 80 --no-pager || true
      fatal "A API não ficou saudável."
    fi
    sleep 2
  done

  cat "${health_file}"
  rm -f "${health_file}"
}

print_summary() {
  local detected_ip
  detected_ip="$(hostname -I | awk '{print $1}')"

  log "Instalação concluída"
  printf '%s\n' \
    "Aplicação: http://${detected_ip:-127.0.0.1}" \
    "API local: http://127.0.0.1:${PORT}/api/health" \
    "Serviço: systemctl status ${APP_NAME}" \
    "Logs: journalctl -u ${APP_NAME} -f" \
    "Arquivos: ${APP_DIR}/storage" \
    "Configuração: ${APP_DIR}/.env"

  if [[ -n "${DOMAIN}" ]]; then
    warn "O Nginx está em HTTP. Configure TLS para https://${DOMAIN}."
  fi
}

main() {
  require_root
  check_platform
  stop_existing_service
  install_system_packages
  create_service_user
  install_python_311
  install_deepfilternet
  preload_deepfilter_model
  deploy_application
  write_environment
  build_application
  install_systemd_service
  configure_nginx
  validate_installation
  print_summary
}

main "$@"
