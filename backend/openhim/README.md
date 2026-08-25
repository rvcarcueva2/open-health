# OpenHIM (Open Health Information Mediator)

## What is OpenHIM?

OpenHIM is the **interoperability layer** that sits between all systems in the HIE. It acts as a central routing hub that:

- **Routes transactions** — directs incoming requests to the correct backend service
- **Logs everything** — provides a full audit trail of all health data exchanged
- **Handles authentication** — controls which systems can send/receive data
- **Enables channel-based routing** — different URL patterns go to different services

---

## Why do we need it?

Without OpenHIM, the mobile app would need to know about every backend service individually. With OpenHIM, the app sends everything to a single endpoint (port 5001) and OpenHIM decides where it goes:

```
Mobile App → POST /fhir/Patient → OpenHIM → OpenCR (deduplication)
Mobile App → POST /fhir (Bundle) → OpenHIM → HAPI FHIR (direct)
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CHRIS Mobile App                             │
│                    POST /fhir/... to port 5001                       │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         OpenHIM Core                                 │
│                                                                      │
│   Port 5001: HTTP Transactions (mobile app connects here)            │
│   Port 8081: Admin API (console connects here)                       │
│   Port 5000: HTTPS API                                               │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐     │
│   │  Channel Routing (by URL pattern + HTTP method)            │     │
│   │                                                            │     │
│   │  Priority 1: POST/PUT /fhir/Patient → OpenCR               │     │
│   │  Priority 2: ALL /fhir/*            → HAPI FHIR            │     │
│   └────────────────────────────────────────────────────────────┘     │
└───────────────┬──────────────────────────────────┬───────────────────┘
                │                                  │
                ▼                                  ▼
┌───────────────────────────────┐  ┌───────────────────────────────────┐
│   OpenCR (port 3001 HTTP)     │  │     HAPI FHIR (port 8080)         │
│   Patient Deduplication       │  │     Clinical Data Store           │
│   (MPI / Golden Records)      │  │     (Encounters, Observations,    │
│                               │  │      Bundles, etc.)               │
└───────────────────────────────┘  └───────────────────────────────────┘

                     ┌──────────────────────────────┐
                     │      OpenHIM Console         │
                     │    (Admin UI, port 9000)     │
                     ├──────────────────────────────┤
                     │      MongoDB (port 27017)    │
                     │    Transaction log storage   │
                     └──────────────────────────────┘
```

---

## Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| OpenHIM Core | `openhim-core` | 5001 (HTTP), 8081 (API), 5000 (HTTPS) | Transaction routing + audit |
| OpenHIM Console | `openhim-console` | 9000 | Web admin UI |
| MongoDB | `openhim-mongo` | 27017 (internal) | Transaction log storage |

---

## Console Access

```
URL:      http://localhost:9000
Email:    root@openhim.org
Password: apc-open-health
```

On first access, you need to accept the self-signed certificate at `https://localhost:8081` before the console can connect to Core.

---

## Channels (Routing Rules)
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

Channels are configured via the setup script (`backend/scripts/configure-openhim-opencr.js`):

| Channel | URL Pattern | Routes To | Purpose |
|---------|-------------|-----------|---------|
| Patient MPI (OpenCR) | `^/fhir/Patient.*$` (POST/PUT) | `opencr:3001` | Patient deduplication |
| FHIR Pass-through | `^/fhir.*$` (all methods) | `hapi-fhir:8080` | Direct FHIR access |

**Priority matters:** The Patient MPI channel has priority 1, so POST/PUT to `/fhir/Patient` goes to OpenCR first. All other `/fhir/*` requests fall through to the FHIR Pass-through channel (HAPI FHIR).

---

## Setup

Channels are created by running the configuration script after all services are up:

```bash
cd backend/scripts
node configure-openhim-opencr.js apc-open-health
```

This creates:
1. A `chris-mobile` client that the mobile app authenticates as
2. The Patient MPI channel (routes to OpenCR)
3. The FHIR Pass-through channel (routes to HAPI FHIR)

---

## Configuration File

### default.json

This file configures the OpenHIM Console (web UI) to connect to OpenHIM Core:

```json
{
  "protocol": "https",
  "host": "localhost",
  "port": 8081
}
```

It's mounted into the console container at `/usr/share/nginx/html/config/default.json`.

If running on a remote server, change `"host"` to the server's IP or domain.

---

## How the Mobile App Connects

The mobile app sends requests to `http://<server-ip>:5001/fhir/...`:

1. **POST /fhir/Patient** → OpenHIM matches the Patient MPI channel → routes to OpenCR for deduplication
2. **POST /fhir (Bundle)** → OpenHIM matches FHIR Pass-through → routes directly to HAPI FHIR
3. **GET /fhir/Patient/{id}** → OpenHIM matches FHIR Pass-through → routes to HAPI FHIR

The `x-openhim-clientid: chris-mobile` header identifies the mobile app.

---

## Troubleshooting

```bash
# View OpenHIM Core logs
docker logs openhim-core -f

# Check if Core is healthy
curl -sk https://localhost:8081/heartbeat

# View all transactions in console
# Open http://localhost:9000 → Transactions tab

# Restart after config changes
docker compose restart openhim-core openhim-console
```

| Problem | Solution |
|---------|----------|
| Console shows "Cannot connect to API" | Accept self-signed cert at `https://localhost:8081` in browser first |
| 404 on /fhir/Patient | Channels not configured. Run `node configure-openhim-opencr.js` |
| 401 Unauthorized | Channel `authType` must be `public` for dev, or configure client auth |
| Transactions not showing in console | Check MongoDB is running: `docker logs openhim-mongo` |
