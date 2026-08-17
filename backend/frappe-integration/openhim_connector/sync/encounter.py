"""
Encounter synchronization to HAPI FHIR via OpenHIM
"""
import frappe
import requests

from openhim_connector.sync.config import get_openhim_url, get_auth_headers, TIMEOUT


def sync_encounter(doc, method=None):
    """Sync a Patient Encounter to HAPI FHIR via OpenHIM mediator"""
    url = f"{get_openhim_url()}/frappe/encounter"

    # Map Frappe docstatus to readable status
    status_map = {0: "Scheduled", 1: "Finished", 2: "Cancelled"}

    payload = {
        "name": doc.name,
        "patient": doc.patient,
        "patient_name": doc.patient_name or "",
        "practitioner": doc.practitioner or "",
        "practitioner_name": doc.practitioner_name or "",
        "encounter_date": str(doc.encounter_date) if doc.encounter_date else "",
        "encounter_time": str(doc.encounter_time) if hasattr(doc, "encounter_time") else "",
        "status": status_map.get(doc.docstatus, "Unknown"),
        "encounter_type": doc.encounter_type or "Consultation",
        "chief_complaint": doc.symptoms or ""
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=get_auth_headers(),
            timeout=TIMEOUT
        )

        if response.status_code == 200:
            frappe.logger("openhim").info(f"Encounter {doc.name} synced successfully")
        else:
            frappe.logger("openhim").error(
                f"Encounter {doc.name} sync failed ({response.status_code}): {response.text}"
            )
            _queue_retry(doc, payload)

    except requests.exceptions.RequestException as e:
        frappe.logger("openhim").error(f"Encounter {doc.name} sync error: {str(e)}")
        _queue_retry(doc, payload)


def _queue_retry(doc, payload):
    from openhim_connector.sync.queue import add_to_retry_queue
    add_to_retry_queue("Patient Encounter", doc.name, "POST", payload)
