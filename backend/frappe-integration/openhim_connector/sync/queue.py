"""
Retry queue for failed OpenHIM sync operations.

Failed syncs are stored in a custom DocType 'OpenHIM Sync Queue'
and retried every 5 minutes via scheduler.
"""
import frappe
import requests
import json
from datetime import datetime

from openhim_connector.sync.config import get_openhim_url, get_auth_headers, TIMEOUT

# Resource type to OpenHIM endpoint mapping
ENDPOINT_MAP = {
    "Patient": "/frappe/patient",
    "Patient Encounter": "/frappe/encounter",
    "Vital Signs": "/frappe/observation"
}

MAX_RETRIES = 5


def add_to_retry_queue(doctype, docname, method, payload):
    """Add a failed sync operation to the retry queue"""
    try:
        queue_item = frappe.get_doc({
            "doctype": "OpenHIM Sync Queue",
            "reference_doctype": doctype,
            "reference_name": docname,
            "http_method": method,
            "payload": json.dumps(payload),
            "status": "Pending",
            "retry_count": 0,
            "last_error": "",
            "created_at": datetime.now().isoformat()
        })
        queue_item.insert(ignore_permissions=True)
        frappe.db.commit()
        frappe.logger("openhim").info(
            f"Queued retry for {doctype}/{docname} ({method})"
        )
    except Exception as e:
        frappe.logger("openhim").error(f"Failed to queue retry: {str(e)}")


def process_retry_queue():
    """Process pending items in the retry queue (called by scheduler)"""
    pending_items = frappe.get_all(
        "OpenHIM Sync Queue",
        filters={"status": "Pending", "retry_count": ["<", MAX_RETRIES]},
        fields=["name", "reference_doctype", "reference_name", "http_method", "payload", "retry_count"],
        order_by="creation asc",
        limit=20
    )

    if not pending_items:
        return

    frappe.logger("openhim").info(f"Processing {len(pending_items)} retry items")

    for item in pending_items:
        endpoint = ENDPOINT_MAP.get(item.reference_doctype)
        if not endpoint:
            _mark_failed(item.name, f"Unknown doctype: {item.reference_doctype}")
            continue

        url = f"{get_openhim_url()}{endpoint}"
        payload = json.loads(item.payload)
        method = item.http_method.upper()

        try:
            if method == "POST":
                response = requests.post(url, json=payload, headers=get_auth_headers(), timeout=TIMEOUT)
            elif method == "DELETE":
                response = requests.delete(url, json=payload, headers=get_auth_headers(), timeout=TIMEOUT)
            else:
                _mark_failed(item.name, f"Unsupported method: {method}")
                continue

            if response.status_code == 200:
                _mark_completed(item.name)
                frappe.logger("openhim").info(
                    f"Retry successful: {item.reference_doctype}/{item.reference_name}"
                )
            else:
                _increment_retry(item.name, item.retry_count, response.text)

        except requests.exceptions.RequestException as e:
            _increment_retry(item.name, item.retry_count, str(e))

    frappe.db.commit()


def _mark_completed(queue_name):
    frappe.db.set_value("OpenHIM Sync Queue", queue_name, "status", "Completed")


def _mark_failed(queue_name, error):
    frappe.db.set_value("OpenHIM Sync Queue", queue_name, {
        "status": "Failed",
        "last_error": error
    })


def _increment_retry(queue_name, current_count, error):
    new_count = current_count + 1
    status = "Failed" if new_count >= MAX_RETRIES else "Pending"

    frappe.db.set_value("OpenHIM Sync Queue", queue_name, {
        "retry_count": new_count,
        "last_error": error[:500],  # Truncate long errors
        "status": status
    })

    if status == "Failed":
        frappe.logger("openhim").error(
            f"Max retries reached for {queue_name}: {error[:200]}"
        )
