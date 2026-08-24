#!/bin/bash
# Generate self-signed TLS certificates for OpenCR
# OpenCR requires HTTPS — this creates a dev cert valid for 365 days.
#
# Usage:
#   cd backend/opencr
#   bash generate-certs.sh
#
# On Windows (Git Bash or WSL):
#   bash generate-certs.sh
#
# Requires: openssl

set -e

CERT_DIR="$(dirname "$0")/certs"
mkdir -p "$CERT_DIR"

echo "Generating self-signed TLS certificate for OpenCR..."

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server_key.pem" \
  -out "$CERT_DIR/server_cert.pem" \
  -subj "/C=PH/ST=Metro Manila/L=Manila/O=OpenHealth/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:opencr,IP:127.0.0.1"

echo ""
echo "✓ Certificates generated:"
echo "  $CERT_DIR/server_cert.pem"
echo "  $CERT_DIR/server_key.pem"
echo ""
echo "These are .gitignored (*.pem) — each developer generates their own."
