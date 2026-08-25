# OpenCR (Open Client Registry)

## What is OpenCR?

OpenCR is a **Master Patient Index (MPI)** — it deduplicates patients across CHRIS and external systems by assigning each unique patient a single enterprise identifier (CRUID / golden record ID). When the same patient is registered from multiple facilities or devices, OpenCR detects the duplicate and links them to one golden record.

### Why do we need it?

Without an MPI, the same patient registered at two health centers would appear as two separate records. OpenCR solves this by:

- Comparing incoming patients against the existing registry using configurable matching rules
- Assigning a CRUID (Client Registry Unique ID) — the single source of truth for patient identity
- Flagging potential duplicates for manual review
- Supporting both exact (deterministic) and fuzzy (probabilistic) matching

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CHRIS Mobile App                              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ POST /fhir/Patient
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    OpenHIM (port 5001)                                │
│                    Routes /fhir/Patient → OpenCR                      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    OpenCR (port 3004 HTTPS / 3001 HTTP)               │
│                    Decision Rules Engine                              │
│                                                                      │
│   Demographic match: jaro-winkler on name + exact DOB + exact gender │
│                                                                      │
│   Score ≥ 5 (all match)  → link to existing golden record            │
│   Score ≥ 4 (3 match)   → flag for manual review                    │
│   Score < 4 (no match)  → create new golden record                  │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │                                  │
                ▼                                  ▼
┌───────────────────────────────┐  ┌───────────────────────────────────┐
│  OpenCR HAPI FHIR (port 8090) │  │     OpenSearch (port 9200)        │
│  Stores source + golden       │  │     Fuzzy matching index          │
│  patient records              │  │     (jaro-winkler, levenshtein)   │
├───────────────────────────────┤  └───────────────────────────────────┘
│  PostgreSQL (internal)        │
│  Database for OpenCR FHIR     │
└───────────────────────────────┘
```

---

## Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| OpenCR | `opencr` | 3004 (HTTPS) | Client registry API + Web UI |
| OpenCR HAPI FHIR | `opencr-fhir` | 8090 | Internal demographics store |
| OpenCR PostgreSQL | `opencr-postgres` | (internal) | Database for OpenCR HAPI FHIR |
| OpenSearch | `opensearch` | 9200 | Fuzzy matching index (jaro-winkler, levenshtein) |

---

## Setup Guide

### Prerequisites

- Docker & Docker Compose
- OpenSSL (for generating TLS certificates)
- Git Bash or WSL (on Windows, for running shell scripts)

### Step 1: Generate TLS Certificates

OpenCR **only serves HTTPS** — it requires TLS certificates to start. These are `.gitignored` (matched by `*.pem` in the root `.gitignore`), so each developer must generate their own:

```bash
cd backend/opencr
bash generate-certs.sh
```

This creates:
- `certs/server_cert.pem` — self-signed certificate
- `certs/server_key.pem` — private key

> **Why certs?** OpenCR's Node.js server is hardcoded to serve only HTTPS. Without the cert/key files mounted, the container crashes on startup. They're self-signed dev certs — browsers will show a security warning you need to accept.

### Step 2: Start Services

```bash
cd backend
docker compose up -d opencr-postgres opensearch opencr-fhir opencr
```

Wait ~60-90 seconds for OpenSearch and HAPI FHIR to initialize, then verify:

```bash
docker logs opencr --tail 10
```

You should see:
```
Server is running and listening on port: 3000
All plugins are available
Jaro winkler loaded successfully
Done loading Default data
```

### Step 3: Access the Console

```
URL:      https://localhost:3004/crux/
Username: root@intrahealth.org
Password: intrahealth
```

Accept the self-signed certificate warning in your browser.

---

## Decision Rules (Current Configuration)

Only **one rule** is active — demographic matching using OpenSearch's `record-linkage` plugin:

| Field | Algorithm | Threshold | Weight |
|-------|-----------|-----------|--------|
| Given name | jaro-winkler-similarity | ≥ 0.8 | 1 |
| Family name | jaro-winkler-similarity | ≥ 0.9 | 1 |
| Birth date | exact (levenshtein = 1.0) | — | 1 |
| Gender | exact (levenshtein = 1.0) | — | 1 |

### Scoring

OpenSearch returns a score = `match_all(1.0)` + sum of matched field weights.

- **Score 5** (all 4 fields match) → **auto-match** — linked to existing golden record
- **Score 4** (3 fields match) → **potential match** — flagged for manual review in console
- **Score < 4** → **no match** — new golden record created

### Why no National ID Rule?

The PhilHealth/PhilSys deterministic rule was removed because of a bug in the `record-linkage` OpenSearch plugin: when both the incoming patient and the indexed patient have empty identifier fields (`""`), the plugin computes `levenshtein("", "") = 1.0` (perfect match) instead of treating empty strings as null. This caused ALL patients without national IDs to be incorrectly matched to each other.

**To re-enable national ID matching in the future:**
1. Patch OpenCR's indexing logic to NOT write empty strings to OpenSearch (omit the field entirely when null)
2. Or add a filter to the decision rule that only activates when the identifier is present

---

## Configuration Files

### config.json

Main configuration. Key settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `fhirServer.baseURL` | `http://fhir:8080/fhir` | OpenCR's internal HAPI FHIR (uses Docker network alias) |
| `elastic.server` | `http://opensearch:9200` | OpenSearch for matching |
| `elastic.index` | `patients` | Index name for patient demographics |
| `app.installed` | auto-set | Controls whether default data is seeded on startup |
| `matching.tool` | `elasticsearch` | Use OpenSearch for matching (not FHIR-based) |
| `cronJobs.patientReprocessing` | `0 21 * * *` | Daily reprocessing at 9 PM |

