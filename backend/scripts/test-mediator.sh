#!/bin/bash
# ===========================================
# Test script for the Frappe-to-FHIR Mediator
# Run after docker-compose is up
# ===========================================

MEDIATOR_URL="http://localhost:3000"

echo "=== Testing Frappe-to-FHIR Mediator ==="
echo ""

# 1. Health Check
echo "--- Health Check ---"
curl -s $MEDIATOR_URL/health | jq .
echo ""

# 2. Create a Patient
echo "--- Creating Patient ---"
curl -s -X POST $MEDIATOR_URL/mediate/patient \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HLC-PAT-00001",
    "first_name": "Juan",
    "middle_name": "Santos",
    "last_name": "Dela Cruz",
    "sex": "Male",
    "dob": "1990-05-15",
    "mobile": "+639171234567",
    "email": "juan@example.com",
    "status": 1,
    "address": {
      "address_line1": "123 Rizal Street",
      "city": "Manila",
      "state": "NCR",
      "country": "Philippines",
      "pincode": "1000"
    }
  }' | jq .
echo ""

# 3. Create an Encounter
echo "--- Creating Encounter ---"
curl -s -X POST $MEDIATOR_URL/mediate/encounter \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HLC-ENC-00001",
    "patient": "HLC-PAT-00001",
    "patient_name": "Juan Dela Cruz",
    "practitioner": "HLC-PRAC-00001",
    "practitioner_name": "Dr. Maria Santos",
    "encounter_date": "2024-01-15",
    "encounter_time": "10:30:00",
    "status": "Finished",
    "encounter_type": "Consultation",
    "chief_complaint": "Fever and headache for 2 days"
  }' | jq .
echo ""

# 4. Create Vital Signs (Observation)
echo "--- Creating Vital Signs ---"
curl -s -X POST $MEDIATOR_URL/mediate/observation \
  -H "Content-Type: application/json" \
  -d '{
    "name": "HLC-VS-00001",
    "patient": "HLC-PAT-00001",
    "encounter": "HLC-ENC-00001",
    "signs_date": "2024-01-15",
    "signs_time": "10:30:00",
    "systolic": 120,
    "diastolic": 80,
    "temperature": 38.2,
    "heart_rate": 88,
    "respiratory_rate": 20,
    "weight": 65,
    "height": 165,
    "oxygen_saturation": 97
  }' | jq .
echo ""

echo "=== Tests Complete ==="
echo ""
echo "Check OpenHIM Console at http://localhost:9000 to see transactions"
echo "Check HAPI FHIR at http://localhost:8080/fhir/Patient to see created resources"
