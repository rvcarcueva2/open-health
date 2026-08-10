# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# AGENTS.md

## Project Overview

This project is an offline-first healthcare application built using:

### Frontend

* React Native
* Expo
* TypeScript
* Expo Router
* SQLite (`expo-sqlite`)

### Backend

* HAPI FHIR JPA Server (R4)
* PostgreSQL

### Terminology

* HL7 FHIR R4 Terminology Package (`hl7.terminology.r4`)
* ValueSet Expansion
* CodeSystem Lookup

### Synchronization

* Custom sync queue
* Offline-first architecture
* SQLite as source of truth
* HAPI FHIR as synchronization target

---

# Architecture

```text
React Native
      ↓
SQLite
      ↓
Sync Queue
      ↓
HAPI FHIR
      ↓
PostgreSQL
```

The application MUST work without internet access.

All user actions should first persist data locally and only synchronize to HAPI FHIR when connectivity is available.

---

# Important Rules

## Rule 1: SQLite is the Source of Truth

Never depend on the server for immediate UI updates.

When creating, updating, or deleting resources:

1. Save locally first.
2. Update UI from SQLite.
3. Queue synchronization.
4. Sync later.

Correct:

```text
Create Patient
      ↓
SQLite
      ↓
UI Updates
      ↓
Sync Queue
      ↓
Server
```

Incorrect:

```text
Create Patient
      ↓
Server
      ↓
UI
```

---

## Rule 2: Store Complete FHIR Resources

FHIR resources should be stored as complete JSON documents.

Example:

```json
{
  "resourceType": "Patient",
  "id": "123",
  "active": true,
  "name": [
    {
      "family": "Dela Cruz",
      "given": ["Juan"]
    }
  ]
}
```

Do not flatten FHIR resources into database-specific schemas.

Avoid:

```sql
family TEXT
given TEXT
gender TEXT
```

Preferred:

```sql
data TEXT
```

where `data` contains the complete FHIR JSON.

---

## Rule 3: FHIR Compliance

All resources must follow HL7 FHIR R4 specifications.

Use official resource structures.

Example Patient:

```json
{
  "resourceType": "Patient",
  "active": true,
  "name": [
    {
      "family": "Dela Cruz",
      "given": ["Juan"]
    }
  ]
}
```

---

## Rule 4: Use HAPI FHIR APIs

Interact with HAPI FHIR through REST APIs.

Examples:

```http
POST /Patient
GET /Patient
GET /Patient/{id}
PUT /Patient/{id}
DELETE /Patient/{id}
```

Avoid direct PostgreSQL access from the mobile application.

---

# Directory Structure

```text
open-health/
│
├── app/
│   ├── _layout.tsx
│   └── index.tsx
│
├── src/
│   ├── constants/
│   │   └── api.ts
│   │
│   ├── db/
│   │   ├── database.ts
│   │   ├── migrations.ts
│   │   └── resourceRepository.ts
│   │
│   ├── fhir/
│   │   ├── fhirClient.ts
│   │   └── patientService.ts
│   │
│   ├── sync/
│   │   ├── syncQueue.ts
│   │   ├── syncWorker.ts
│   │   ├── syncService.ts
│   │   └── networkMonitor.ts
│   │
│   └── terminology/
│       ├── terminologyService.ts
│       ├── valueSetService.ts
│       └── codeSystemService.ts
│
backend/
│
├── docker-compose.yml
└── hapi/
```

---

# SQLite Tables

## resources

Stores complete FHIR resources.

```sql
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  resourceType TEXT NOT NULL,
  data TEXT NOT NULL,
  synced INTEGER DEFAULT 0,
  lastModified TEXT NOT NULL
);
```

## sync_queue

Stores pending synchronization operations.

```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  resourceId TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL
);
```

---

# Synchronization Workflow

## Create

```text
User Creates Patient
        ↓
Save Resource
        ↓
Queue CREATE
        ↓
Sync Later
```

## Update

```text
User Updates Patient
        ↓
Save Resource
        ↓
Queue UPDATE
        ↓
Sync Later
```

## Delete

```text
User Deletes Patient
        ↓
Queue DELETE
        ↓
Sync Later
```

---

# API Configuration

The backend currently runs on:

```text
http://192.168.254.167:8080/fhir
```

Configured in:

```text
src/constants/api.ts
```

Example:

```ts
export const API_URL =
  'http://192.168.254.167:8080/fhir';
```

---

# Logging Requirements

When implementing new features, log:

1. SQLite writes
2. Queue creation
3. Sync attempts
4. HAPI responses
5. Errors

Example:

```ts
console.log('SAVING TO SQLITE');
console.log('QUEUE ITEM CREATED');
console.log('SYNCING RESOURCE');
console.log('FHIR RESPONSE');
```

---

# Terminology Requirements

Terminology should be loaded from HAPI FHIR.

Supported operations:

```http
POST /ValueSet/$expand
POST /ValueSet/$validate-code
POST /CodeSystem/$lookup
```

Terminology results should be cached locally in SQLite.

---

# Coding Standards

* Use TypeScript.
* Use async/await.
* Avoid deeply nested logic.
* Prefer repository/service patterns.
* Keep FHIR logic inside `src/fhir`.
* Keep SQLite logic inside `src/db`.
* Keep synchronization logic inside `src/sync`.
* Do not mix UI code with persistence logic.

```
```
