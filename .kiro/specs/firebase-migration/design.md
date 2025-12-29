# Design Document: Firebase Migration

## Overview

This design document describes the architecture for converting MinuteFlow's backend from MongoDB + Socket.IO to Firebase/Firestore. The migration preserves all existing frontend contracts while replacing the data layer and real-time communication mechanism.

The key architectural shift is from a "push" model (Socket.IO emitting events) to a "write-and-listen" model (backend writes to Firestore, frontend subscribes via onSnapshot). This simplifies the backend by removing WebSocket management while leveraging Firestore's built-in real-time synchronization.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Frontend
        FE[React Frontend]
        FS_LISTENER[Firestore onSnapshot Listeners]
    end
    
    subgraph Backend
        EXPRESS[Express Server]
        INGEST[Ingest Controller]
        MEETING[Meeting Controller]
        LLM[LLM Service]
        SIM[Simulation Service]
        VISUAL[Visual Engine]
        FIREBASE[Firebase Admin SDK]
    end
    
    subgraph Firebase
        FIRESTORE[(Firestore Database)]
    end
    
    FE -->|REST API| EXPRESS
    EXPRESS --> INGEST
    EXPRESS --> MEETING
    INGEST --> LLM
    INGEST --> SIM
    LLM --> VISUAL
    INGEST --> FIREBASE
    LLM --> FIREBASE
    SIM --> FIREBASE
    MEETING --> FIREBASE
    FIREBASE -->|Write| FIRESTORE
    FIRESTORE -->|Real-time Sync| FS_LISTENER
    FS_LISTENER --> FE
```

### Data Flow for Real-Time Updates

```mermaid
sequenceDiagram
    participant Client as Frontend
    participant API as Express API
    participant LLM as LLM Service
    participant FB as Firebase Admin
    participant FS as Firestore
    
    Client->>FS: Subscribe to meeting/{id}/minutes
    Client->>FS: Subscribe to meeting/{id}/actions
    
    API->>API: Receive caption chunk
    API->>FB: Write to minutes subcollection
    FB->>FS: Document write
    FS-->>Client: onSnapshot callback (transcript)
    
    API->>LLM: Process transcript
    LLM->>LLM: Extract insights
    LLM->>FB: Batch write actions/decisions
    FB->>FS: Document writes
    FS-->>Client: onSnapshot callback (insights)
```

## Components and Interfaces

### 1. Firebase Configuration Module

**Purpose:** Initialize and export Firebase Admin SDK instance

**Interface:**
```javascript
// server/src/config/firebase.js
const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK
 * @returns {FirebaseFirestore.Firestore} Firestore database instance
 */
function initializeFirebase() {
  // Initialize with service account from environment
  // Returns Firestore db instance
}

/**
 * Get Firestore database instance
 * @returns {FirebaseFirestore.Firestore}
 */
function getDb() {
  // Returns initialized Firestore instance
}

module.exports = { initializeFirebase, getDb };
```

### 2. Firestore Repository Layer

**Purpose:** Abstract Firestore operations with type-safe methods

**Interface:**
```javascript
// server/src/repositories/meetingRepository.js

/**
 * Create a new meeting document
 * @param {Object} meetingData - Meeting data matching Meeting schema
 * @returns {Promise<{id: string, ...meetingData}>}
 */
async function createMeeting(meetingData) {}

/**
 * Get meeting by ID
 * @param {string} meetingId
 * @returns {Promise<Object|null>}
 */
async function getMeetingById(meetingId) {}

/**
 * Get all meetings sorted by creation date
 * @param {number} limit - Maximum results (default 50)
 * @returns {Promise<Array>}
 */
async function getAllMeetings(limit = 50) {}

/**
 * Update meeting fields
 * @param {string} meetingId
 * @param {Object} updates - Partial meeting data
 * @returns {Promise<void>}
 */
async function updateMeeting(meetingId, updates) {}
```

```javascript
// server/src/repositories/minuteRepository.js

