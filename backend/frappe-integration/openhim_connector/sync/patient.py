"""
Patient synchronization to HAPI FHIR via OpenHIM
"""
import frappe
import requests
import json

from openhim_connector.sync.config import get_openhim_url, get_auth_headers, TIMEOUT


def sync_patient(doc, method=None):
    """Sync a Patient document to HAPI FHIR via OpenHIM mediator"""
    url = f"{get_openhim_url()}/frappe/patient"

    payload = {
        "name": doc.name,
        "first_name": doc.first_name or "",
        "middle_name": doc.middle_name or "",
        "last_name": doc.last_name or "",
        "sex": doc.sex or "",
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
            url,
            json=payload,
            headers=get_auth_headers(),
            timeout=TIMEOUT
        )

        if response.status_code == 200:
            frappe.logger("openhim").info(
                f"Patient {doc.name} synced successfully: {response.json().get('properties', {}).get('fhirResourceId')}"
            )
        else:
            frappe.logger("openhim").error(
                f"Patient {doc.name} sync failed ({response.status_code}): {response.text}"
            )
            _queue_retry("Patient", doc.name, "POST", payload)

    except requests.exceptions.RequestException as e:
        frappe.logger("openhim").error(f"Patient {doc.name} sync error: {str(e)}")
        _queue_retry("Patient", doc.name, "POST", payload)


def delete_patient(doc, method=None):
    """Delete a Patient from HAPI FHIR via OpenHIM mediator"""
    url = f"{get_openhim_url()}/frappe/patient"

    payload = {"name": doc.name}

    try:
        response = requests.delete(
            url,
            json=payload,
            headers=get_auth_headers(),
            timeout=TIMEOUT
        )
        frappe.logger("openhim").info(f"Patient {doc.name} delete: {response.status_code}")
    except requests.exceptions.RequestException as e:
        frappe.logger("openhim").error(f"Patient {doc.name} delete error: {str(e)}")
        _queue_retry("Patient", doc.name, "DELETE", payload)


def _queue_retry(doctype, docname, method, payload):
    """Queue failed sync for retry"""
    from openhim_connector.sync.queue import add_to_retry_queue
    add_to_retry_queue(doctype, docname, method, payload)
