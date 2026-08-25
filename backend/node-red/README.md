# Node-RED (Integration Flow Editor)

## What is Node-RED?

Node-RED is a **visual workflow automation tool** that provides a browser-based editor for wiring together APIs, services, and data transformations. In CHRIS, it serves as the integration layer for bulk data operations and inter-service orchestration that don't belong in the mobile app's sync logic.

### Why do we need it?

The mobile app handles individual patient sync through the standard queue. But there are admin/operational workflows that need a different approach:

- **Bulk CSV import** — health centers may have existing patient registries in spreadsheets
- **Service-to-service routing** — custom transformations between OpenHIM, OpenCR, and HAPI FHIR
- **Data migration** — one-time or periodic imports from external systems
- **Monitoring/debugging** — visual inspection of data flowing through the HIE

Node-RED provides these without writing deployment code — flows are edited in the browser and saved immediately.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Node-RED (port 1880)                        │
│                      Visual Flow Editor                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │ FHIR Patient    │  │ OpenCR Patient  │  │ CSV to FHIR     │   │
│  │ Router          │  │ Lookup          │  │ (via OpenCR)    │   │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │
│           │                    │                     │           │
└───────────┼────────────────────┼─────────────────────┼───────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌────────────────────┐  ┌────────────────┐  ┌──────────────────────┐
│  HAPI FHIR (8080)  │  │  OpenCR (3001) │  │  OpenHIM (5001)      │
│                    │  │                │  │  → OpenCR (dedup)    │
└────────────────────┘  └────────────────┘  └──────────────────────┘
```

---

## Flows

### 1. FHIR Patient Router (`flow-tab-1`)

Direct pass-through to HAPI FHIR for testing.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/fhir/Patient` | POST | Forwards a Patient resource directly to HAPI FHIR (port 8080) |

### 2. OpenCR Patient Lookup (`flow-tab-3`)

Query OpenCR's patient registry (golden records, source records, linked patients).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/opencr/patients` | GET | Fetch all patients from OpenCR, returns simplified summary |
| `/opencr/patients/:id` | GET | Fetch a single patient by ID from OpenCR |

Response format for `/opencr/patients`:
```json
{
  "total": 5,
  "patients": [
    {
      "id": "abc-123",
      "name": "Juan Dela Cruz",
      "gender": "male",
      "birthDate": "1990-05-15",
      "isGoldenRecord": true,
      "linkedPatients": ["Patient/xyz-456"],
      "address": "Quezon City"
    }
  ]
}
```

### 3. CSV to FHIR — via OpenCR (`flow-tab-4`)

Bulk import patients from CSV. Each row is translated to a PH Core-compliant FHIR Patient, then posted through OpenHIM → OpenCR for deduplication.

| Endpoint | Method | Content-Type | Description |
|----------|--------|--------------|-------------|
| `/import/csv/patients` | POST | `text/csv` | Import patients from CSV data |

#### CSV Format

```csv
first_name,last_name,middle_name,gender,birthdate,phone,email,barangay,city,province
Juan,Dela Cruz,Santos,male,1990-05-15,09171234567,juan@email.com,Adams,Adams,Ilocos Norte
Maria,Santos,,female,1985-03-20,09189876543,,,Quezon City,Metro Manila
```

**Required columns:** `first_name`, `last_name`

**Optional columns:** `middle_name`, `gender` (m/f/male/female), `birthdate` (YYYY-MM-DD), `phone`, `email`, `barangay`, `city`, `province`

#### Response

```json
{
  "success": true,
  "total": 2,
  "created": 2,
  "failed": 0,
  "parseErrors": [],
  "results": [
    { "index": 1, "name": "Juan Dela Cruz", "status": 200, "success": true, "id": "Patient/abc-123" },
    { "index": 2, "name": "Maria Santos", "status": 200, "success": true, "id": "Patient/xyz-456" }
  ]
}
```

#### What happens under the hood

```
CSV text received
      ↓
Parse CSV (headers = column names)
      ↓
For each row → translate to FHIR Patient:
  - Generate UUID for id + internalid identifier
  - Set meta.profile to PH Core Patient
  - Map gender (m/f → male/female)
  - Map address fields
  - Map telecom (phone, email)
      ↓
POST each patient sequentially to OpenHIM (port 5001)
  - Headers: x-openhim-clientid: chris-mobile
  - OpenHIM routes to OpenCR for deduplication
      ↓
Collect responses → return aggregated result
```

---

## Setup

Node-RED starts automatically with `docker compose up -d`. No additional configuration needed.

```
URL: http://localhost:1880
```

### Docker Configuration

```yaml
node-red:
  image: nodered/node-red:latest
  container_name: node-red
  user: "0"                    # Required for bind-mount permissions on Windows/WSL
  environment:
    - TZ=Asia/Manila
  ports:
    - "1880:1880"
  volumes:
    - ./node-red/data:/data    # Flows persisted to project directory
  networks:
    - openhim-network
```

### File Structure

```
backend/node-red/
├── data/
│   ├── flows.json          # All flow definitions (version-controlled)
│   ├── flows_cred.json     # Encrypted credentials (.gitignored)
│   ├── settings.js         # Node-RED settings
│   └── package.json        # Installed palette nodes
└── README.md
```

---

## Testing

### CSV Import

```powershell
# PowerShell
$csv = "first_name,last_name,gender,birthdate,phone`nJuan,Dela Cruz,male,1990-05-15,09171234567`nMaria,Santos,female,1985-03-20,09189876543"
Invoke-WebRequest -Uri "http://localhost:1880/import/csv/patients" -Method POST -Body $csv -ContentType "text/csv" -UseBasicParsing
```

```bash
# Bash/curl
curl -X POST http://localhost:1880/import/csv/patients \
  -H "Content-Type: text/csv" \
  -d 'first_name,last_name,gender,birthdate,phone
Juan,Dela Cruz,male,1990-05-15,09171234567
Maria,Santos,female,1985-03-20,09189876543'
```

### OpenCR Lookup

```bash
# All patients
curl http://localhost:1880/opencr/patients

# Single patient
curl http://localhost:1880/opencr/patients/<patient-id>
```

### Direct FHIR POST

```bash
curl -X POST http://localhost:1880/fhir/Patient \
  -H "Content-Type: application/fhir+json" \
  -d '{"resourceType":"Patient","name":[{"family":"Test","given":["Flow"]}]}'
```

---

## Editing Flows

1. Open http://localhost:1880 in your browser
2. Edit flows visually using the drag-and-drop editor
3. Click **Deploy** to apply changes
4. Changes are automatically saved to `backend/node-red/data/flows.json`

Since flows are bind-mounted, any changes made in the Node-RED editor are immediately persisted to the project directory and can be committed to git.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Container crashes with EACCES | Ensure `user: "0"` is set in docker-compose |
| "Error loading credentials" warning | Benign — happens after fresh bind-mount. Redeploy flows in the editor to regenerate. |
| CSV import hangs/times out | Check if OpenHIM is healthy (`docker ps`). Check OpenCR logs. |
| Connection refused to openhim-core:5001 | Ensure Node-RED is on the same Docker network as OpenHIM (`openhim-network`) |
| Flows not persisting | Verify the volume mount points to `./node-red/data:/data` |

```bash
# Check Node-RED logs
docker logs node-red -f

# Restart after flow file edits (outside the editor)
docker restart node-red
```
