// Patch fhir.js to handle missing client certificates gracefully
const fs = require('fs');
const path = '/src/server/lib/routes/fhir.js';

let content = fs.readFileSync(path, 'utf8');

// Fix the clientID detection logic - both occurrences
// The original code uses `else if` which skips header check when cert function exists
const oldPattern = /let clientID;\s*if\s*\(req\.connection && typeof req\.connection\.getPeerCertificate === "function"\)\s*\{\s*const cert = req\.connection\.getPeerCertificate\(\);\s*clientID = cert && cert\.subject \? cert\.subject\.CN : undefined;\s*\} else if\s*\(req\.headers\['x-openhim-clientid'\]\)\s*\{\s*clientID = req\.headers\['x-openhim-clientid'\];\s*\}/g;

const newCode = `let clientID;
    if(req.connection && typeof req.connection.getPeerCertificate === "function") {
      const cert = req.connection.getPeerCertificate();
      if(cert && cert.subject) clientID = cert.subject.CN;
    }
    if(!clientID && req.headers['x-openhim-clientid']) {
      clientID = req.headers['x-openhim-clientid'];
    }`;

if (content.match(oldPattern)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(path, content);
  console.log('Patched successfully (regex match)');
} else {
  // Fallback: just replace all "} else if(req.headers['x-openhim-clientid'])" with non-else version
  content = content.replace(
    /clientID = cert && cert\.subject \? cert\.subject\.CN : undefined;\s*\} else if\s*\(req\.headers\['x-openhim-clientid'\]\)/g,
    `if(cert && cert.subject) clientID = cert.subject.CN;
    }
    if(!clientID && req.headers['x-openhim-clientid'])`
  );
  fs.writeFileSync(path, content);
  console.log('Patched successfully (fallback)');
}
