# Requirements Document

## Introduction

This document specifies the requirements for converting MinuteFlow's backend from a MERN stack (MongoDB + Express + Socket.IO) to a Firebase-based architecture. MinuteFlow is a real-time AI meeting intelligence system that provides live transcription, AI-generated insights, action items, decisions, and visualizations. The conversion must preserve all existing frontend contracts and product behavior while replacing MongoDB with Firestore and Socket.IO with Firestore real-time listeners.

## Glossary

- **MinuteFlow_System**: The complete MinuteFlow application including frontend and backend components
- **Firestore_Database**: Google Cloud Firestore NoSQL document database replacing MongoDB
- **Firebase_Admin_SDK**: Server-side Firebase SDK for secure backend operations
- **Meeting_Document**: A Firestore document representing a single meeting session
- **MinuteWindow_Document**: A Firestore document representing a 60-second transcript segment within a meeting
- **Insight_Document**: A Firestore document representing AI-generated action items or decisions
- **Visual_Artifact_Document**: A Firestore document representing generated chart/visualization data
- **Real_Time_Listener**: Firestore onSnapshot subscription that receives document changes automatically
- **Caption_Ingestion_Service**: Backend service that receives and processes transcript chunks every 60 seconds
- **LLM_Service**: Backend service that processes transcripts through AI models to extract insights
- **Simulation_Service**: Backend service that generates deterministic demo data without calling real LLMs
- **Demo_Mode**: Application mode where fake data is written to Firestore instead of calling real LLMs

## Requirements

### Requirement 1: Firestore Database Schema Design

**User Story:** As a backend developer, I want a well-structured Firestore schema that mirrors the existing MongoDB data model, so that all existing data relationships and queries are preserved.

#### Acceptance Criteria

1. THE Firestore_Database SHALL store Meeting_Documents at the path `meetings/{meetingId}` with fields: title (string), status (enum: live|completed|scheduled), startTime (timestamp), endTime (timestamp), participants (array of strings), summary (string), createdAt (timestamp), updatedAt (timestamp)
2. THE Firestore_Database SHALL store MinuteWindow_Documents as a subcollection at the path `meetings/{meetingId}/minutes/{minuteId}` with fields: startTime (timestamp), endTime (timestamp), transcript (string), processed (boolean), createdAt (timestamp), updatedAt (timestamp)
3. THE Firestore_Database SHALL store action items as Insight_Documents at the path `meetings/{meetingId}/actions/{actionId}` with fields: content (string), assignee (string), status (enum: pending|in-progress|completed), sourceWindowId (string), createdAt (timestamp), updatedAt (timestamp)
4. THE Firestore_Database SHALL store decisions as Insight_Documents at the path `meetings/{meetingId}/decisions/{decisionId}` with fields: content (string), confidence (number 0-1), sourceWindowId (string), createdAt (timestamp), updatedAt (timestamp)
5. THE Firestore_Database SHALL store Visual_Artifact_Documents at the path `meetings/{meetingId}/visuals/{visualId}` with fields: type (enum: bar|line|pie|generic), title (string), description (string), data (map), sourceWindowId (string), createdAt (timestamp), updatedAt (timestamp)

### Requirement 2: Firebase Admin SDK Integration

**User Story:** As a backend developer, I want the server to use Firebase Admin SDK for all Firestore operations, so that writes are secure and authenticated without exposing client credentials.

#### Acceptance Criteria

1. THE Firebase_Admin_SDK SHALL be initialized using environment-based service account credentials
2. WHEN the backend starts, THE Firebase_Admin_SDK SHALL validate credentials and establish a connection to Firestore
3. IF Firebase credentials are missing or invalid, THEN THE MinuteFlow_System SHALL log an error and exit gracefully
4. THE Firebase_Admin_SDK SHALL be the exclusive method for server-side Firestore writes
5. THE MinuteFlow_System SHALL NOT use Firebase client SDK in the backend

### Requirement 3: Real-Time Data Delivery via Firestore

**User Story:** As a frontend developer, I want the backend to write data to Firestore so that my existing real-time listeners receive updates automatically, without any Socket.IO dependencies.

#### Acceptance Criteria

1. WHEN the backend writes a transcript update, THE Firestore_Database SHALL store it in the appropriate MinuteWindow_Document so that frontend Real_Time_Listeners receive the update
2. WHEN the backend generates an insight, THE Firestore_Database SHALL store it in the appropriate Insight_Document so that frontend Real_Time_Listeners receive the update
3. WHEN the backend creates a visualization, THE Firestore_Database SHALL store it in the appropriate Visual_Artifact_Document so that frontend Real_Time_Listeners receive the update
4. THE MinuteFlow_System SHALL NOT contain any Socket.IO server code after migration
5. THE MinuteFlow_System SHALL NOT emit events via WebSocket for data delivery
6. WHEN a MinuteWindow_Document is updated, THE Firestore_Database SHALL update only the changed fields to minimize data transfer

### Requirement 4: Caption Ingestion API

**User Story:** As a meeting integration developer, I want to send transcript chunks to the backend via REST API, so that captions are processed and stored in Firestore.

#### Acceptance Criteria

