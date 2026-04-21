#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-monix.dineshkorukonda.in}"
APP_PORT="${APP_PORT:-3000}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${APP_DIR:-$REPO_ROOT/web}"
APP_NAME="${APP_NAME:-monix-web}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
APP_USER="${APP_USER:-${SUDO_USER:-${USER:-}}}"
PM2_VERSION="${PM2_VERSION:-5.4.2}"

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

if [[ -z "${APP_USER}" || "${APP_USER}" == "root" ]]; then
  echo "Set APP_USER to a non-root Linux user that should run PM2."
  echo "Example: APP_USER=ubuntu LETSENCRYPT_EMAIL=you@example.com sudo bash scripts/setup-server.sh"
  exit 1
fi
APP_HOME="$(getent passwd "${APP_USER}" | cut -d: -f6)"

if [[ ! -d "${APP_HOME}" ]]; then
  echo "Home directory not found for APP_USER=${APP_USER}: ${APP_HOME}"
  exit 1
fi

run_as_app_user() {
  su - "${APP_USER}" -c "$1"
}

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl ca-certificates gnupg nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  NODE_SETUP_SCRIPT="/tmp/nodesource-setup.sh"
  curl -fsSL https://deb.nodesource.com/setup_22.x -o "${NODE_SETUP_SCRIPT}"
  bash "${NODE_SETUP_SCRIPT}"
  rm -f "${NODE_SETUP_SCRIPT}"
  apt-get install -y nodejs
fi

if ! npm install -g "pm2@${PM2_VERSION}"; then
  echo "Failed to install PM2 version ${PM2_VERSION}."
  echo "Check network/npm registry access and confirm the PM2 version exists, then retry."
  exit 1
fi

if [[ ! -x "${APP_HOME}/.bun/bin/bun" ]]; then
  BUN_INSTALL_SCRIPT="/tmp/bun-install.sh"
  curl -fsSL https://bun.sh/install -o "${BUN_INSTALL_SCRIPT}"
  chmod +x "${BUN_INSTALL_SCRIPT}"
  run_as_app_user "bash '${BUN_INSTALL_SCRIPT}'"
  rm -f "${BUN_INSTALL_SCRIPT}"
fi

if [[ ! -x "${APP_HOME}/.bun/bin/bun" ]]; then
  echo "Bun installation failed for APP_USER=${APP_USER}."
  exit 1
fi
BUN_VERSION="$(run_as_app_user "${APP_HOME}/.bun/bin/bun --version")"
echo "Using Bun version: ${BUN_VERSION}"

if ! pm2 startup systemd -u "${APP_USER}" --hp "${APP_HOME}"; then
  echo "Failed to configure PM2 startup service."
  echo "Run manually: pm2 startup systemd -u ${APP_USER} --hp ${APP_HOME}"
  exit 1
fi

APP_SETUP_SCRIPT="/tmp/monix-app-setup.sh"
cat > "${APP_SETUP_SCRIPT}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export BUN_INSTALL='${APP_HOME}/.bun'
export PATH="\${BUN_INSTALL}/bin:\$PATH"
cd '${APP_DIR}'
bun install --frozen-lockfile
bun run build
pm2 delete '${APP_NAME}' >/dev/null 2>&1 || true
pm2 start node_modules/.bin/next --name '${APP_NAME}' -- start -p '${APP_PORT}'
pm2 save
EOF
chmod +x "${APP_SETUP_SCRIPT}"
run_as_app_user "bash '${APP_SETUP_SCRIPT}'"
rm -f "${APP_SETUP_SCRIPT}"

cat > /etc/nginx/sites-available/monix <<EOF
server {
    listen 80;
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

if ! certbot --nginx --non-interactive --agree-tos -m "${LETSENCRYPT_EMAIL}" -d "${DOMAIN}" --redirect; then
  echo "Certbot failed. Check DNS for ${DOMAIN}, and ensure ports 80 and 443 are open."
  exit 1
fi
systemctl reload nginx

echo "Deployment setup complete."
echo "Domain: https://${DOMAIN}"
echo "Next step: update environment variables for production and restart PM2 with:"
echo "  sudo -u ${APP_USER} pm2 restart ${APP_NAME}"