/**
 * Create or update a minute window
 * @param {string} meetingId
 * @param {Object} minuteData
 * @returns {Promise<{id: string, ...minuteData}>}
 */
async function upsertMinuteWindow(meetingId, minuteData) {}

/**
 * Append transcript text to existing minute window
 * @param {string} meetingId
 * @param {string} minuteId
 * @param {string} text
 * @returns {Promise<void>}
 */
async function appendTranscript(meetingId, minuteId, text) {}

/**
 * Get all minute windows for a meeting
 * @param {string} meetingId
 * @returns {Promise<Array>}
 */
async function getMinutesByMeeting(meetingId) {}
```

```javascript
// server/src/repositories/insightRepository.js

/**
 * Create action item
 * @param {string} meetingId
 * @param {Object} actionData
 * @returns {Promise<{id: string, ...actionData}>}
 */
async function createAction(meetingId, actionData) {}

/**
 * Create decision
 * @param {string} meetingId
 * @param {Object} decisionData
 * @returns {Promise<{id: string, ...decisionData}>}
 */
async function createDecision(meetingId, decisionData) {}

/**
 * Batch create multiple insights
 * @param {string} meetingId
 * @param {Array} actions
 * @param {Array} decisions
 * @returns {Promise<void>}
 */
async function batchCreateInsights(meetingId, actions, decisions) {}

/**
 * Get all artifacts for a meeting
 * @param {string} meetingId
 * @returns {Promise<{actions: Array, decisions: Array, visuals: Array}>}
 */
async function getArtifactsByMeeting(meetingId) {}
```

```javascript
// server/src/repositories/visualRepository.js

/**
 * Create visual artifact
 * @param {string} meetingId
 * @param {Object} visualData
 * @returns {Promise<{id: string, ...visualData}>}
 */
async function createVisual(meetingId, visualData) {}

/**
 * Get all visuals for a meeting
 * @param {string} meetingId
 * @returns {Promise<Array>}
 */
async function getVisualsByMeeting(meetingId) {}
```

### 3. Updated Controllers

**Ingest Controller Changes:**
- Remove all `io.to(meetingId).emit()` calls
- Replace with Firestore repository writes
- Maintain same request/response contract

**Meeting Controller Changes:**
- Replace Mongoose queries with Firestore repository calls
- Maintain same response format for frontend compatibility

### 4. Updated Services

**LLM Service Changes:**
- No interface changes
- Internal implementation unchanged
- Output consumed by controllers for Firestore writes

**Simulation Service Changes:**
- Remove Socket.IO dependency (`io` parameter)
- Write directly to Firestore via repositories
- Maintain same timing and script behavior

## Data Models

### Firestore Collection Structure

```
firestore-root/
├── meetings/
│   └── {meetingId}/
│       ├── [Meeting Document Fields]
│       ├── minutes/
│       │   └── {minuteId}/
│       │       └── [MinuteWindow Document Fields]
│       ├── actions/
│       │   └── {actionId}/
│       │       └── [ActionItem Document Fields]
│       ├── decisions/
│       │   └── {decisionId}/
│       │       └── [Decision Document Fields]
│       └── visuals/
│           └── {visualId}/
│               └── [VisualArtifact Document Fields]
```

### Document Schemas

**Meeting Document** (`meetings/{meetingId}`):
```javascript
{
  title: string,           // Required, default "Untitled Meeting"
  status: string,          // "live" | "completed" | "scheduled"
  startTime: Timestamp,    // Firestore Timestamp
  endTime: Timestamp,      // Firestore Timestamp, nullable
  participants: string[],  // Array of participant names/IDs
  summary: string,         // Meeting summary, nullable
  createdAt: Timestamp,    // Auto-set on create
  updatedAt: Timestamp     // Auto-set on update
}
```

**MinuteWindow Document** (`meetings/{meetingId}/minutes/{minuteId}`):
```javascript
{
  startTime: Timestamp,    // Window start time
  endTime: Timestamp,      // Window end time
  transcript: string,      // Accumulated transcript text
  speaker: string,         // Current/last speaker
  processed: boolean,      // Whether LLM has processed this window
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**ActionItem Document** (`meetings/{meetingId}/actions/{actionId}`):
```javascript
{
  content: string,         // Action item text
  assignee: string,        // Assigned person, default "Unassigned"
  status: string,          // "pending" | "in-progress" | "completed"
  sourceWindowId: string,  // Reference to originating minute window
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Decision Document** (`meetings/{meetingId}/decisions/{decisionId}`):
```javascript
{
  content: string,         // Decision text
  confidence: number,      // 0-1 confidence score
  sourceWindowId: string,  // Reference to originating minute window
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**VisualArtifact Document** (`meetings/{meetingId}/visuals/{visualId}`):
```javascript
{
  type: string,            // "bar" | "line" | "pie" | "generic"
  title: string,           // Chart title
  description: string,     // Chart description
  data: {                  // Chart.js compatible data structure
    labels: string[],
    datasets: [{
      label: string,
      data: number[],
      backgroundColor?: string[],
      borderColor?: string
    }]
  },
  sourceWindowId: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Data Transformation Layer

To maintain frontend compatibility, a transformation layer converts Firestore documents to the expected frontend format:

```javascript
// server/src/utils/transformers.js

/**
 * Transform Firestore meeting document to frontend Meeting interface
 */
function transformMeeting(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    status: data.status,
    startTime: data.startTime.toDate(),
    endTime: data.endTime?.toDate() || null,
    participants: data.participants || [],
    summary: data.summary || null
  };
}

/**
 * Transform Firestore action document to frontend ActionItem interface
 */
function transformAction(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    content: data.content,
    assignee: data.assignee,
    status: data.status,
    createdAt: data.createdAt.toDate()
  };
}

