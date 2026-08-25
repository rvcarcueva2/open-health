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
- Docker & Docker Compose (for backend services)
- OpenSSL (for generating OpenCR certificates)
- Git Bash or WSL (Windows only, for running shell scripts)

### 1. Backend Setup

The backend must be running before the mobile app can sync data.

```bash
cd backend

# Generate OpenCR TLS certificates (required, one-time)
cd opencr
bash generate-certs.sh
cd ..

# Start all services
docker compose up -d

# Wait ~90 seconds for all services to initialize, then verify:
docker compose ps
docker logs opencr --tail 5   # Should show "Done loading Default data"
```

Services that will start:
| Service | Port | Purpose |
|---------|------|---------|
| HAPI FHIR | 8080 | Main clinical data store |
| OpenHIM (HTTP) | 5001 | Transaction router (mobile app connects here) |
| OpenHIM Console | 9000 | Admin UI for OpenHIM |
| OpenCR | 3004 | Patient deduplication / MPI (HTTPS) |
| OpenCR HAPI FHIR | 8090 | Internal demographics store |
| OpenSearch | 9200 | Fuzzy matching engine |
| PostgreSQL | 5432 | Database for HAPI FHIR |
| MongoDB | — | OpenHIM transaction store |

### 2. Configure the Mobile App

Update `src/constants/api.ts` with your machine's local IP:

```typescript
export const API_URL = 'http://<YOUR_IP>:5001/fhir';
```

Find your IP:
- **Windows:** Run `ipconfig` → Wi-Fi/Ethernet IPv4 address (e.g., `192.168.1.100`)
- **macOS:** Run `ifconfig en0` → `inet` address
- **Linux:** Run `ip addr show` → look for your LAN IP

### 3. Install & Run the App

```bash
npm install
npx expo start --port 8084
```

Open on:
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

> **Note:** The app works fully offline. Backend services are only needed for synchronization.

---

## Architecture

```
┌─────────────────────────────────┐
│       React Native (UI)         │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│         SQLite (offline)        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       Sync Queue (pending )     │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│        OpenHIM (port 5001 — transaction router)     │
├──────────────────────────┬──────────────────────────┤
│  POST/PUT /fhir/Patient  │     POST /fhir (Bundle)  │
└────────────┬─────────────┴─────────────┬────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐   ┌────────────────────────┐
│   OpenCR (port 3004)   │   │  HAPI FHIR (port 8080) │
│   Patient Deduplication│   │  Clinical Data Store   │
├────────────────────────┤   ├────────────────────────┤
│  OpenSearch (port 9200)│   │  PostgreSQL (port 5432)│
│  OpenCR HAPIFHIR (8090)│   │                        │
└────────────────────────┘   └────────────────────────┘
```

The app works **completely offline**. All data is saved locally first, then synchronized when connectivity is available. Patient resources are routed through OpenCR for deduplication, while clinical resources (Encounters, Observations) go directly to HAPI FHIR.

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

The backend server address is configured in `src/constants/api.ts`:

```typescript
// OpenHIM HTTP transaction port — routes Patient to OpenCR, everything else to HAPI FHIR
export const API_URL = 'http://<YOUR_SERVER_IP>:5001/fhir';
```

Replace `<YOUR_SERVER_IP>` with the IP address of the machine running the backend Docker services. To find your IP:

- **Windows:** `ipconfig` → look for your Wi-Fi or Ethernet IPv4 address
- **macOS/Linux:** `ifconfig` or `ip addr` → look for your local network IP (e.g., 192.168.x.x)

> The mobile app connects to OpenHIM (port 5001), which routes Patient resources through OpenCR for deduplication, and all other resources directly to HAPI FHIR.


---
## Resources Terms
- Patient = Who is receiving care?
- Group = Who belongs together?
- Encounter = When did care happen?
- Observation = What was measured?

## OpenHIM

### Overview

[OpenHIM](http://openhim.org/) (Open Health Information Mediator) is the interoperability layer that routes all mobile app traffic to the correct backend service. It provides a centralized audit trail, transaction logging, and intelligent routing.

### Routing

```
┌─────────────────────┐
│   CHRIS Mobile App  │
│  (React Native)     │
└──────────┬──────────┘
           │
           │ POST /fhir/...
           ▼
┌──────────────────────────────┐
│         OpenHIM Core         │
│   (Transaction Router +      │
│    Audit Trail)              │
│   ports: 5001 HTTP, 8081 API │
└──────────┬───────────────────┘
           │
           ├── /fhir/Patient ──────→ OpenCR (port 3001) → deduplication
           │
           └── /fhir (everything else) ──→ HAPI FHIR (port 8080)
```

### Services & Ports

| Service | Port | Protocol | Purpose |
|---|---|---|---|
| OpenHIM Core (HTTP) | 5001 | HTTP | Transaction routing (mobile app connects here) |
| OpenHIM Core (API) | 8081 | HTTPS | Admin API (Console connects here) |
| OpenHIM Console | 9000 | HTTP | Admin web UI |
| MongoDB | 27017 | TCP | OpenHIM transaction store |

### Console Access

```
URL:      http://localhost:9000
Email:    root@openhim.org
Password: apc-open-health
```

On first access, accept the self-signed certificate at `https://localhost:8081` before logging in.

### Channels

| Channel | URL Pattern | Routes To | Purpose |
|---|---|---|---|
| OpenCR Patient | `/fhir/Patient` | OpenCR (port 3001) | Patient deduplication |
| HAPI FHIR | `/fhir` | HAPI FHIR (port 8080) | All other FHIR resources |

### Headers

The mobile app includes the following header on all requests:

```
x-openhim-clientid: chris-mobile
```

### Troubleshooting

```bash
# View OpenHIM Core logs
docker logs openhim-core -f

# Check transaction log via API
curl -k https://localhost:8081/transactions -H "Authorization: Basic ..."
```

| Problem | Solution |
|---|---|
| Console shows "Cannot connect to Core" | Accept self-signed cert at `https://localhost:8081` first |
| 401 Unauthorized | Verify `chris-mobile` client exists and channel auth is correct |
| Patient not reaching OpenCR | Check OpenHIM channel routing and OpenCR logs |


## References

- [HL7 FHIR R4 Patient](https://hl7.org/fhir/R4/patient.html)
- [PH Core Implementation Guide](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/)
- [PH Core Patient Profile](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/StructureDefinition-ph-core-patient.html)
- [PH Core Address Profile](https://build.fhir.org/ig/UP-Manila-SILab/ph-core/StructureDefinition-ph-core-address.html)
- [PSGC — Philippine Statistics Authority](https://psa.gov.ph/classification/psgc)
- [PSGC Dataset (JSON)](https://github.com/isaacdarcilla/philippine-addresses)
- [Expo Documentation (v54)](https://docs.expo.dev/versions/v54.0.0/)
