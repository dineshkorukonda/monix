#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-monix.dineshkorukonda.in}"
APP_PORT="${APP_PORT:-3000}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${APP_DIR:-$REPO_ROOT/web}"
APP_NAME="${APP_NAME:-monix-web}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (for example: sudo bash scripts/setup-server.sh)."
  exit 1
fi

if [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
  echo "Set LETSENCRYPT_EMAIL before running, for example:"
  echo "LETSENCRYPT_EMAIL=you@example.com sudo bash scripts/setup-server.sh"
  exit 1
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory not found: ${APP_DIR}"
  exit 1
fi

APP_USER="${SUDO_USER:-${USER}}"
if [[ "${APP_USER}" == "root" ]]; then
  APP_HOME="/root"
else
  APP_HOME="/home/${APP_USER}"
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl ca-certificates gnupg nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

if [[ ! -x "${APP_HOME}/.bun/bin/bun" ]]; then
  if [[ "${APP_USER}" == "root" ]]; then
    curl -fsSL https://bun.sh/install | bash
  else
    su - "${APP_USER}" -c 'curl -fsSL https://bun.sh/install | bash'
  fi
fi

if [[ "${APP_USER}" == "root" ]]; then
  export BUN_INSTALL="/root/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"
  cd "${APP_DIR}"
  bun install --frozen-lockfile
  bun run build
  pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
  pm2 start node_modules/.bin/next --name "${APP_NAME}" -- start -p "${APP_PORT}"
  pm2 save
  pm2 startup systemd -u root --hp /root
else
  su - "${APP_USER}" -c "export BUN_INSTALL='${APP_HOME}/.bun'; export PATH=\"\${BUN_INSTALL}/bin:\$PATH\"; cd '${APP_DIR}'; bun install --frozen-lockfile; bun run build; pm2 delete '${APP_NAME}' >/dev/null 2>&1 || true; pm2 start node_modules/.bin/next --name '${APP_NAME}' -- start -p '${APP_PORT}'; pm2 save"
  env "PATH=${PATH}:${APP_HOME}/.bun/bin" pm2 startup systemd -u "${APP_USER}" --hp "${APP_HOME}"
fi

cat > /etc/nginx/sites-available/monix <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sfn /etc/nginx/sites-available/monix /etc/nginx/sites-enabled/monix
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx

certbot --nginx --non-interactive --agree-tos -m "${LETSENCRYPT_EMAIL}" -d "${DOMAIN}" --redirect
systemctl reload nginx

echo "Deployment setup complete."
echo "Domain: https://${DOMAIN}"
echo "Next step: update environment variables for production and restart PM2 with:"
echo "  sudo -u ${APP_USER} pm2 restart ${APP_NAME}"
