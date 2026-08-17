Chris 

Community Health Records and Information System is an offline-first healthcare application for community health workers in the Philippines, built with React Native (Expo), SQLite, and HAPI FHIR R4.

---

## Tech Stack

- **Frontend:** React Native, Expo SDK 54, TypeScript, Expo Router
- **Database:** SQLite (expo-sqlite) — local source of truth
- **Backend:** HAPI FHIR JPA Server (R4) + PostgreSQL
- **Standards:** HL7 FHIR R4, PH Core Implementation Guide
- **Terminology:** PSGC (complete dataset — 42,029 barangays)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npx expo`)
- Android emulator or physical device

### Install & Run

```bash
npm install
npx expo start --port 8084
```

Open on:
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

---

## Architecture

```
React Native (UI)
      ↓
SQLite (offline source of truth)
      ↓
Sync Queue (pending operations)
      ↓
HAPI FHIR Server (synchronization target)
      ↓
PostgreSQL
```

The app works **completely offline**. All data is saved locally first, then synchronized to HAPI FHIR when connectivity is available.

---

## Project Structure

```
src/
├── app/                        # Expo Router screens
│   ├── (tabs)/                 # Tab navigation
│   │   ├── index.tsx           # Home
│   │   ├── patients.tsx        # Patient list
│   │   ├── tasks.tsx           # Tasks
│   │   └── settings.tsx        # Settings
│   ├── register-patient.tsx    # Multi-step registration wizard
│   └── _layout.tsx             # Root layout (fonts, migrations)
│
├── components/
│   ├── register/               # Registration wizard steps
│   │   ├── StepBasicDemographics.tsx
│   │   ├── StepIdentifiers.tsx
│   │   ├── StepContact.tsx
│   │   ├── StepAddress.tsx
│   │   └── StepReview.tsx
│   ├── FloatingTabBar.tsx
│   └── ScrollContext.tsx
│
├── data/
│   ├── philippineAddress.ts    # PSGC lookup service (regions/provinces/cities from JSON, barangays from SQLite)
│   └── templates/              # Complete PSGC dataset (source: PSA via isaacdarcilla/philippine-addresses)
│       ├── psgc-regions.json       (17 regions, 2.2 KB)
│       ├── psgc-provinces.json     (88 provinces, 8.4 KB)
│       ├── psgc-cities.json        (1,647 cities/municipalities, 183 KB)
│       └── psgc-barangays.json     (42,029 barangays, 4.7 MB — seeded into SQLite on first launch)
│
├── db/
│   ├── database.ts             # SQLite connection
│   ├── migrations.ts           # Table creation
│   ├── resourceRepository.ts   # FHIR resource CRUD
│   └── terminologyRepository.ts
│
├── fhir/
│   ├── fhirClient.ts           # HTTP client for HAPI FHIR
│   ├── patientService.ts       # Patient operations
│   ├── encounterService.ts
│   └── observationService.ts
│
├── hooks/
│   ├── usePatients.ts          # Patient list hook
│   └── useSync.ts
│
├── models/
│   └── Patient.ts              # FHIR Patient types & form data model
│
├── sync/
│   ├── syncQueue.ts            # Queue CRUD operations
│   ├── syncService.ts          # Sync orchestration
│   ├── syncWorker.ts           # Process pending queue items
│   └── networkMonitor.ts       # Online/offline detection
│
├── terminology/
│   ├── terminologyService.ts
│   ├── valueSetService.ts
│   └── codeSystemService.ts
│
└── utils/
    ├── validation.ts           # Form validation per step
    └── patientMapper.ts        # Form data → FHIR Patient resource
```

---

## Register Patient Module

A multi-step wizard for registering patients that is PH Core-compliant and works fully offline.

### User Flow

| Step | Screen | Fields |
|------|--------|--------|
| 1 | Basic Demographics | First Name*, Middle Name, Last Name*, Sex*, Birth Date* |
| 2 | Identifiers | PhilHealth Number, PhilSys National ID, Local Health Record # |
| 3 | Contact | Mobile Number, Email Address |
| 4 | Address | Region, Province, City/Municipality, Barangay, House No./Street |
| 5 | Review & Confirm | Summary of all data with edit buttons |

### Data Flow

```
User fills form
      ↓
