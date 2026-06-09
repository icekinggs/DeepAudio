# Desinstalacao no Debian 13

Use este script para desfazer a instalacao automatizada feita por
`scripts/install-debian13.sh`.

## Uso padrao

```bash
sudo bash scripts/uninstall-debian13.sh
```

Por padrao, o script remove:

- servico systemd `deepaudio`;
- site Nginx do DeepAudio;
- aplicacao em `/opt/deepaudio`;
- dados/cache em `/var/lib/deepaudio`;
- ambiente DeepFilterNet em `/opt/deepfilternet`;
- Python isolado em `/opt/python/3.11.15`;
- usuario e grupo `deepaudio`.

Pacotes do sistema como Nginx, Node.js, npm, FFmpeg, Git e Rust sao mantidos
por seguranca, pois podem ser usados por outros servicos.

## Remover tambem os pacotes do sistema

```bash
sudo REMOVE_SYSTEM_PACKAGES=1 bash scripts/uninstall-debian13.sh
```

## Manter dados e cache

```bash
sudo REMOVE_APP_DATA=0 bash scripts/uninstall-debian13.sh
```

## Manter DeepFilterNet ou Python isolado

```bash
sudo REMOVE_DEEPFILTER=0 REMOVE_PYTHON=0 bash scripts/uninstall-debian13.sh
```

## Variaveis principais

| Variavel | Padrao | Finalidade |
| --- | --- | --- |
| `APP_NAME` | `deepaudio` | Nome do servico systemd e site Nginx |
| `APP_USER` | `deepaudio` | Usuario do servico |
| `APP_GROUP` | `deepaudio` | Grupo do servico |
| `APP_DIR` | `/opt/deepaudio` | Diretorio da aplicacao |
| `APP_DATA_DIR` | `/var/lib/deepaudio` | Dados/cache do servico |
| `DEEPFILTER_DIR` | `/opt/deepfilternet` | Ambiente DeepFilterNet |
| `PYTHON_PREFIX` | `/opt/python/3.11.15` | Python isolado compilado pelo instalador |
| `REMOVE_APP_DATA` | `1` | Remove dados/cache |
| `REMOVE_DEEPFILTER` | `1` | Remove ambiente DeepFilterNet |
| `REMOVE_PYTHON` | `1` | Remove Python isolado |
| `REMOVE_SERVICE_USER` | `1` | Remove usuario e grupo do servico |
| `REMOVE_NGINX_SITE` | `1` | Remove site Nginx do DeepAudio |
| `REMOVE_SYSTEM_PACKAGES` | `0` | Remove pacotes do sistema instalados pelo instalador |