/**
 * Transform Firestore decision document to frontend Decision interface
 */
function transformDecision(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    content: data.content,
    timestamp: data.createdAt.toDate(),
    confidence: data.confidence
  };
}

/**
 * Transform Firestore visual document to frontend Visualization interface
 */
function transformVisual(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    description: data.description,
    type: data.type,
    data: {
      labels: data.data.labels,
      values: data.data.datasets[0]?.data || []
    }
  };
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Meeting Document Round-Trip Consistency

*For any* valid meeting data object, writing it to Firestore and reading it back SHALL produce an equivalent object with all fields preserved (title, status, startTime, endTime, participants, summary, createdAt, updatedAt).

**Validates: Requirements 1.1**

### Property 2: Subcollection Structure Integrity

*For any* meeting with associated minute windows, actions, decisions, and visuals, all subcollection documents SHALL be retrievable at their designated paths (`meetings/{meetingId}/minutes`, `meetings/{meetingId}/actions`, `meetings/{meetingId}/decisions`, `meetings/{meetingId}/visuals`).

**Validates: Requirements 1.2, 1.3, 1.4, 1.5**

### Property 3: Data Write Round-Trip Consistency

*For any* transcript, insight, or visual artifact written to Firestore, reading it back from the appropriate subcollection SHALL produce an equivalent document with all fields intact.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Caption Ingestion Persistence

*For any* valid caption chunk (meetingId, text, timestamp, speaker), ingesting it via the API SHALL result in the transcript being stored in the corresponding MinuteWindow document in Firestore.

**Validates: Requirements 4.2**

### Property 5: LLM Demo Mode Determinism

*For any* transcript input processed in Demo Mode, the LLM Service SHALL produce identical output (actions, decisions, visual candidates) when given the same input multiple times.

**Validates: Requirements 5.5**

### Property 6: Meeting List Sorting

*For any* set of meetings in Firestore, the GET `/api/meetings` endpoint SHALL return them sorted by createdAt in descending order (newest first).

**Validates: Requirements 7.1**

### Property 7: Meeting Retrieval Correctness

*For any* meeting ID that exists in Firestore, the GET `/api/meetings/{id}` endpoint SHALL return the complete meeting document with all fields matching the stored data.

