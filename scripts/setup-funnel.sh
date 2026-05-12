#!/usr/bin/env bash
# One-time bootstrap: install tailscale, auth, enable Funnel on :5173.
# Idempotent — safe to re-run.

set -euo pipefail

PORT=5173

echo "==> Verificando tailscale CLI"
if ! command -v tailscale >/dev/null 2>&1; then
  echo "    instalando via brew..."
  brew install tailscale
else
  echo "    ja instalado: $(tailscale version | head -1)"
fi

echo "==> Subindo daemon tailscaled (sudo)"
sudo brew services start tailscale || true
# Aguarda socket
for i in {1..20}; do
  if tailscale status >/dev/null 2>&1; then break; fi
  sleep 0.5
done

echo "==> Autenticando (abre browser se necessario)"
if ! tailscale status >/dev/null 2>&1; then
  sudo tailscale up
else
  STATE=$(tailscale status --json | /usr/bin/python3 -c 'import sys,json; print(json.load(sys.stdin).get("BackendState",""))')
  if [ "$STATE" != "Running" ]; then
    sudo tailscale up
  else
    echo "    ja autenticado."
  fi
fi

echo "==> Verificando habilitacao do Funnel"
echo "    (se erro: habilite em https://login.tailscale.com/admin/settings/features)"
echo "    (se HTTPS off: https://login.tailscale.com/admin/dns -> Enable HTTPS)"

echo "==> Expondo porta ${PORT} via Funnel (--bg, persiste reboot)"
sudo tailscale funnel --bg "${PORT}"

echo ""
echo "==> Status do Funnel:"
tailscale funnel status

HOST=$(tailscale status --json | /usr/bin/python3 -c 'import sys,json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')
echo ""
echo "============================================================"
echo "  URL fixa: https://${HOST}/t/renal-vida/login"
echo "============================================================"
echo ""
echo "Proximo passo: npm run dev:public"
