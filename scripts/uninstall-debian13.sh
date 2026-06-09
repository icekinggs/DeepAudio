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
PYTHON_PREFIX="${PYTHON_PREFIX:-/opt/python/${PYTHON_VERSION}}"
REMOVE_APP_DATA="${REMOVE_APP_DATA:-1}"
REMOVE_DEEPFILTER="${REMOVE_DEEPFILTER:-1}"
REMOVE_PYTHON="${REMOVE_PYTHON:-1}"
REMOVE_SERVICE_USER="${REMOVE_SERVICE_USER:-1}"
REMOVE_NGINX_SITE="${REMOVE_NGINX_SITE:-1}"
REMOVE_SYSTEM_PACKAGES="${REMOVE_SYSTEM_PACKAGES:-0}"

log() {
  printf '\n\033[1;36m[DeepAudio uninstall]\033[0m %s\n' "$*"
}

warn() {
  printf '\n\033[1;33m[DeepAudio uninstall] AVISO:\033[0m %s\n' "$*" >&2
}

fatal() {
  printf '\n\033[1;31m[DeepAudio uninstall] ERRO:\033[0m %s\n' "$*" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  printf '\n\033[1;31m[DeepAudio uninstall] Falha na linha %s (codigo %s).\033[0m\n' \
    "${BASH_LINENO[0]}" "$exit_code" >&2
  exit "$exit_code"
}

trap on_error ERR

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fatal "Execute como root: sudo bash scripts/uninstall-debian13.sh"
  fi
}

remove_systemd_service() {
  log "Parando e removendo o servico systemd"

  if systemctl list-unit-files "${APP_NAME}.service" --no-legend 2>/dev/null |
    grep -q "^${APP_NAME}.service"; then
    systemctl stop "${APP_NAME}.service" || true
    systemctl disable "${APP_NAME}.service" || true
  fi

  rm -f "/etc/systemd/system/${APP_NAME}.service"
  systemctl daemon-reload
  systemctl reset-failed "${APP_NAME}.service" || true
}

remove_nginx_site() {
  if [[ "${REMOVE_NGINX_SITE}" != "1" ]]; then
    warn "Mantendo configuracao Nginx porque REMOVE_NGINX_SITE=${REMOVE_NGINX_SITE}"
    return
  fi

  log "Removendo site Nginx do DeepAudio"
  rm -f "/etc/nginx/sites-enabled/${APP_NAME}"
  rm -f "/etc/nginx/sites-available/${APP_NAME}"

  if command -v nginx >/dev/null 2>&1; then
    nginx -t && systemctl reload nginx || warn "Nginx nao foi recarregado; verifique nginx -t."
  fi
}

remove_application_files() {
  log "Removendo arquivos da aplicacao"
  rm -rf "${APP_DIR}"

  if [[ "${REMOVE_APP_DATA}" == "1" ]]; then
    log "Removendo dados/cache do servico"
    rm -rf "${APP_DATA_DIR}"
  else
    warn "Mantendo dados/cache em ${APP_DATA_DIR}"
  fi
}

remove_deepfilter() {
  if [[ "${REMOVE_DEEPFILTER}" != "1" ]]; then
    warn "Mantendo DeepFilterNet em ${DEEPFILTER_DIR}"
    return
  fi

  log "Removendo ambiente DeepFilterNet"
  rm -rf "${DEEPFILTER_DIR}"
}

remove_python() {
  if [[ "${REMOVE_PYTHON}" != "1" ]]; then
    warn "Mantendo Python isolado em ${PYTHON_PREFIX}"
    return
  fi

  log "Removendo Python isolado"
  rm -rf "${PYTHON_PREFIX}"
  rm -f /etc/ld.so.conf.d/deepaudio-python311.conf

  if command -v ldconfig >/dev/null 2>&1; then
    ldconfig
  fi
}

remove_service_user() {
  if [[ "${REMOVE_SERVICE_USER}" != "1" ]]; then
    warn "Mantendo usuario/grupo ${APP_USER}:${APP_GROUP}"
    return
  fi

  log "Removendo usuario e grupo do servico"

  if id "${APP_USER}" >/dev/null 2>&1; then
    userdel "${APP_USER}" || warn "Nao foi possivel remover usuario ${APP_USER}."
  fi

  if getent group "${APP_GROUP}" >/dev/null; then
    groupdel "${APP_GROUP}" || warn "Nao foi possivel remover grupo ${APP_GROUP}."
  fi
}

remove_system_packages() {
  if [[ "${REMOVE_SYSTEM_PACKAGES}" != "1" ]]; then
    warn "Pacotes do sistema foram mantidos. Use REMOVE_SYSTEM_PACKAGES=1 para remove-los."
    return
  fi

  log "Removendo pacotes instalados pelo instalador"
  apt-get remove -y \
    build-essential \
    cargo \
    curl \
    ffmpeg \
    git \
    libbz2-dev \
    libexpat1-dev \
    libffi-dev \
    libgdbm-dev \
    liblzma-dev \
    libncurses-dev \
    libnss3-dev \
    libreadline-dev \
    libsqlite3-dev \
    libssl-dev \
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
  apt-get autoremove -y
}

print_summary() {
  log "Desinstalacao concluida"
  printf '%s\n' \
    "Servico removido: ${APP_NAME}.service" \
    "Aplicacao removida: ${APP_DIR}" \
    "Dados removidos: ${REMOVE_APP_DATA}" \
    "DeepFilterNet removido: ${REMOVE_DEEPFILTER}" \
    "Python isolado removido: ${REMOVE_PYTHON}" \
    "Pacotes do sistema removidos: ${REMOVE_SYSTEM_PACKAGES}"
}

main() {
  require_root
  remove_systemd_service
  remove_nginx_site
  remove_application_files
  remove_deepfilter
  remove_python
  remove_service_user
  remove_system_packages
  print_summary
}

main "$@"
