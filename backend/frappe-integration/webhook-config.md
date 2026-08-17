# Frappe Health Webhook Configuration

This guide explains how to configure Frappe Health (Marley Health) to send data to OpenHIM whenever a Patient, Encounter, or Vital Signs record is created or updated.

---

## Prerequisites

- Frappe Health instance running
- OpenHIM + Mediator stack running (see backend/docker-compose.yml)
- Network connectivity between Frappe and OpenHIM

---

## Option 1: Frappe Webhooks (No Code)

### Step 1: Access Webhook Settings

1. Go to your Frappe instance
2. Navigate to **Setup > Webhook**
3. Click **+ Add Webhook**

### Step 2: Patient Webhook

| Field | Value |
|-------|-------|
| DocType | Patient |
| Webhook Trigger Event | after_insert (for create), on_update (for update) |
| Request URL | `http://<openhim-server-ip>:5001/frappe/patient` |
| Request Method | POST |
| Request Headers | Content-Type: application/json |

**Webhook Data (JSON):**
```json
{
  "name": "{{ doc.name }}",
  "first_name": "{{ doc.first_name }}",
  "middle_name": "{{ doc.middle_name }}",
  "last_name": "{{ doc.last_name }}",
  "sex": "{{ doc.sex }}",
  "dob": "{{ doc.dob }}",
  "mobile": "{{ doc.mobile }}",
  "email": "{{ doc.email }}",
  "status": {{ doc.status }},
  "address": {
    "address_line1": "{{ doc.address_line1 }}",
    "city": "{{ doc.city }}",
    "state": "{{ doc.state }}",
    "country": "{{ doc.country }}",
    "pincode": "{{ doc.pincode }}"
  }
}
```

### Step 3: Patient Encounter Webhook

| Field | Value |
|-------|-------|
| DocType | Patient Encounter |
| Webhook Trigger Event | after_insert |
| Request URL | `http://<openhim-server-ip>:5001/frappe/encounter` |
| Request Method | POST |

**Webhook Data:**
```json
{
  "name": "{{ doc.name }}",
  "patient": "{{ doc.patient }}",
  "patient_name": "{{ doc.patient_name }}",
  "practitioner": "{{ doc.practitioner }}",
  "practitioner_name": "{{ doc.practitioner_name }}",
  "encounter_date": "{{ doc.encounter_date }}",
  "encounter_time": "{{ doc.encounter_time }}",
  "status": "{{ doc.docstatus }}",
  "encounter_type": "{{ doc.encounter_type }}",
  "chief_complaint": "{{ doc.symptoms }}"
}
```

### Step 4: Vital Signs Webhook

| Field | Value |
|-------|-------|
| DocType | Vital Signs |
| Webhook Trigger Event | after_insert |
| Request URL | `http://<openhim-server-ip>:5001/frappe/observation` |
| Request Method | POST |

**Webhook Data:**
```json
{
  "name": "{{ doc.name }}",
  "patient": "{{ doc.patient }}",
  "encounter": "{{ doc.encounter }}",
  "signs_date": "{{ doc.signs_date }}",
  "signs_time": "{{ doc.signs_time }}",
  "systolic": {{ doc.bp_systolic or 0 }},
  "diastolic": {{ doc.bp_diastolic or 0 }},
  "temperature": {{ doc.temperature or 0 }},
  "heart_rate": {{ doc.heart_rate or 0 }},
  "respiratory_rate": {{ doc.respiratory_rate or 0 }},
  "weight": {{ doc.weight or 0 }},
  "height": {{ doc.height or 0 }},
  "bmi": {{ doc.bmi or 0 }},
  "oxygen_saturation": {{ doc.oxygen_saturation or 0 }}
}
```

---

## Option 2: Frappe Server Script (More Control)

If you need more control over the transformation, create a Server Script in Frappe:

### Step 1: Create Server Script

Go to **Setup > Server Script > + Add Server Script**

| Field | Value |
|-------|-------|
| Script Type | DocType Event |
| Reference DocType | Patient |
| DocType Event | After Insert |

### Script:

```python
import requests
import json

OPENHIM_URL = "http://<openhim-server-ip>:5001/frappe/patient"

payload = {
    "name": doc.name,
    "first_name": doc.first_name,
    "middle_name": doc.middle_name or "",
    "last_name": doc.last_name or "",
    "sex": doc.sex,
    "dob": str(doc.dob) if doc.dob else "",
    "mobile": doc.mobile or "",
    "email": doc.email or "",
    "status": 1 if doc.status == "Active" else 0,
    "address": {
        "address_line1": doc.address_line1 or "",
        "city": doc.city or "",
        "state": doc.state or "",
        "country": doc.country or "Philippines",
        "pincode": doc.pincode or ""
    }
}

try:
    response = requests.post(
        OPENHIM_URL,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    frappe.logger().info(f"OpenHIM sync: {response.status_code} - {response.text}")
except Exception as e:
    frappe.logger().error(f"OpenHIM sync failed: {str(e)}")
    # Don't raise - sync failure should not block the user
```

---

## Option 3: Custom Frappe App (Production)

For production use, create a custom Frappe app that handles synchronization with retry logic:

```bash
bench new-app openhim_connector
bench install-app openhim_connector
```

See `backend/frappe-integration/openhim_connector/` for the full app implementation.

---

## Authentication

OpenHIM uses HTTP Basic Auth for clients. The mediator expects:

- **Client ID:** `frappe-client`
- **Password:** `frappe-secret-key`

Add these as Basic Auth headers in your Frappe webhook:
```
Authorization: Basic ZnJhcHBlLWNsaWVudDpmcmFwcGUtc2VjcmV0LWtleQ==
```

(Base64 of `frappe-client:frappe-secret-key`)

---

## Testing

1. Start the stack: `docker compose up -d` (from backend/)
2. Wait for all services to be healthy
3. Run the test script: `powershell scripts/test-mediator.ps1`
4. Check OpenHIM Console at http://localhost:9000
5. Check HAPI FHIR at http://localhost:8080/fhir/Patient

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not firing | Check Frappe webhook logs in Error Log |
| OpenHIM rejecting requests | Verify client credentials and channel permissions |
| Mediator not transforming | Check mediator logs: `docker logs frappe-fhir-mediator` |
| HAPI FHIR errors | Check HAPI logs: `docker logs hapi-fhir` |
| Network issues | Ensure all containers are on the same Docker network |
