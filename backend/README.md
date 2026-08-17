# Open Health Backend - OpenHIM Integration

This directory contains the backend infrastructure for Open Health, including:

- **HAPI FHIR Server** — HL7 FHIR R4 compliant server
- **PostgreSQL** — persistent database for HAPI FHIR
- **OpenHIM** — Health Information Mediator (interoperability layer)
- **Frappe-to-FHIR Mediator** — transforms Frappe Health data to FHIR R4

---

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────┐     ┌────────────┐
│  Frappe Health  │────▶│   OpenHIM    │────▶│  Frappe-FHIR        │────▶│ HAPI FHIR  │
│  (Marley Health)│     │   Core       │     │  Mediator           │     │  Server    │
└─────────────────┘     └──────────────┘     └─────────────────────┘     └────────────┘
                               │                                                │
                        ┌──────┴──────┐                                  ┌──────┴──────┐
                        │  OpenHIM    │                                  │ PostgreSQL  │
                        │  Console    │                                  │             │
                        └─────────────┘                                  └─────────────┘
                                                                                │
                                                                         ┌──────┴──────┐
                                                                         │ Open Health │
                                                                         │ Mobile App  │
                                                                         └─────────────┘
```

---

## Quick Start

### 1. Start all services

```bash
cd backend
docker compose up -d
```

### 2. Wait for services to be healthy

```bash
docker compose ps
```

All services should show "healthy" or "running".

### 3. Configure OpenHIM

```bash
cd mediator
npm install
node src/setup/configure-openhim.js
```

This creates the client credentials and channels in OpenHIM.

### 4. Test the mediator

**PowerShell (Windows):**
```powershell
.\scripts\test-mediator.ps1
```

**Bash (Linux/Mac):**
```bash
chmod +x scripts/test-mediator.sh
./scripts/test-mediator.sh
```

---

## Services & Ports

| Service | Port | URL |
|---------|------|-----|
| HAPI FHIR | 8080 | http://localhost:8080/fhir |
| PostgreSQL | 5432 | localhost:5432 |
| OpenHIM Core (HTTPS API) | 5000 | https://localhost:5000 |
| OpenHIM Core (HTTP Transactions) | 5001 | http://localhost:5001 |
| OpenHIM Core (Mediator Comms) | 5544 | http://localhost:5544 |
| OpenHIM Console | 9000 | http://localhost:9000 |
| Frappe-FHIR Mediator | 3000 | http://localhost:3000 |

---

## OpenHIM Console Access

- **URL:** http://localhost:9000
- **Email:** root@openhim.org
- **Password:** openhim-password

> On first login, you'll be asked to change the password. You can also accept the self-signed certificate warning.

---

## Frappe Health Integration

See `frappe-integration/webhook-config.md` for detailed instructions on connecting Frappe Health.

### Quick Options:

1. **Webhooks (No-code):** Configure in Frappe Admin → Setup → Webhook
2. **Server Scripts:** Python scripts that fire on DocType events
3. **Custom App:** Full `openhim_connector` app with retry queue (in `frappe-integration/openhim_connector/`)

### Endpoints (via OpenHIM):

```
POST http://<server-ip>:5001/frappe/patient      → Creates/updates FHIR Patient
POST http://<server-ip>:5001/frappe/encounter    → Creates/updates FHIR Encounter
POST http://<server-ip>:5001/frappe/observation  → Creates FHIR Observations
```

---

## Data Flow

### Frappe → HAPI FHIR (via OpenHIM)

```
1. Patient created/updated in Frappe Health
2. Webhook/Server Script fires
3. Payload sent to OpenHIM (port 5001)
4. OpenHIM routes to Frappe-FHIR Mediator
5. Mediator transforms Frappe DocType → FHIR R4 Resource
6. Mediator POSTs to HAPI FHIR
7. Transaction logged in OpenHIM (audit trail)
```

### Open Health Mobile App → HAPI FHIR (direct)

```
1. User creates/updates data in mobile app
2. Saved to SQLite (offline-first)
3. Sync queue processes when online
4. Direct REST to HAPI FHIR (port 8080)
```

---

## Resource Mapping

| Frappe Health DocType | FHIR R4 Resource | Mediator Endpoint |
|----------------------|------------------|-------------------|
| Patient | Patient | /mediate/patient |
| Patient Encounter | Encounter | /mediate/encounter |
| Vital Signs | Observation (multiple) | /mediate/observation |

---

## Troubleshooting

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frappe-fhir-mediator
docker compose logs -f openhim-core
docker compose logs -f hapi-fhir
```

### Common issues

| Problem | Solution |
|---------|----------|
| OpenHIM Console can't connect | Accept self-signed cert at https://localhost:8080 first |
| Mediator not registering | Run `node src/setup/configure-openhim.js` manually |
| HAPI FHIR not starting | Check PostgreSQL is healthy: `docker compose ps` |
| Port conflicts | Change ports in docker-compose.yml |

### Reset everything

```bash
docker compose down -v
docker compose up -d
```

> Warning: `-v` removes all data volumes.

---

## Directory Structure

```
backend/
├── docker-compose.yml          # All services
├── .env.example                # Environment variables template
├── README.md                   # This file
│
├── hapi/
│   └── application.yaml        # HAPI FHIR config
│
├── postgres/
│   └── init-databases.sql      # Database initialization
│
├── openhim/
│   └── default.json            # OpenHIM Console config
│
├── mediator/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js            # Express server entry
│       ├── openhim.js          # OpenHIM registration
│       ├── fhirClient.js       # HAPI FHIR HTTP client
│       ├── routes/
│       │   ├── patient.js      # Patient transformation
│       │   ├── encounter.js    # Encounter transformation
│       │   └── observation.js  # Vital Signs transformation
│       └── setup/
│           └── configure-openhim.js  # Initial OpenHIM setup
│
├── frappe-integration/
│   ├── webhook-config.md       # Webhook setup guide
│   └── openhim_connector/      # Custom Frappe app
│       ├── hooks.py
│       └── sync/
│           ├── config.py
│           ├── patient.py
│           ├── encounter.py
│           ├── observation.py
│           └── queue.py
│
└── scripts/
    ├── test-mediator.sh        # Test script (bash)
    └── test-mediator.ps1       # Test script (PowerShell)
```
