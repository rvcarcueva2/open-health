"""
Vital Signs (Observation) synchronization to HAPI FHIR via OpenHIM
"""
import frappe
import requests

from openhim_connector.sync.config import get_openhim_url, get_auth_headers, TIMEOUT


def sync_vitals(doc, method=None):
    """Sync Vital Signs to HAPI FHIR as Observations via OpenHIM mediator"""
    url = f"{get_openhim_url()}/frappe/observation"

    payload = {
        "name": doc.name,
        "patient": doc.patient,
        "encounter": doc.encounter or "",
        "signs_date": str(doc.signs_date) if doc.signs_date else "",
        "signs_time": str(doc.signs_time) if hasattr(doc, "signs_time") else "",
        "systolic": doc.bp_systolic or 0,
        "diastolic": doc.bp_diastolic or 0,
        "temperature": doc.temperature or 0,
        "heart_rate": doc.heart_rate or 0,
        "respiratory_rate": doc.respiratory_rate or 0,
        "weight": doc.weight or 0,
        "height": doc.height or 0,
        "bmi": doc.bmi or 0,
        "oxygen_saturation": doc.oxygen_saturation or 0
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=get_auth_headers(),
            timeout=TIMEOUT
        )

        if response.status_code == 200:
            result = response.json()
            count = result.get("properties", {}).get("observationCount", 0)
            frappe.logger("openhim").info(
                f"Vitals {doc.name} synced: {count} observations created"
            )
        else:
            frappe.logger("openhim").error(
                f"Vitals {doc.name} sync failed ({response.status_code}): {response.text}"
            )
            _queue_retry(doc, payload)

    except requests.exceptions.RequestException as e:
        frappe.logger("openhim").error(f"Vitals {doc.name} sync error: {str(e)}")
        _queue_retry(doc, payload)


def _queue_retry(doc, payload):
    from openhim_connector.sync.queue import add_to_retry_queue
    add_to_retry_queue("Vital Signs", doc.name, "POST", payload)
