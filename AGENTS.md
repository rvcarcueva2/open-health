# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# AGENTS.md

## Project Overview

CHRIS (Community Health Records and Information System) is an offline-first healthcare application for community health workers in the Philippines.

### Frontend

* React Native (Expo SDK 54)
* TypeScript
* Expo Router
* SQLite (`expo-sqlite`)

### Backend

* HAPI FHIR JPA Server (R4) — main clinical data store
* PostgreSQL — database for HAPI FHIR
* OpenHIM — interoperability layer / transaction router
* OpenCR — Master Patient Index (patient deduplication)
* OpenSearch — fuzzy matching engine for OpenCR
* MongoDB — OpenHIM transaction logs

### Standards

* HL7 FHIR R4
* PH Core Implementation Guide
* PSGC (Philippine Standard Geographic Code)

### Synchronization

* Custom sync queue
* Offline-first architecture
* SQLite as source of truth
* OpenHIM as routing layer (port 5001)
* Patient resources → OpenCR (deduplication) → OpenCR HAPI FHIR
* Other resources → HAPI FHIR (direct)

---

# Architecture

```text
React Native (UI)
      ↓
SQLite (offline source of truth)
      ↓
Sync Queue (pending operations)
      ↓
OpenHIM (port 5001 — transaction router)
      ├── POST/PUT /fhir/Patient → OpenCR (deduplication + golden record)
      └── POST /fhir (Bundle)    → HAPI FHIR (direct pass-through)
      ↓
HAPI FHIR (port 8080) ← PostgreSQL
OpenCR (port 3004) ← OpenSearch + OpenCR HAPI FHIR (port 8090)
```

The application MUST work without internet access.

All user actions should first persist data locally and only synchronize when connectivity is available.

---

# Important Rules

## Rule 1: SQLite is the Source of Truth

Never depend on the server for immediate UI updates.

When creating, updating, or deleting resources:

1. Save locally first.
2. Update UI from SQLite.
3. Queue synchronization.
4. Sync later.

Correct:

```text
Create Patient → SQLite → UI Updates → Sync Queue → Server
```

Incorrect:

```text
Create Patient → Server → UI
```

---

## Rule 2: Store Complete FHIR Resources

FHIR resources should be stored as complete JSON documents.

```sql
data TEXT  -- contains complete FHIR JSON
```

Do NOT flatten FHIR resources into database-specific columns.

---

## Rule 3: FHIR Compliance

All resources must follow HL7 FHIR R4 specifications and PH Core profiles where applicable.

Patient resources MUST include:
- `meta.profile` pointing to PH Core Patient
- `name[0].use: "official"`
- PSGC-coded address extensions

---

## Rule 4: Use OpenHIM for Server Communication

The mobile app communicates through OpenHIM (port 5001), NOT directly to HAPI FHIR.

```text
Mobile App → http://<server-ip>:5001/fhir/...
```

OpenHIM routes:
- `POST/PUT /fhir/Patient` → OpenCR (deduplication)
- All other `/fhir/*` → HAPI FHIR (direct)

The `x-openhim-clientid: chris-mobile` header identifies the app.

---

## Rule 5: Patient Sync Goes Through OpenCR

When syncing Patient resources:
1. Add `http://openclientregistry.org/fhir/internalid` identifier with the local patient ID
2. POST to OpenHIM `/fhir/Patient`
3. OpenHIM routes to OpenCR for deduplication
4. OpenCR assigns/links a golden record (CRUID)

Non-Patient resources (Encounter, Observation) are synced as a FHIR transaction Bundle directly to `/fhir`.

---

# Directory Structure

```text
open-health/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation
│   ├── register-patient.tsx      # Multi-step registration wizard
│   └── _layout.tsx               # Root layout
│
├── src/
│   ├── constants/
│   │   └── api.ts                # Server URL (OpenHIM port 5001)
│   │
│   ├── components/
│   │   └── register/             # Registration wizard steps
│   │
│   ├── data/
│   │   ├── philippineAddress.ts  # PSGC lookup service
│   │   └── templates/            # PSGC JSON datasets
│   │
│   ├── db/
│   │   ├── database.ts           # SQLite connection
│   │   ├── migrations.ts         # Table creation + barangay seeding
│   │   └── resourceRepository.ts # FHIR resource CRUD
│   │
│   ├── fhir/
│   │   ├── fhirClient.ts         # HTTP client
│   │   ├── patientService.ts     # Patient operations
│   │   ├── encounterService.ts
│   │   └── observationService.ts
│   │
│   ├── models/
│   │   └── Patient.ts            # FHIR Patient types
│   │
│   ├── sync/
│   │   ├── syncQueue.ts          # Queue CRUD
│   │   ├── syncWorker.ts         # Process queue (OpenCR routing)
│   │   ├── syncService.ts        # Sync orchestration
│   │   └── networkMonitor.ts     # Online/offline detection
│   │
│   ├── hooks/
│   │   ├── usePatients.ts
│   │   └── useSync.ts
│   │
│   └── utils/
│       ├── validation.ts         # Form validation
│       └── patientMapper.ts      # Form → FHIR Patient
│
├── backend/
│   ├── docker-compose.yml        # All services
│   ├── hapi/
│   │   └── application.yaml     # HAPI FHIR config (subscriptions, DB)
│   ├── postgres/
│   │   └── init-databases.sql
│   ├── openhim/
│   │   ├── default.json         # Console config
│   │   └── README.md
│   ├── opencr/
│   │   ├── config.json          # OpenCR config (DO NOT mount :ro)
│   │   ├── decisionRules.json   # Patient matching rules
│   │   ├── entrypoint.sh        # Container startup patches
│   │   ├── generate-certs.sh    # TLS cert generator (run once per dev)
│   │   ├── certs/               # .gitignored — generate locally
│   │   └── README.md
│   ├── mediator/                # Frappe-FHIR bidirectional transformer
│   └── scripts/
│       └── configure-openhim-opencr.js  # Channel setup
```

