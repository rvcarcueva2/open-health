#!/bin/sh
# Patch OpenCR fhir.js to handle missing client certificates
# Changes "} else if(req.headers['x-openhim-clientid'])" to fall-through logic

sed -i 's/clientID = cert\.subject\.CN;/if(cert \&\& cert.subject) clientID = cert.subject.CN;/' /src/server/lib/routes/fhir.js
sed -i 's/} else if(req\.headers\[.x-openhim-clientid.\])/}\n    if(!clientID \&\& req.headers[\x27x-openhim-clientid\x27])/' /src/server/lib/routes/fhir.js

echo "OpenCR patched for clientID fallback"
