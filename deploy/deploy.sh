#!/bin/bash
# Скрипт деплоя ikamdocs на сервер
# Запуск: ./deploy.sh (локально — собирает и готовит) или на сервере после git pull

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "==> ikamdocs deploy"

# 1. Frontend build
echo "==> Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# 2. Копирование на сервер (если DEPLOY_TARGET задан)
if [ -n "$DEPLOY_TARGET" ]; then
  echo "==> Deploying to $DEPLOY_TARGET..."
  rsync -avz --delete \
    frontend/dist/ \
    "$DEPLOY_TARGET:/var/ikamdocs/frontend/dist/"
  rsync -avz \
    backend/ \
    "$DEPLOY_TARGET:/var/ikamdocs/backend/" \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude 'storage' \
    --exclude '.env'
  rsync -avz deploy/ikamdocs.service "$DEPLOY_TARGET:/tmp/ikamdocs.service"
  rsync -avz deploy/ikamdocs-worker.service "$DEPLOY_TARGET:/tmp/ikamdocs-worker.service"
  rsync -avz deploy/nginx-ikamdocs.conf "$DEPLOY_TARGET:/tmp/nginx-ikamdocs.conf"
  echo "==> Updating .env (DADATA, OAuth from .env.example if missing)..."
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && grep -q '^DADATA_API_KEY=' .env 2>/dev/null || (grep -E '^DADATA_' .env.example 2>/dev/null >> .env || true)"
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && grep -q '^SHOPIFY_CLIENT_ID=' .env 2>/dev/null || (grep -E '^(SHOPIFY_|WILDBERRIES_|OZON_|BASE_URL)' .env.example 2>/dev/null >> .env || true)"
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && grep -q '^SMTP_HOST=' .env 2>/dev/null || (grep -E '^(SMTP_|EMAIL_FROM|LANDING_RECIPIENTS)' .env.example 2>/dev/null >> .env || true)"
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && sed -i.bak 's|^SMTP_HOST=.*|SMTP_HOST=smtp.timeweb.ru|; s|^SMTP_PORT=.*|SMTP_PORT=465|' .env 2>/dev/null || true"
  # SMTP_PASSWORD из локального .env → сервер (если задан)
  if [ -f backend/.env ] && grep -q '^SMTP_PASSWORD=.' backend/.env; then
    echo "==> Syncing SMTP_PASSWORD to server..."
    grep '^SMTP_PASSWORD=' backend/.env | ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && (grep -v '^SMTP_PASSWORD=' .env; cat) > .env.tmp && mv .env.tmp .env && chmod 600 .env"
  fi
  echo "==> Installing Python dependencies..."
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && (test -d venv || python3 -m venv venv) && ./venv/bin/pip install -r requirements.txt -q"
  echo "==> Running migrations..."
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && chmod +x migrate.sh 2>/dev/null; sudo -u postgres bash migrate.sh"
  echo "==> Creating trader admin (if not exists)..."
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && ./venv/bin/python scripts/create_trader_admin.py 2>/dev/null || true"
  echo "==> Setting USE_WORKER_QUEUE=true..."
  ssh "$DEPLOY_TARGET" "cd /var/ikamdocs/backend && test -f .env && (grep -v '^USE_WORKER_QUEUE=' .env 2>/dev/null || true; echo 'USE_WORKER_QUEUE=true') > .env.new && mv .env.new .env"
  echo "==> Restarting backend and worker..."
  ssh "$DEPLOY_TARGET" "sudo cp /tmp/ikamdocs.service /etc/systemd/system/ && sudo cp /tmp/ikamdocs-worker.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable ikamdocs 2>/dev/null; sudo systemctl enable ikamdocs-worker 2>/dev/null; sudo systemctl restart ikamdocs && sudo systemctl restart ikamdocs-worker 2>/dev/null || sudo systemctl start ikamdocs-worker 2>/dev/null"
  echo "==> Updating nginx..."
  ssh "$DEPLOY_TARGET" "sudo cp /tmp/nginx-ikamdocs.conf /etc/nginx/sites-available/ikamdocs && sudo nginx -t && sudo systemctl reload nginx"
  echo "==> Done."
else
  echo "==> Build complete. Frontend: frontend/dist/"
  echo "==> To deploy: DEPLOY_TARGET=user@server ./deploy/deploy.sh"
fi
