"""
OpenHIM Connector Configuration

Configure these in Frappe via:
  Setup > Settings > OpenHIM Settings (custom DocType)

Or set environment variables:
  OPENHIM_URL=http://your-openhim-server:5001
"""
import frappe
import os
import base64

# Timeout for HTTP requests (seconds)
TIMEOUT = 15

# Default values (override via Frappe Settings or environment)
DEFAULT_OPENHIM_URL = "http://localhost:5001"
DEFAULT_CLIENT_ID = "frappe-client"
DEFAULT_CLIENT_SECRET = "frappe-secret-key"


def get_openhim_url():
    """Get OpenHIM transaction API URL"""
    # Try environment variable first
    url = os.environ.get("OPENHIM_URL")
    if url:
        return url.rstrip("/")

    # Try Frappe settings
    try:
        settings = frappe.get_single("OpenHIM Settings")
        if settings and settings.openhim_url:
            return settings.openhim_url.rstrip("/")
    except Exception:
        pass

    return DEFAULT_OPENHIM_URL


def get_auth_headers():
    """Get authentication headers for OpenHIM"""
    client_id = os.environ.get("OPENHIM_CLIENT_ID", DEFAULT_CLIENT_ID)
    client_secret = os.environ.get("OPENHIM_CLIENT_SECRET", DEFAULT_CLIENT_SECRET)

    # OpenHIM uses Basic Auth for client authentication
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    return {
        "Content-Type": "application/json",
        "Authorization": f"Basic {credentials}"
    }
