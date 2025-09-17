#!/bin/bash
set -euo pipefail
shopt -s nullglob globstar
umask 077

if [ -f .env ]; then
    set -a
    source <(grep -v '^#' .env)
    set +a
fi
# Strict environment sanitization
for var in $(compgen -e); do
    case $var in
        HOME|PATH|TERM|USER|SHELL|TMPDIR|MODE|VITE_*)
            ;;
        *)
            unset "$var"
            ;;
    esac
done

readonly REQUIRED_VARS=(
    VITE_APP_WALLET_CONNECT_PROJECT_ID
    VITE_APP_DEFAULT_WS_URL
    VITE_APP_DEFAULT_WS_URL_RELAY
    VITE_APP_REGISTRAR_INDEX__PEOPLE_POLKADOT
    VITE_APP_REGISTRAR_INDEX__PEOPLE_KUSAMA
    VITE_APP_REGISTRAR_INDEX__PEOPLE_PASEO
    # VITE_APP_REGISTRAR_INDEX__PEOPLE_ROCOCO
    VITE_APP_CHALLENGES_API_URL
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var-}" ]]; then
        echo "Error: $var is not set." >&2
        exit 1
    fi
done

bun install

if [ $MODE = "development" ]; then
    echo "Running in development mode..."
    bun vite build --mode development
else
    echo "Running in production mode..."
    bun vite build --mode production
fi

echo "Build completed successfully."
