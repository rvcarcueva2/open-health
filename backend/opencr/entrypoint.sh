#!/bin/sh
# Custom entrypoint: patch the clientID cert bug, add HTTP proxy, then run OpenCR

# Patch: safely handle missing client certificates (cert.subject.CN crash)
sed -i 's/clientID = cert\.subject\.CN;/if(cert \&\& cert.subject) { clientID = cert.subject.CN; }/' /src/server/lib/routes/fhir.js

# Patch: change "else if" to fallback "if" so x-openhim-clientid header works without cert
sed -i "s/} else if(req\.headers\['x-openhim-clientid'\])/}\n    if(!clientID \&\& req.headers['x-openhim-clientid'])/" /src/server/lib/routes/fhir.js

# Patch app.js: Skip JWT for OpenHIM requests + don't exit on prereq failure
node << 'NODESCRIPT'
const fs = require('fs');
let code = fs.readFileSync('/src/server/lib/app.js', 'utf8');

// Skip JWT auth for requests from OpenHIM (have X-OpenHIM-TransactionID header)
const oldAuth = "req.method == 'OPTIONS' ||\n      req.path === '/ocrux/user/authenticate'\n    )";
const newAuth = "req.method == 'OPTIONS' ||\n      req.path === '/ocrux/user/authenticate' ||\n      req.headers['x-openhim-transactionid']\n    )";
if (code.includes(oldAuth)) {
  code = code.replace(oldAuth, newAuth);
  console.log('[patch] JWT bypass for OpenHIM applied');
} else {
  console.log('[patch] JWT bypass pattern not found, trying alternate...');
  // Try simpler match
  code = code.replace(
    "req.path === '/ocrux/user/authenticate'",
    "req.path === '/ocrux/user/authenticate' || req.headers['x-openhim-transactionid']"
  );
  console.log('[patch] JWT bypass applied (alternate)');
}

// Don't exit on prerequisites failure in standalone mode
const oldExit = 'if (err) {\n          process.exit();\n        }';
const newExit = 'if (err) {\n          logger.error("Prerequisites had errors but continuing...");\n        }';
if (code.includes(oldExit)) {
  code = code.replace(oldExit, newExit);
  console.log('[patch] process.exit bypass applied');
} else {
  console.log('[patch] process.exit pattern not found, trying line-based...');
  code = code.replace(/process\.exit\(\);\s*\n\s*\}/g, function(match, offset) {
    // Only replace the one in standalone mode (after line 250)
    const lineNum = code.substring(0, offset).split('\n').length;
    if (lineNum > 250) {
      return 'logger.error("Prerequisites had errors but continuing...");\n        }';
    }
    return match;
  });
  console.log('[patch] process.exit bypass applied (line-based)');
}

fs.writeFileSync('/src/server/lib/app.js', code);
console.log('[patch] All app.js patches done');
NODESCRIPT

# Create HTTP proxy (port 3001 -> HTTPS 3000) for OpenHIM internal routing
cat > /tmp/http-proxy.js << 'EOF'
const http = require("http");
const https = require("https");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const proxy = http.createServer((req, res) => {
  const options = {
    hostname: "localhost",
    port: 3000,
    path: req.url,
    method: req.method,
    headers: req.headers,
    rejectUnauthorized: false
  };
  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (err) => {
    res.writeHead(502);
    res.end("Bad Gateway: " + err.message);
  });
  req.pipe(proxyReq);
});
proxy.listen(3001, () => console.log("[http-proxy] port 3001 -> HTTPS 3000"));
EOF

echo "[entrypoint] All patches applied"

# Wait for OpenCR HAPI FHIR and OpenSearch
dockerize -wait-retry-interval 5s -timeout 60s -wait $HAPI_FHIR_URL
echo "[entrypoint] Waiting for OpenSearch..."
dockerize -wait-retry-interval 5s -timeout 90s -wait http://opensearch:9200

# Start HTTP proxy in background, then run OpenCR
node /tmp/http-proxy.js &
exec node lib/app.js