**Validates: Requirements 7.2**

### Property 8: Artifacts Retrieval Completeness

*For any* meeting with associated artifacts, the GET `/api/meetings/{id}/artifacts` endpoint SHALL return all actions, decisions, and visuals belonging to that meeting with no missing items.

**Validates: Requirements 7.3**

### Property 9: Data Transformation Schema Compliance

*For any* Firestore document (meeting, action, decision, visual), the transformed API response SHALL contain all fields required by the corresponding frontend TypeScript interface with correct types.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 10: Error Response Sanitization

*For any* API error response, the response body SHALL NOT contain internal error details, stack traces, or sensitive system information.

**Validates: Requirements 9.5**

### Property 11: Query Result Limiting

*For any* meeting list query, the API SHALL return at most the configured limit of results (default 50) to prevent unbounded reads.

**Validates: Requirements 10.4**

## Error Handling

### Error Categories and Responses

| Error Type | HTTP Status | Response Format |
|------------|-------------|-----------------|
| Validation Error | 400 | `{ error: "Validation failed", details: [...] }` |
| Not Found | 404 | `{ error: "Resource not found" }` |
| Firebase Write Error | 500 | `{ error: "Database operation failed" }` |
| LLM Processing Error | 500 | `{ error: "Processing failed" }` (logged, continues) |

### Error Handling Strategy

```javascript
// Centralized error handler
function handleError(error, context) {
  // Log full error with context for debugging
  console.error(`[${context}]`, error.message, error.stack);
  
  // Return sanitized error to client
  return {
    error: getPublicErrorMessage(error),
    // Never include: stack, internal codes, file paths
  };
}

// Firestore retry logic
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await sleep(Math.pow(2, attempt) * 100); // Exponential backoff
    }
  }
}
```

### Resilience Patterns

1. **Firestore Write Failures**: Retry with exponential backoff, log on final failure
2. **LLM Processing Failures**: Log error, skip insight generation for that window, continue with next
3. **Invalid Input**: Return 400 immediately with validation details
4. **Missing Resources**: Return 404 with generic message

## Testing Strategy

### Dual Testing Approach

This migration requires both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, API contracts, and error conditions
- **Property tests**: Verify universal properties hold across all valid inputs using randomized testing

### Property-Based Testing Configuration

