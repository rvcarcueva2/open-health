"""
OpenHIM Connector - Frappe App Hooks

This Frappe custom app syncs health records to HAPI FHIR via OpenHIM.
Install with: bench install-app openhim_connector
"""

app_name = "openhim_connector"
app_title = "OpenHIM Connector"
app_publisher = "Open Health"
app_description = "Syncs Frappe Health data to HAPI FHIR via OpenHIM"
app_version = "1.0.0"

# DocType Events - triggers sync on create/update/delete
doc_events = {
    "Patient": {
        "after_insert": "openhim_connector.sync.patient.sync_patient",
        "on_update": "openhim_connector.sync.patient.sync_patient",
        "on_trash": "openhim_connector.sync.patient.delete_patient"
    },
    "Patient Encounter": {
        "after_insert": "openhim_connector.sync.encounter.sync_encounter",
        "on_update": "openhim_connector.sync.encounter.sync_encounter"
    },
    "Vital Signs": {
        "after_insert": "openhim_connector.sync.observation.sync_vitals",
        "on_update": "openhim_connector.sync.observation.sync_vitals"
    }
}

# Scheduled Tasks (for retry queue)
scheduler_events = {
    "every_5_minutes": [
        "openhim_connector.sync.queue.process_retry_queue"
    ]
}
