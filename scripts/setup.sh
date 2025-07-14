#!/bin/bash
set -euo pipefail

if [ ! -d node_modules ]; then
    bun install || true
fi

# Wait for the descriptors to be downloaded. This is a workaround because it's likely to fail
# by not generating the descriptors on the first try.
bun add polkadot-api@latest
attempts=10
while [ ! -d .papi/descriptors/dist ]; do
    bunx polkadot-api@latest update || true
    attempts=$((attempts - 1))
    if [ $attempts -eq 0 ]; then
        echo "Failed to download descriptors"
        exit 1
    fi
done

if [ ! -f .env ]; then
    cp .env.example .env
fi

echo "Papi setup completed successfully."