Validation (per step)
      ↓
mapFormToFHIRPatient() → generates PH Core-compliant FHIR R4 Patient JSON
      ↓
saveResource() → INSERT into SQLite `resources` table
      ↓
queueCreate() → INSERT into SQLite `sync_queue` table
      ↓
Navigate back to Patients list
      ↓
(Later) syncNow() → POST /Patient to HAPI FHIR
```

### PH Core Compliance

The generated Patient resource follows the PH Core Patient profile:

```json
{
  "resourceType": "Patient",
  "meta": {
    "profile": ["https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-patient"]
  },
  "active": true,
  "name": [{
    "use": "official",
    "family": "Dela Cruz",
    "given": ["Juan", "Santos"]
  }],
  "gender": "male",
  "birthDate": "1995-05-15",
  "identifier": [{
    "system": "https://www.philhealth.gov.ph/members",
    "value": "01-234567890-1"
  }],
  "address": [{
    "use": "home",
    "text": "123 Rizal St., Diliman, Quezon City, NCR",
    "country": "PH",
    "extension": [{
      "url": "https://fhir.doh.gov.ph/phcore/StructureDefinition/region",
      "valueCoding": {
        "system": "https://psa.gov.ph/classification/psgc",
        "code": "1300000000",
        "display": "NCR (National Capital Region)"
      }
    }]
  }]
}
```

### Address Extensions (PH Core)

The address field uses PH Core extensions to store coded PSGC values alongside the display text. These extensions are defined in the [PH Core Address profile](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/StructureDefinition-ph-core-address.html).

| Level | Extension URL | Context |
|-------|--------------|---------|
| Region | `https://fhir.doh.gov.ph/phcore/StructureDefinition/region` | Address |
| Province | `https://fhir.doh.gov.ph/phcore/StructureDefinition/province` | Address |
| City/Municipality | `https://fhir.doh.gov.ph/phcore/StructureDefinition/city-municipality` | Address |
| Barangay | `https://fhir.doh.gov.ph/phcore/StructureDefinition/barangay` | Address |

Each extension carries a `valueCoding` with:
- **system:** `https://psa.gov.ph/classification/psgc`
- **code:** The PSGC code (e.g., `01` for Region I, `0128` for Ilocos Norte)
- **display:** The human-readable name

Example address with all extensions:

```json
{
  "use": "home",
  "text": "123 Rizal St., Adams, Ilocos Norte, Region I (Ilocos Region)",
  "line": ["123 Rizal St."],
  "city": "Adams",
  "district": "Adams",
  "state": "Ilocos Norte",
  "country": "PH",
  "extension": [
    {
      "url": "https://fhir.doh.gov.ph/phcore/StructureDefinition/region",
      "valueCoding": {
        "system": "https://psa.gov.ph/classification/psgc",
        "code": "01",
        "display": "Region I (Ilocos Region)"
      }
    },
    {
      "url": "https://fhir.doh.gov.ph/phcore/StructureDefinition/province",
      "valueCoding": {
        "system": "https://psa.gov.ph/classification/psgc",
        "code": "0128",
        "display": "Ilocos Norte"
      }
    },
    {
      "url": "https://fhir.doh.gov.ph/phcore/StructureDefinition/city-municipality",
      "valueCoding": {
        "system": "https://psa.gov.ph/classification/psgc",
        "code": "012801",
        "display": "Adams"
      }
    },
    {
      "url": "https://fhir.doh.gov.ph/phcore/StructureDefinition/barangay",
      "valueCoding": {
        "system": "https://psa.gov.ph/classification/psgc",
        "code": "012801001",
        "display": "Adams (Pob.)"
      }
    }
  ]
}
```

---

## PSGC Address Data

### Source

