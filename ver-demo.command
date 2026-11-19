#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then echo "Falta instalar Node.js: https://nodejs.org (botón LTS)"; read -n1; exit 1; fi
[ -d node_modules ] || { echo "Instalando, la primera vez tarda unos minutos..."; npm install; }
npm run demo