---

# SQLite Tables

```sql
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  resourceType TEXT NOT NULL,
  data TEXT NOT NULL,
  synced INTEGER DEFAULT 0
);

CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  resourceId TEXT NOT NULL,
  operation TEXT NOT NULL,     -- CREATE | UPDATE | DELETE
  status TEXT NOT NULL         -- PENDING | COMPLETED | FAILED
);

CREATE TABLE barangays (
  brgy_code TEXT PRIMARY KEY,
  brgy_name TEXT NOT NULL,
  city_code TEXT NOT NULL,
  province_code TEXT NOT NULL,
  region_code TEXT NOT NULL
);

CREATE INDEX idx_barangays_city_code ON barangays(city_code);
```

---

# Synchronization Workflow

## Patient Sync (via OpenCR)

```text
User Creates Patient
      ↓
Save to SQLite (resources table)
      ↓
Queue CREATE (sync_queue table)
      ↓
syncWorker detects pending items
      ↓
Add internalid identifier to Patient
      ↓
POST to OpenHIM /fhir/Patient (with x-openhim-clientid header)
      ↓
OpenHIM routes to OpenCR
      ↓
OpenCR deduplicates → assigns CRUID
      ↓
Stored in OpenCR HAPI FHIR + indexed in OpenSearch
```

## Non-Patient Sync (direct to HAPI FHIR)

```text
Encounters + Observations queued
      ↓
syncWorker builds FHIR Transaction Bundle
      ↓
POST to OpenHIM /fhir (Bundle)
      ↓
OpenHIM routes to HAPI FHIR
      ↓
HAPI FHIR processes transaction
```

---

# API Configuration

The mobile app connects to OpenHIM (NOT directly to HAPI FHIR):

```text
http://<server-ip>:5001/fhir
```

Configured in `src/constants/api.ts`:

```ts
export const API_URL = 'http://<YOUR_IP>:5001/fhir';
```

Replace `<YOUR_IP>` with the IP of the machine running Docker services.

---

# Backend Setup (Any Machine)

```bash
cd backend/opencr
bash generate-certs.sh        # One-time: generates TLS certs for OpenCR
cd ..
docker compose up -d          # Starts all 9 services
# Wait ~90 seconds for initialization
node scripts/configure-openhim-opencr.js apc-open-health  # One-time: creates channels
```

---

# OpenCR Decision Rules

Current matching (single rule, deterministic/sum mode):

| Field | Algorithm | Threshold | Weight |
|-------|-----------|-----------|--------|
| Given name | jaro-winkler | ≥ 0.8 | 1 |
| Family name | jaro-winkler | ≥ 0.9 | 1 |
| Birth date | exact | 1.0 | 1 |
| Gender | exact | 1.0 | 1 |

Score = match_all(1.0) + sum of matched field weights.
- **autoMatchThreshold: 5** (all 4 fields must match)
- **potentialMatchThreshold: 4** (3 fields match → manual review)

**No national ID rule** — the record-linkage plugin treats empty strings as valid matches (`"" == ""` = 1.0). National ID matching should only be added after patching OpenCR's indexing to omit empty fields.

---

# Logging Requirements

When implementing features, log:

1. SQLite writes
2. Queue creation
3. Sync attempts (with resource type and ID)
4. Server responses (status + body snippet)
5. Errors

---

# Coding Standards

* Use TypeScript
* Use async/await
* Avoid deeply nested logic
* Prefer repository/service patterns
* Keep FHIR logic inside `src/fhir`
* Keep SQLite logic inside `src/db`
* Keep synchronization logic inside `src/sync`
* Do not mix UI code with persistence logic
* Follow PH Core IG for resource profiles