1. THE Caption_Ingestion_Service SHALL expose a POST endpoint at `/api/ingest/chunk` accepting meetingId (string), text (string), timestamp (ISO string), and speaker (string)
2. WHEN a valid caption chunk is received, THE Caption_Ingestion_Service SHALL write the transcript to the appropriate MinuteWindow_Document in Firestore
3. WHEN a caption chunk is received in Demo_Mode, THE Caption_Ingestion_Service SHALL return a 200 response with message "Ingest ignored in Demo Mode"
4. IF the meetingId does not exist, THEN THE Caption_Ingestion_Service SHALL return a 404 error
5. IF required fields are missing, THEN THE Caption_Ingestion_Service SHALL return a 400 error with validation details

### Requirement 5: LLM Processing Pipeline

**User Story:** As a product owner, I want transcript windows to be processed by AI to extract insights, so that users receive automated summaries, action items, and decisions.

#### Acceptance Criteria

1. WHEN a MinuteWindow_Document transcript is complete, THE LLM_Service SHALL process it to extract action items, decisions, and visual candidates
2. WHEN action items are extracted, THE LLM_Service SHALL write them as Insight_Documents to the `meetings/{meetingId}/actions` subcollection
3. WHEN decisions are extracted, THE LLM_Service SHALL write them as Insight_Documents to the `meetings/{meetingId}/decisions` subcollection
4. WHEN visual candidates are detected, THE LLM_Service SHALL generate chart configurations and write them as Visual_Artifact_Documents
5. WHILE Demo_Mode is enabled, THE LLM_Service SHALL use deterministic mock processing instead of calling external AI APIs

### Requirement 6: Simulation Service for Demo Mode

**User Story:** As a demo presenter, I want to start a simulated meeting that generates realistic data, so that I can showcase MinuteFlow without real meeting integrations.

#### Acceptance Criteria

1. THE Simulation_Service SHALL expose a POST endpoint at `/api/ingest/start-simulation` accepting an optional title (string)
2. WHEN simulation starts, THE Simulation_Service SHALL create a new Meeting_Document with status "live"
3. WHILE simulation is active, THE Simulation_Service SHALL write transcript entries to Firestore every 3 seconds
4. WHILE simulation is active, THE Simulation_Service SHALL process transcripts and write insights to Firestore
5. WHEN simulation completes all script entries, THE Simulation_Service SHALL stop automatically
6. THE Simulation_Service SHALL NOT call external LLM APIs during simulation

### Requirement 7: Meeting Query APIs

**User Story:** As a frontend developer, I want REST APIs to query meeting data, so that I can populate views that don't require real-time updates.

#### Acceptance Criteria

1. THE MinuteFlow_System SHALL expose a GET endpoint at `/api/meetings` returning all meetings sorted by createdAt descending
2. THE MinuteFlow_System SHALL expose a GET endpoint at `/api/meetings/{id}` returning a single Meeting_Document
3. THE MinuteFlow_System SHALL expose a GET endpoint at `/api/meetings/{id}/artifacts` returning all actions, decisions, and visuals for a meeting
4. IF a requested meeting does not exist, THEN THE MinuteFlow_System SHALL return a 404 error
5. WHEN querying meetings, THE MinuteFlow_System SHALL read from Firestore using Firebase_Admin_SDK

### Requirement 8: Frontend Data Contract Preservation

**User Story:** As a frontend developer, I want the backend to return data in the same format as before, so that I don't need to modify any frontend code.

#### Acceptance Criteria

1. THE MinuteFlow_System SHALL return Meeting_Documents with fields matching the frontend Meeting interface: id, title, status, startTime, endTime, participants
2. THE MinuteFlow_System SHALL return Insight_Documents with fields matching the frontend ActionItem interface: id, content, assignee, status, createdAt
3. THE MinuteFlow_System SHALL return Insight_Documents with fields matching the frontend Decision interface: id, content, timestamp, participants
4. THE MinuteFlow_System SHALL return Visual_Artifact_Documents with fields matching the frontend Visualization interface: id, title, description, type, data
5. WHEN returning timestamps, THE MinuteFlow_System SHALL format them as ISO 8601 strings or JavaScript Date-compatible values

### Requirement 9: Error Handling and Resilience

**User Story:** As a system operator, I want the backend to handle errors gracefully, so that partial failures don't crash the entire system.

#### Acceptance Criteria

1. IF a Firestore write fails, THEN THE MinuteFlow_System SHALL log the error with context and return an appropriate HTTP error response
2. IF the LLM_Service fails to process a transcript, THEN THE MinuteFlow_System SHALL log the error and continue processing subsequent windows
3. IF Firebase connection is lost, THEN THE MinuteFlow_System SHALL attempt reconnection with exponential backoff
4. WHEN an API request fails validation, THE MinuteFlow_System SHALL return a 400 error with descriptive error messages
5. THE MinuteFlow_System SHALL NOT expose internal error details or stack traces in API responses

### Requirement 10: Performance and Cost Optimization

**User Story:** As a system architect, I want the Firestore schema and queries to be optimized, so that the system performs well and minimizes Firebase costs.

#### Acceptance Criteria

1. THE Firestore_Database SHALL use subcollections for minute windows, actions, decisions, and visuals to enable efficient per-meeting queries
2. WHEN updating MinuteWindow_Documents, THE MinuteFlow_System SHALL use granular field updates instead of full document rewrites
3. THE Firestore_Database SHALL have composite indexes for queries that filter by meetingId and sort by timestamp
4. WHEN querying meeting lists, THE MinuteFlow_System SHALL limit results to prevent unbounded reads
5. THE MinuteFlow_System SHALL batch multiple Firestore writes when processing insights to reduce write operations
