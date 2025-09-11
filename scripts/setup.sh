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

# Only copy .env.example if we're NOT in a CI environment
# CI environments should provide their own environment variables
if [ ! -f .env ] && [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
    cp .env.example .env
    echo "Copied .env.example to .env for local development"
else
    echo "Skipping .env creation - using CI environment variables"
fi

echo "Papi setup completed successfully."