> **Important:** Do NOT mount `config.json` as read-only (`:ro`). OpenCR writes `"installed": true` to this file after first-time setup. If you reset the data volumes, you must also set `"installed": false` in config.json so OpenCR re-seeds default data (admin user, search parameters, structure definitions).

### decisionRules.json

The matching rules evaluated by OpenSearch. See "Decision Rules" section above.

### entrypoint.sh

Custom entrypoint that patches OpenCR source code at container startup:
- Fixes a crash when client certificates are missing (`cert.subject.CN`)
- Enables `x-openhim-clientid` header authentication (for OpenHIM integration)
- Skips JWT auth for requests from OpenHIM (identified by `X-OpenHIM-TransactionID` header)
- Creates an HTTP proxy (port 3001) for internal OpenHIM routing (OpenHIM can't easily talk HTTPS to OpenCR)

---

## OpenSearch Requirements

The `intrahealth/opensearch:latest` image is required because it includes:
- **`analysis-phonetic`** — phonetic matching algorithms
- **`record-linkage`** — string similarity scoring (jaro-winkler, levenshtein, normalized-levenshtein)

Do **not** substitute with vanilla `opensearchproject/opensearch` — OpenCR will fail with "plugin is missing" errors.

---

## How Patients Flow Through OpenCR

```
1. CHRIS app creates patient → saves to SQLite → queues sync
2. Sync worker POSTs patient to OpenHIM (port 5001, /fhir/Patient)
3. OpenHIM channel routes /fhir/Patient to OpenCR (port 3001, HTTP proxy)
4. OpenCR receives patient, adds internalid identifier
5. OpenCR queries OpenSearch with demographic fields
6. OpenSearch returns scored matches using record-linkage plugin
7. OpenCR evaluates scores against thresholds:
   - ≥ autoMatchThreshold → link to existing golden record
   - ≥ potentialMatchThreshold → flag for review
   - < potentialMatchThreshold → create new golden record
8. Patient + golden record stored in OpenCR HAPI FHIR
9. Patient indexed in OpenSearch for future matching
```

---

## Console Features

The OpenCR console (`https://localhost:3004/crux/`) allows you to:

- **Search patients** by name, identifier, or date of birth
- **View golden records** — see which source records are linked together
- **Review potential matches** — manually confirm or reject flagged duplicates
- **Break links** — unlink incorrectly matched records
- **View audit trail** — see matching decisions and history

---

## Resetting OpenCR Data

When you need a clean slate (e.g., after changing decision rules):

```bash
cd backend

# Stop OpenCR services
docker compose stop opencr opencr-fhir opencr-postgres opensearch

# Remove containers
docker compose rm -f opencr opencr-fhir opencr-postgres opensearch

# Delete data volumes
docker volume rm backend_opencr-postgres-data backend_opensearch-data

# Set installed: false in config.json so default data re-seeds
# (edit backend/opencr/config.json → "installed": false)

# Restart
docker compose up -d opencr-postgres opensearch opencr-fhir opencr
```

> After reset, wait ~60-90s and check `docker logs opencr` for "Done loading Default data" before logging in.

---

## Querying OpenCR's HAPI FHIR (Port 8090)

OpenCR stores all patient records in its own dedicated HAPI FHIR instance at `http://localhost:8090/fhir`. This is separate from the main HAPI FHIR (port 8080).

### All Patients (source + golden)

```
http://localhost:8090/fhir/Patient?_count=50
```

### Golden Records Only (unique/deduplicated patients)

The golden record tag has **no system URI** — it uses a bare code from `config.json` → `codes.goldenRecord`:

```
http://localhost:8090/fhir/Patient?_tag=5c827da5-4858-4f3d-a50c-62ece001efea
```

> **Note:** System-qualified queries like `_tag=http://openclientregistry.org/fhir|5c827da5-...` will return 0 results because OpenCR stores the tag without a system.

### Understanding the Records

Golden records have:
- `meta.tag[].code = "5c827da5-4858-4f3d-a50c-62ece001efea"` with `display = "Golden Record"`
- `link[]` entries with `type = "seealso"` pointing to the source patients that were matched into this identity

Source records (submitted by CHRIS) have:
- `link[]` with `type = "refer"` pointing UP to their golden record
- The `internalid` identifier added by the sync worker

### Other Useful Queries

```
# Search by name
http://localhost:8090/fhir/Patient?name=Juan

# Search by identifier (internalid)
http://localhost:8090/fhir/Patient?identifier=http://openclientregistry.org/fhir/internalid|<local-id>

# Specific patient by ID
http://localhost:8090/fhir/Patient/<id>
```

---

## Troubleshooting

```bash
# View OpenCR logs
docker logs opencr -f

# View OpenSearch logs
docker logs opensearch -f

# Check if OpenSearch is ready
curl http://localhost:9200/_cluster/health

# Check OpenSearch plugins
curl http://localhost:9200/_cat/plugins

# Check OpenCR HAPI FHIR
curl http://localhost:8090/fhir/metadata

# Check what's indexed in OpenSearch
curl -X POST http://localhost:9200/patients/_search -H "Content-Type: application/json" -d '{"query":{"match_all":{}}}'

# Restart OpenCR after config changes
docker compose restart opencr
```

### Common Issues

| Problem | Solution |
|---------|----------|
| OpenCR crashes on start | Missing TLS certs. Run `bash generate-certs.sh` first. |
| OpenCR keeps restarting | OpenSearch or HAPI FHIR not ready. Wait 60-90s. Check `docker logs opencr`. |
| "Phonetic plugin is missing" | Using vanilla OpenSearch. Must use `intrahealth/opensearch:latest`. |
| "String similarity plugin is missing" | Same — use `intrahealth/opensearch:latest`. |
| Cannot access `https://localhost:3004` | Accept self-signed certificate in browser. |
| Login failed | Check if default data was seeded. Set `"installed": false` in config.json and restart. |
| All patients get same CRUID | Decision rule is false-matching on empty fields. Check `decisionRules.json`. |
| "EROFS: read-only file system" | Don't mount config.json with `:ro`. OpenCR writes to it. |
| DNS "no such host: fhir" | `opencr-fhir` needs network alias `fhir` in docker-compose. |