**Library**: [fast-check](https://github.com/dubzzz/fast-check) for JavaScript/Node.js

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature and property reference
- Tag format: `Feature: firebase-migration, Property N: {property_text}`

### Test Categories

#### Unit Tests
- API endpoint contract tests (request/response format)
- Error handling edge cases (missing fields, invalid IDs)
- Demo mode behavior verification
- Transformer function output validation

#### Property-Based Tests
- Round-trip consistency for all document types
- Sorting invariants for list queries
- Schema compliance for transformed data
- Determinism of mock LLM processing

### Test File Structure

```
server/
├── src/
│   └── ...
└── tests/
    ├── unit/
    │   ├── controllers/
    │   │   ├── ingestController.test.js
    │   │   └── meetingController.test.js
    │   ├── repositories/
    │   │   ├── meetingRepository.test.js
    │   │   └── insightRepository.test.js
    │   └── utils/
    │       └── transformers.test.js
    ├── property/
    │   ├── roundTrip.property.test.js
    │   ├── sorting.property.test.js
    │   ├── schema.property.test.js
    │   └── determinism.property.test.js
    └── generators/
        ├── meetingGenerator.js
        ├── insightGenerator.js
        └── visualGenerator.js
```

### Firestore Emulator Usage

All tests should run against the Firebase Emulator Suite to:
- Avoid costs from real Firestore operations
- Enable fast, isolated test runs
- Allow testing without network dependencies

```bash
# Start emulator before tests
firebase emulators:start --only firestore

# Run tests with emulator
FIRESTORE_EMULATOR_HOST=localhost:8080 npm test
```

## Frontend Real-Time Sync Explanation

### How It Works

The frontend receives real-time updates through Firestore's `onSnapshot` listeners, replacing the previous Socket.IO event subscriptions:

```typescript
// Frontend subscription example (no changes needed to existing code pattern)
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Subscribe to transcript updates
const unsubscribe = onSnapshot(
  query(
    collection(db, `meetings/${meetingId}/minutes`),
    orderBy('startTime', 'asc')
  ),
  (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        // Update UI with new/modified transcript
        handleTranscriptUpdate(change.doc.data());
      }
    });
  }
);

// Subscribe to insights
const unsubscribeActions = onSnapshot(
  collection(db, `meetings/${meetingId}/actions`),
  (snapshot) => {
    const actions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setActionItems(actions);
  }
);
```

### Backend Write → Frontend Update Flow

1. Backend receives caption chunk via REST API
2. Backend writes to `meetings/{id}/minutes/{minuteId}` using Admin SDK
3. Firestore propagates change to all active listeners
4. Frontend `onSnapshot` callback fires with new data
5. React state updates, UI re-renders

**Latency**: Typically 100-500ms from backend write to frontend update (vs ~50-100ms for Socket.IO). Acceptable for meeting transcription use case.

### Granular Updates

The subcollection design enables granular updates:
- Transcript updates only trigger `minutes` listeners
- New insights only trigger `actions` or `decisions` listeners
- Visuals only trigger `visuals` listeners

This prevents unnecessary re-renders and reduces bandwidth compared to updating a single large meeting document.

## Performance, Indexing, and Cost Control

### Firestore Indexes

**Required Composite Indexes** (add to `firestore.indexes.json`):

```json
{
  "indexes": [
    {
      "collectionGroup": "meetings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "minutes",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "meetingId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Cost Optimization Strategies

1. **Subcollections over Arrays**: Storing minutes/insights as subcollections instead of arrays in the meeting document reduces write costs (only write changed documents, not entire meeting)

2. **Batch Writes**: When processing insights, batch multiple writes into a single operation:
   ```javascript
   const batch = db.batch();
   actions.forEach(action => {
     const ref = db.collection(`meetings/${meetingId}/actions`).doc();
     batch.set(ref, action);
   });
   await batch.commit(); // Single write operation
   ```

3. **Query Limits**: Always use `.limit()` on list queries to prevent runaway reads

4. **Field Updates**: Use `update()` instead of `set()` for partial updates to minimize data transfer

5. **Listener Cleanup**: Frontend must unsubscribe from listeners when components unmount to prevent orphaned connections

### Estimated Costs (per 1000 meetings)

| Operation | Count | Cost |
|-----------|-------|------|
| Meeting creates | 1,000 | ~$0.18 |
| Minute window writes (avg 30/meeting) | 30,000 | ~$5.40 |
| Insight writes (avg 10/meeting) | 10,000 | ~$1.80 |
| Meeting list reads | 10,000 | ~$0.36 |
| Real-time listener reads | 100,000 | ~$3.60 |

**Total estimated**: ~$11.34 per 1000 meetings (varies by usage patterns)

## Migration Notes

### Files to Remove
- `server/src/config/db.js` (MongoDB connection)
- All Socket.IO related code in `server/server.js`

### Files to Add
- `server/src/config/firebase.js` (Firebase initialization)
- `server/src/repositories/*.js` (Firestore repository layer)
- `server/src/utils/transformers.js` (Data transformation)

### Files to Modify
- `server/server.js` (Remove Socket.IO, add Firebase init)
- `server/src/controllers/ingestController.js` (Replace Socket.IO with Firestore writes)
- `server/src/controllers/meetingController.js` (Replace Mongoose with Firestore queries)
- `server/src/services/SimulationService.js` (Replace Socket.IO with Firestore writes)
- `server/src/config/env.js` (Add Firebase config variables)
- `server/package.json` (Add firebase-admin, remove mongoose/socket.io)

### Environment Variables to Add
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Environment Variables to Remove
```
MONGO_URI
```