The complete Philippine Standard Geographic Code (PSGC) dataset is sourced from the community-maintained repository [isaacdarcilla/philippine-addresses](https://github.com/isaacdarcilla/philippine-addresses), which is based on official PSA publications.

### Dataset

| File | Records | Size | Storage |
|------|---------|------|---------|
| `psgc-regions.json` | 17 | 2.2 KB | Bundled JSON (in-memory) |
| `psgc-provinces.json` | 88 | 8.4 KB | Bundled JSON (in-memory) |
| `psgc-cities.json` | 1,647 | 183 KB | Bundled JSON (in-memory) |
| `psgc-barangays.json` | 42,029 | 4.7 MB | Seeded into SQLite on first launch |

### How It Works Offline

- **Regions, provinces, and cities** are imported directly from JSON at build time. They're small enough to filter in-memory for instant dropdown population.
- **Barangays** (42,029 records) are loaded into a dedicated SQLite table (`barangays`) on first app launch, then queried by `city_code` via an indexed column. This keeps memory usage low and lookups fast.

```typescript
import { getRegions, getProvincesByRegion, getCitiesByProvince, getBarangaysByCity } from '@/src/data/philippineAddress';

const regions = getRegions();                         // 17 regions
const provinces = getProvincesByRegion('01');          // Provinces in Region I
const cities = getCitiesByProvince('0128');            // Cities in Ilocos Norte
const barangays = getBarangaysByCity('012801');        // Barangays in Adams
```

### Cascading Behavior

```
Region selected → filter provinces by region_code
Province selected → filter cities by province_code
City selected → query barangays from SQLite by city_code
```

Each selection clears dependent fields below it.

### Updating the Dataset

To update with newer PSA data:

```bash
# Download updated files from the source repository
curl -o src/data/templates/psgc-regions.json https://raw.githubusercontent.com/isaacdarcilla/philippine-addresses/main/region.json
curl -o src/data/templates/psgc-provinces.json https://raw.githubusercontent.com/isaacdarcilla/philippine-addresses/main/province.json
curl -o src/data/templates/psgc-cities.json https://raw.githubusercontent.com/isaacdarcilla/philippine-addresses/main/city.json
curl -o src/data/templates/psgc-barangays.json https://raw.githubusercontent.com/isaacdarcilla/philippine-addresses/main/barangay.json
```

After updating, clear the app data or uninstall/reinstall to re-seed the barangays table.

---

## PH Core FHIR Package

The app generates FHIR resources that conform to the [PH Core Implementation Guide](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/) developed by the UP Manila Standards and Interoperability Lab.

**Package source:** https://build.fhir.org/ig/UP-Manila-SILab/ph-core/package.tgz

### What's in the PH Core IG

| Resource Type | Purpose |
|---------------|---------|
| **StructureDefinitions** | Profile rules for Patient, Observation, Encounter, etc. |
| **CodeSystems** | PSGC (geographic codes), PSOC (occupations), PSCED (education), disability types |
| **ValueSets** | Curated lists of regions, provinces, cities, barangays, drugs, indigenous groups |
| **NamingSystems** | Identifier URIs for PhilHealth, PhilSys, HCPN, DOH NHFR |

### Profiles Used

| Profile | URL |
|---------|-----|
| PH Core Patient | `https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-patient` |
| PH Core Address | `https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-address` |
| PH Core Name | `https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-name` |

### Identifier Systems (NamingSystems)

| Identifier | System URI |
|------------|-----------|
| PhilHealth Member ID | `https://www.philhealth.gov.ph/members` |
| PhilSys National ID | `https://psa.gov.ph/philsys` |
| Local Health Record | `urn:oid:2.16.840.1.113883.3.88.12.80.2` |

### Relationship to PSGC Data

The PH Core IG defines the **extension URLs and coding system URI** (`https://psa.gov.ph/classification/psgc`) for address components. The actual PSGC codes come from the complete PSA dataset (bundled in `src/data/templates/`). The IG's own `CodeSystem-PSGC.json` is a fragment — we use the full dataset instead for production coverage.

---

## SQLite Schema

```sql
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  resourceType TEXT NOT NULL,
  data TEXT NOT NULL,          -- Complete FHIR JSON
  synced INTEGER DEFAULT 0     -- 0 = pending, 1 = synced
);

CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  resourceId TEXT NOT NULL,
  operation TEXT NOT NULL,     -- CREATE | UPDATE | DELETE
  status TEXT NOT NULL         -- PENDING | COMPLETED | FAILED
);

CREATE TABLE terminology_codes (
  code TEXT PRIMARY KEY,
  display TEXT,
  system TEXT
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

The `barangays` table is seeded on first launch from `psgc-barangays.json` (42,029 rows, batch-inserted in groups of 500).

---

## API Configuration

Backend HAPI FHIR server address is configured in `src/constants/api.ts`:

```typescript
export const API_URL = 'http://192.168.254.162:8080/fhir';
```


---
## Resources Terms
- Patient = Who is receiving care?
- Group = Who belongs together?
- Encounter = When did care happen?
- Observation = What was measured?

## OpenHIM

### Overview

[OpenHIM](http://openhim.org/) (Open Health Information Mediator) is the interoperability layer that connects CHRIS and Frappe Health (Marley Health) through HAPI FHIR. It provides a centralized audit trail, transaction logging, and routing for all health data exchange between systems.

### Architecture

```
┌─────────────────────┐                    ┌──────────────────┐
│   CHRIS Mobile App  │                    │   Frappe Health   │
│  (React Native)     │                    │  (Marley Health)  │
└──────────┬──────────┘                    └────────┬─────────┘
           │                                        │
           │ Direct sync                            │ Webhooks
           ▼                                        ▼
┌─────────────────────┐         ┌──────────────────────────────┐
│    HAPI FHIR R4     │◄───────►│         OpenHIM Core         │
│   (port 8080)       │         │   (Transaction Router +      │
│                     │         │    Audit Trail)               │
│   PostgreSQL        │         │   ports: 5001 HTTP, 8081 API │
└─────────────────────┘         └──────────────┬───────────────┘
                                               │
                                               ▼
                                ┌──────────────────────────────┐
                                │   Frappe-FHIR Mediator        │
                                │   (Bidirectional Transformer) │
                                │   port: 3000                  │
                                └──────────────────────────────┘
```

### Data Flow — Bidirectional Sync

#### Direction 1: CHRIS → HAPI FHIR → OpenHIM → Frappe Health

This is the primary flow when a Community Health Worker registers a patient in the CHRIS mobile app.

```
1. User creates patient in CHRIS app
2. Patient saved to SQLite (offline-first)
3. Sync queue processes when online
4. Patient POSTed directly to HAPI FHIR (port 8080)
5. Poller (every 30s) detects new/updated Patient in HAPI FHIR
6. Poller sends FHIR Patient to OpenHIM (/reverse/patient)
7. OpenHIM logs the transaction and routes to Mediator
8. Mediator transforms FHIR R4 Patient → Frappe Patient DocType
9. Mediator creates Patient in Frappe Health via REST API
```

**Loop Prevention:** Patients that originated from Frappe (identified by `http://frappe.health/patient` identifier system) are skipped by the poller to prevent infinite sync loops.

#### Direction 2: Frappe Health → OpenHIM → HAPI FHIR

This flow handles data created by clinicians or administrators in Frappe Health.

```
1. Clinician creates/updates patient in Frappe Health
2. Frappe webhook fires POST to OpenHIM (port 5001)
3. OpenHIM logs the transaction and routes to Mediator
4. Mediator transforms Frappe Patient DocType → FHIR R4 Patient
5. Mediator checks if patient exists in HAPI FHIR (by Frappe identifier)
6. Creates or updates the FHIR Patient in HAPI FHIR
7. CHRIS app picks up changes on next sync
```

### Resource Mapping

#### FHIR Patient → Frappe Patient

| FHIR R4 Field | Frappe Health Field |
|---|---|
| `name[0].given[0]` | `first_name` |
| `name[0].given[1]` | `middle_name` |
| `name[0].family` | `last_name` |
| `gender` (male/female/other) | `sex` (Male/Female/Other) |
| `birthDate` | `dob` |
| `telecom[phone].value` | `mobile` |
| `telecom[email].value` | `email` |
| `active` (true/false) | `status` (Active/Disabled) |
| `address[0].line[0]` | `address_line1` |
| `address[0].city` | `city` |
| `address[0].state` | `state` |
| `address[0].country` | `country` (mapped: PH → Philippines) |
| `address[0].postalCode` | `pincode` |
| `id` | `custom_fhir_id` (for deduplication) |

#### Frappe Patient → FHIR Patient

| Frappe Health Field | FHIR R4 Field |
|---|---|
| `name` (document ID) | `identifier[0].value` (system: `http://frappe.health/patient`) |
| `first_name` | `name[0].given[0]` |
| `middle_name` | `name[0].given[1]` |
| `last_name` | `name[0].family` |
| `sex` | `gender` |
| `dob` | `birthDate` |
| `mobile` | `telecom[0]` (system: phone, use: mobile) |
| `email` | `telecom[1]` (system: email) |
| `status` (1=active) | `active` (boolean) |
| `address_*` fields | `address[0].*` |

### OpenHIM Channels

| Channel Name | URL Pattern | Direction | Purpose |
|---|---|---|---|
| Frappe Patient to FHIR | `/frappe/patient` | Frappe → FHIR | Forward patient sync |
| Frappe Encounter to FHIR | `/frappe/encounter` | Frappe → FHIR | Forward encounter sync |
| Frappe Observation to FHIR | `/frappe/observation` | Frappe → FHIR | Forward vitals sync |
| FHIR to Frappe Patient | `/reverse/patient` | FHIR → Frappe | Reverse patient sync |
| FHIR Subscription Notifications | `/reverse/notification` | FHIR → Frappe | Subscription handler |

### Services & Ports

| Service | Port | Protocol | Purpose |
|---|---|---|---|
| HAPI FHIR | 8080 | HTTP | FHIR R4 REST API |
| PostgreSQL | 5432 | TCP | HAPI FHIR database |
| OpenHIM Core (API) | 8081 | HTTPS | Admin API (Console connects here) |
| OpenHIM Core (HTTP) | 5001 | HTTP | Transaction routing (webhooks hit here) |
| OpenHIM Console | 9000 | HTTP | Admin web UI |
| Mediator | 3000 | HTTP | Bidirectional transformation service |
| MongoDB | 27017 | TCP | OpenHIM transaction store |

### Mediator Endpoints

#### Forward (Frappe → FHIR)

```
POST /mediate/patient       - Transform Frappe Patient → FHIR Patient
POST /mediate/encounter     - Transform Frappe Encounter → FHIR Encounter
POST /mediate/observation   - Transform Frappe Vital Signs → FHIR Observations
DELETE /mediate/patient      - Delete FHIR Patient by Frappe ID
```

#### Reverse (FHIR → Frappe)

```
POST /reverse/patient       - Transform FHIR Patient → Frappe Patient
POST /reverse/encounter     - Transform FHIR Encounter → Frappe Encounter
POST /reverse/notification  - FHIR Subscription notification handler
```

#### Utility

```
GET /health                 - Health check and status
```

### Polling Mechanism

The mediator runs a polling loop every 30 seconds that:

1. Queries HAPI FHIR: `GET /Patient?_lastUpdated=gt{lastPollTime}&_count=50`
2. Filters out patients with `http://frappe.health/patient` identifier (originated from Frappe)
3. Sends remaining patients through OpenHIM → Mediator → Frappe Health
4. Tracks `lastPollTime` to only process new changes

### Console Access

```
URL:      http://localhost:9000
Email:    root@openhim.org
Password: apc-open-health
```

On first access, accept the self-signed certificate at `https://localhost:8081` before logging in.

### Quick Start

```bash
cd backend

# Start all services
docker compose up -d

# Wait for services to be healthy (~30 seconds)
docker compose ps

# Configure OpenHIM (create client + channels)
cd mediator
npm install
node src/setup/configure-openhim.js apc-open-health

# Test the forward direction (Frappe → FHIR)
Invoke-RestMethod -Uri "http://localhost:5001/frappe/patient" -Method Post `
  -ContentType "application/json" `
  -Body '{"name":"TEST-001","first_name":"Test","last_name":"Patient","sex":"Male","dob":"2000-01-01","status":1}'

# Test the reverse direction (FHIR → Frappe)
# Create a patient in HAPI FHIR and wait 30 seconds for the poller
Invoke-RestMethod -Uri "http://localhost:8080/fhir/Patient" -Method Post `
  -ContentType "application/fhir+json" `
  -Body '{"resourceType":"Patient","active":true,"name":[{"family":"Test","given":["Reverse"]}],"gender":"male"}'
```

### Connecting Frappe Health Webhooks

In your Frappe Health instance, configure webhooks on the Patient DocType:

1. Go to **Setup → Webhook → + Add Webhook**
2. Set DocType: `Patient`
3. Set Event: `after_insert` (and/or `on_update`)
4. Set URL: `http://<your-server-ip>:5001/frappe/patient`
5. Set method: `POST`
6. Map fields to the expected JSON payload

See `backend/frappe-integration/webhook-config.md` for detailed field mapping.

### Troubleshooting

```bash
# View mediator logs
docker logs frappe-fhir-mediator -f

# View OpenHIM Core logs
docker logs openhim-core -f

# View HAPI FHIR logs
docker logs hapi-fhir -f

# Restart mediator after code changes
docker compose up -d --build frappe-fhir-mediator

# Reset everything (WARNING: deletes all data)
docker compose down -v
docker compose up -d
```

| Problem | Solution |
|---|---|
| Console shows "Cannot connect to Core" | Accept self-signed cert at `https://localhost:8081` first |
| 401 Unauthorized on `/frappe/*` | Channels must be set to `authType: public` or configure client auth |
| Country code errors in Frappe | Mediator maps `PH` → `Philippines` automatically |
| Patients not appearing in Frappe | Check mediator logs for field validation errors |
| Duplicate patients in Frappe | Add `custom_fhir_id` custom field to Patient DocType in Frappe |
| Poller not syncing | Verify HAPI FHIR is reachable from mediator container |

### Directory Structure

```
backend/
├── docker-compose.yml              # All services (HAPI, PostgreSQL, OpenHIM, Mediator)
├── .env.example                    # Environment variables template
│
├── hapi/
│   └── application.yaml            # HAPI FHIR config (subscriptions enabled)
│
├── postgres/
│   └── init-databases.sql          # Creates 'hapi' database
│
├── openhim/
│   └── default.json                # Console config (points to Core on port 8081)
│
├── mediator/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                # Express server (bidirectional routes + poller)
│       ├── openhim.js              # OpenHIM registration
│       ├── fhirClient.js           # HAPI FHIR HTTP client
│       ├── frappeClient.js         # Frappe Health HTTP client
│       ├── routes/
│       │   ├── patient.js          # Frappe → FHIR Patient
│       │   ├── encounter.js        # Frappe → FHIR Encounter
│       │   ├── observation.js      # Frappe → FHIR Observations
│       │   └── fhir-to-frappe.js   # FHIR → Frappe (reverse)
│       ├── sync/
│       │   └── fhirPoller.js       # Polls HAPI FHIR, pushes to Frappe via OpenHIM
│       └── setup/
│           └── configure-openhim.js # Creates client + channels
│
├── frappe-integration/
│   ├── webhook-config.md           # Frappe webhook setup guide
│   └── openhim_connector/          # Custom Frappe app (Python)
│       ├── hooks.py
│       └── sync/
│           ├── config.py
│           ├── patient.py
│           ├── encounter.py
│           ├── observation.py
│           └── queue.py            # Retry queue with scheduler
│
└── scripts/
    ├── test-mediator.ps1           # PowerShell test script
    └── test-mediator.sh            # Bash test script
```


## References

- [HL7 FHIR R4 Patient](https://hl7.org/fhir/R4/patient.html)
- [PH Core Implementation Guide](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/)
- [PH Core Patient Profile](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/StructureDefinition-ph-core-patient.html)
- [PH Core Address Profile](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/StructureDefinition-ph-core-address.html)
- [PSGC — Philippine Statistics Authority](https://psa.gov.ph/classification/psgc)
- [PSGC Dataset (JSON)](https://github.com/isaacdarcilla/philippine-addresses)
- [Expo Documentation (v54)](https://docs.expo.dev/versions/v54.0.0/)
