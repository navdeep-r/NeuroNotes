# Implementation Plan: Firebase Migration

## Overview

This implementation plan converts MinuteFlow's backend from MongoDB + Socket.IO to Firebase/Firestore. Tasks are ordered to build incrementally: first the foundation (Firebase config, repositories), then controllers, then services, and finally cleanup. Property-based tests are included as sub-tasks close to their related implementation.

## Tasks

- [x] 1. Set up Firebase infrastructure and configuration
  - [x] 1.1 Update package.json dependencies
    - Add `firebase-admin` package
    - Remove `mongoose` and `socket.io` packages
    - Add `fast-check` for property-based testing
    - _Requirements: 2.1, 2.4_

  - [x] 1.2 Create Firebase configuration module
    - Create `server/src/config/firebase.js`
    - Initialize Firebase Admin SDK with environment variables
    - Export `initializeFirebase()` and `getDb()` functions
    - Handle missing/invalid credentials gracefully
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Update environment configuration
    - Modify `server/src/config/env.js` to add Firebase environment variables
    - Remove MONGO_URI reference
    - Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
    - _Requirements: 2.1_

- [x] 2. Implement Firestore repository layer
  - [x] 2.1 Create meeting repository
    - Create `server/src/repositories/meetingRepository.js`
    - Implement `createMeeting()`, `getMeetingById()`, `getAllMeetings()`, `updateMeeting()`
    - Use Firestore collection path `meetings/{meetingId}`
    - Include timestamp handling with `createdAt` and `updatedAt`
    - _Requirements: 1.1, 7.1, 7.2_

  - [x] 2.2 Write property test for meeting round-trip
    - **Property 1: Meeting Document Round-Trip Consistency**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Create minute window repository
    - Create `server/src/repositories/minuteRepository.js`
    - Implement `upsertMinuteWindow()`, `appendTranscript()`, `getMinutesByMeeting()`
    - Use Firestore subcollection path `meetings/{meetingId}/minutes/{minuteId}`
    - _Requirements: 1.2, 3.1_

  - [x] 2.4 Create insight repository
    - Create `server/src/repositories/insightRepository.js`
    - Implement `createAction()`, `createDecision()`, `batchCreateInsights()`, `getArtifactsByMeeting()`
    - Use subcollection paths `meetings/{meetingId}/actions` and `meetings/{meetingId}/decisions`
    - Implement batch writes for cost optimization
    - _Requirements: 1.3, 1.4, 3.2, 10.5_

  - [x] 2.5 Create visual repository
    - Create `server/src/repositories/visualRepository.js`
    - Implement `createVisual()`, `getVisualsByMeeting()`
    - Use subcollection path `meetings/{meetingId}/visuals/{visualId}`
    - _Requirements: 1.5, 3.3_

  - [x] 2.6 Write property test for subcollection structure
    - **Property 2: Subcollection Structure Integrity**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

  - [x] 2.7 Write property test for data write round-trip
    - **Property 3: Data Write Round-Trip Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Checkpoint - Repository layer complete
  - Ensure all repository tests pass
  - Verify Firestore emulator connectivity
  - Ask the user if questions arise

- [x] 4. Create data transformation utilities
  - [x] 4.1 Implement transformer functions
    - Create `server/src/utils/transformers.js`
    - Implement `transformMeeting()`, `transformAction()`, `transformDecision()`, `transformVisual()`
    - Convert Firestore Timestamps to JavaScript Dates
    - Ensure output matches frontend TypeScript interfaces
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 4.2 Write property test for data transformation schema compliance
    - **Property 9: Data Transformation Schema Compliance**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 5. Update controllers to use Firestore
  - [x] 5.1 Update ingest controller
    - Modify `server/src/controllers/ingestController.js`
    - Remove all `io.to().emit()` calls
    - Replace with Firestore repository writes
    - Maintain same request/response contract
    - Handle demo mode correctly
    - _Requirements: 3.1, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Write property test for caption ingestion persistence
    - **Property 4: Caption Ingestion Persistence**
    - **Validates: Requirements 4.2**

  - [x] 5.3 Update meeting controller
    - Modify `server/src/controllers/meetingController.js`
    - Replace Mongoose queries with Firestore repository calls
    - Apply transformers to response data
    - Implement query limits
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.4_

  - [x] 5.4 Write property test for meeting list sorting
    - **Property 6: Meeting List Sorting**
    - **Validates: Requirements 7.1**

  - [x] 5.5 Write property test for artifacts retrieval completeness
    - **Property 8: Artifacts Retrieval Completeness**
    - **Validates: Requirements 7.3**

  - [x] 5.6 Write property test for query result limiting
    - **Property 11: Query Result Limiting**
    - **Validates: Requirements 10.4**

- [x] 6. Checkpoint - Controllers updated
  - Ensure all controller tests pass
  - Verify API endpoints return correct data format
  - Ask the user if questions arise

- [x] 7. Update services for Firestore
  - [x] 7.1 Update Simulation Service
    - Modify `server/src/services/SimulationService.js`
    - Remove `io` parameter from `startSimulation()`
    - Replace Socket.IO emits with Firestore repository writes
    - Maintain same timing (3 second intervals) and script behavior
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.2 Write property test for LLM demo mode determinism
    - **Property 5: LLM Demo Mode Determinism**
    - **Validates: Requirements 5.5**

- [x] 8. Implement error handling
  - [x] 8.1 Create centralized error handler
    - Create `server/src/utils/errorHandler.js`
    - Implement `handleError()` with context logging
    - Implement `withRetry()` for Firestore operations with exponential backoff
    - Sanitize error responses to remove internal details
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.2 Write property test for error response sanitizatison
    - **Property 10: Error Response Sanitization**
    - **Validates: Requirements 9.5**

- [x] 9. Update server entry point
  - [x] 9.1 Modify server.js
    - Remove Socket.IO initialization and connection handlers
    - Remove `global.io` assignment
    - Add Firebase initialization call
    - Keep Express server setup
    - _Requirements: 3.4, 3.5_

- [x] 10. Cleanup and finalization
  - [x] 10.1 Remove deprecated files and code
    - Delete `server/src/config/db.js`
    - Remove any remaining MongoDB/Mongoose imports
    - Remove any remaining Socket.IO imports
    - _Requirements: 3.4, 3.5_

  - [x] 10.2 Create Firestore indexes configuration
    - Create `firestore.indexes.json` with required composite indexes
    - Document index requirements for deployment
    - _Requirements: 10.3_

  - [x] 10.3 Update environment example file
    - Create or update `.env.example` with Firebase variables
    - Remove MongoDB variables
    - _Requirements: 2.1_

- [x] 11. Final checkpoint - Migration complete
  - Ensure all tests pass
  - Verify no Socket.IO or MongoDB references remain
  - Test simulation mode end-to-end with Firestore emulator
  - Ask the user if questions arise

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All Firestore operations should be tested against the Firebase Emulator
