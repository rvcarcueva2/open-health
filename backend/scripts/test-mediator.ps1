# ===========================================
# Test script for the Frappe-to-FHIR Mediator (PowerShell)
# Run after docker-compose is up
# ===========================================

$MEDIATOR_URL = "http://localhost:3000"

Write-Host "=== Testing Frappe-to-FHIR Mediator ===" -ForegroundColor Cyan
Write-Host ""

# 1. Health Check
Write-Host "--- Health Check ---" -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$MEDIATOR_URL/health" -Method Get
$health | ConvertTo-Json
Write-Host ""

# 2. Create a Patient
Write-Host "--- Creating Patient ---" -ForegroundColor Yellow
$patientBody = @{
    name = "HLC-PAT-00001"
    first_name = "Juan"
    middle_name = "Santos"
    last_name = "Dela Cruz"
    sex = "Male"
    dob = "1990-05-15"
    mobile = "+639171234567"
    email = "juan@example.com"
    status = 1
    address = @{
        address_line1 = "123 Rizal Street"
        city = "Manila"
        state = "NCR"
        country = "Philippines"
        pincode = "1000"
    }
} | ConvertTo-Json -Depth 3

$patientResult = Invoke-RestMethod -Uri "$MEDIATOR_URL/mediate/patient" `
    -Method Post `
    -ContentType "application/json" `
    -Body $patientBody
$patientResult | ConvertTo-Json -Depth 5
Write-Host ""

# 3. Create an Encounter
Write-Host "--- Creating Encounter ---" -ForegroundColor Yellow
$encounterBody = @{
    name = "HLC-ENC-00001"
    patient = "HLC-PAT-00001"
    patient_name = "Juan Dela Cruz"
    practitioner = "HLC-PRAC-00001"
    practitioner_name = "Dr. Maria Santos"
    encounter_date = "2024-01-15"
    encounter_time = "10:30:00"
    status = "Finished"
    encounter_type = "Consultation"
    chief_complaint = "Fever and headache for 2 days"
} | ConvertTo-Json

$encounterResult = Invoke-RestMethod -Uri "$MEDIATOR_URL/mediate/encounter" `
    -Method Post `
    -ContentType "application/json" `
    -Body $encounterBody
$encounterResult | ConvertTo-Json -Depth 5
Write-Host ""

# 4. Create Vital Signs (Observation)
Write-Host "--- Creating Vital Signs ---" -ForegroundColor Yellow
$vitalsBody = @{
    name = "HLC-VS-00001"
    patient = "HLC-PAT-00001"
    encounter = "HLC-ENC-00001"
    signs_date = "2024-01-15"
    signs_time = "10:30:00"
    systolic = 120
    diastolic = 80
    temperature = 38.2
    heart_rate = 88
    respiratory_rate = 20
    weight = 65
    height = 165
    oxygen_saturation = 97
} | ConvertTo-Json

$vitalsResult = Invoke-RestMethod -Uri "$MEDIATOR_URL/mediate/observation" `
    -Method Post `
    -ContentType "application/json" `
    -Body $vitalsBody
$vitalsResult | ConvertTo-Json -Depth 5
Write-Host ""

Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check OpenHIM Console at http://localhost:9000 to see transactions" -ForegroundColor Green
Write-Host "Check HAPI FHIR at http://localhost:8080/fhir/Patient to see created resources" -ForegroundColor Green
