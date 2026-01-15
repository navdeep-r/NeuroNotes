# NeuroNotes2 - System Implementation Documentation

> **Generated**: 2026-01-14  
> **Purpose**: Reference document for implementation state

---

## Product Vision

NeuroNotes is a real-time AI meeting intelligence platform designed to transform passive conversations into autonomous execution. The system aims to be an active project manager during calls, not just a post-meeting summarizer.

### Core Capability Goals

| Capability | Description |
|------------|-------------|
| **The Doer (Voice-to-Action)** | Voice commands trigger n8n automation to execute API calls to tools like Jira/Trello |
| **The Brain (Truth Engine)** | Cross-Meeting RAG using Google Vertex to flag contradictions or forgotten decisions |
| **The Truth Check** | Real-time fact-checking of presented information during meetings |

---

# Current State

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS 3.4 |
| Backend | Node.js + Express.js |
| Database (Active) | MongoDB via Mongoose |
| Database (Prepared) | Firebase/Firestore (repositories implemented, not connected) |
| LLM | Groq API (OpenAI-compatible) |
| TTS | ElevenLabs API |
| Testing | Jest + fast-check (property-based) |

---

## Frontend - Implemented Features

### Views (Routes)

| Route | Component | Status |
|-------|-----------|--------|
| `/dashboard` | `DashboardView.tsx` | ✅ Renders stats cards and recent actions (mock data) |
| `/live` | `LiveMeetingView.tsx` | ✅ Displays live transcript with auto-scroll |
| `/history` | `MeetingsHistoryView.tsx` | ✅ Lists past meetings from API |
| `/visuals` | `VisualIntelligenceView.tsx` | ✅ Renders charts (mock data) |
| `/insights` | `InsightsView.tsx` | ✅ Shows analytics/trends (mock data) |
| `/settings` | `SettingsView.tsx` | ✅ Empty placeholder view |

### Components

| Component | Location | Functionality |
|-----------|----------|---------------|
| `MainLayout` | `components/Layout/` | CSS Grid layout with sidebar, topbar, content, command bar |
| `Sidebar` | `components/Layout/` | Navigation links + meeting list |
| `TopBar` | `components/Layout/` | Meeting title, live indicator, timer |
| `CommandBar` | `components/Layout/` | AI chat input with send button |
| `AIResponseDisplay` | `components/Layout/` | Overlay for AI responses |
| `TranscriptView` | `components/TranscriptView/` | Scrolling transcript with speaker chips |
| `SpeakerChip` | `components/SpeakerChip/` | Avatar/initials display for speakers |
| `LiveIndicator` | `components/LiveIndicator/` | Pulsing "LIVE" badge |
| `MeetingList` | `components/MeetingList/` | Sidebar meeting items |
| `MeetingTimer` | `components/MeetingTimer/` | Elapsed time display |
| `NewMeetingModal` | `components/Modals/` | Create meeting dialog |

### Global State (`context/AppContext.tsx`)

**State Properties:**
- `activeRoute` - Current navigation route
- `meetings` - Array of Meeting objects
- `activeMeetingId` - Currently selected meeting
- `isLive` - Whether active meeting is live
- `elapsedTime` - Timer seconds for live meetings
- `activeSpeakerId` - Currently speaking participant
- `autoScrollEnabled` - Transcript auto-scroll toggle
- `commandInput` - Current command bar text
- `commandBarFocused` - Focus state for command bar
- `sidebarCollapsed` - Sidebar collapse state
- `isNewMeetingModalOpen` - Modal visibility
- `aiResponse` - Current AI response text
- `chatHistory` - Array of ChatMessage objects
- `isProcessingCommand` - Loading state for AI

**Actions:**
- `setActiveRoute`, `setActiveMeeting`, `addTranscriptEntry`
- `setActiveSpeaker`, `setAutoScroll`, `setCommandInput`
- `executeCommand` - Sends query to `/api/chat/query`
- `updateElapsedTime`, `toggleSidebar`, `setMeetings`
- `deleteMeeting` - Calls `DELETE /api/meetings/:id`
- `endMeeting` - Calls `POST /api/meetings/:id/end`
- `toggleNewMeetingModal`, `setAiResponse`, `addChatMessage`

**Effects:**
- Fetches meetings list on mount from `/api/meetings`
- Polls transcript every 3 seconds for active meeting
- Timer updates every 1 second for live meetings

### TypeScript Interfaces (`types/index.ts`)

- `Speaker`, `Highlight`, `TranscriptEntry`
- `Decision`, `ActionItem`, `MeetingSummary`, `Meeting`
- `DashboardStats`, `RecentAction`
- `ChartData`, `Visualization`
- `TimeMetrics`, `TrendData`, `Recommendation`
- `ChatMessage`, `NavItem`
- `AppState`, `AppActions`

---

## Backend - Implemented Features

### API Routes

| Endpoint | Method | Controller | Functionality |
|----------|--------|------------|---------------|
| `/api/meetings` | GET | `meetingController.getMeetings` | List all meetings (sorted by createdAt desc, limit 50) |
| `/api/meetings/:id` | GET | `meetingController.getMeetingDetails` | Get single meeting |
| `/api/meetings/:id/artifacts` | GET | `meetingController.getMeetingArtifacts` | Get actions, decisions, visuals |
| `/api/meetings/:id/transcript` | GET | `meetingController.getMeetingTranscript` | Get full transcript |
| `/api/meetings` | POST | `meetingController.createMeeting` | Create new meeting |
| `/api/meetings/:id` | DELETE | `meetingController.deleteMeeting` | Delete meeting |
| `/api/meetings/:id/end` | POST | `meetingController.endMeeting` | End live meeting |
| `/api/meetings/:id/generate-summary` | POST | `meetingController.generateMeetingSummary` | Generate LLM summary |
| `/api/ingest/chunk` | POST | `ingestController.ingestChunk` | Ingest single transcript chunk |
| `/api/ingest/webhook` | POST | `ingestController.ingestWebhook` | Batch ingest from Chrome extension |
| `/api/ingest/start-simulation` | POST | `ingestController.startSimulation` | Start demo simulation |
| `/api/chat/query` | POST | `chatController.query` | AI Q&A over meeting context |
| `/api/voice/synthesize` | POST | `voiceController.synthesize` | Text-to-speech generation |
| `/api/automation/pending` | GET | `automationRoutes` | List pending automations |
| `/api/automation/:id/approve` | POST | `automationRoutes` | Approve automation |
| `/api/automation/:id/reject` | POST | `automationRoutes` | Reject automation |

### Services

| Service | File | Functionality |
|---------|------|---------------|
| `LLMService` | `services/LLMService.js` | Groq API integration, `processWindow()`, `query()`, `generateVoiceResponse()`, `generateSummary()`, `mockProcess()` |
| `SimulationService` | `services/SimulationService.js` | Demo mode with scripted transcript (10 entries), writes to Firestore every 3 seconds |
| `AutomationService` | `services/AutomationService.js` | Intent detection via regex, logs to MongoDB, triggers n8n webhooks |
| `VoiceService` | `services/VoiceService.js` | ElevenLabs TTS API with fallback mock audio |
| `VisualEngine` | `services/VisualEngine.js` | Chart configuration generation |

### Mongoose Models (`models/`)

| Model | Fields |
|-------|--------|
| `Meeting` | title, status, startTime, endTime, participants, summary, createdAt, updatedAt |
| `Minute` | meetingId, content, speaker, timestamp |
| `MinuteWindow` | meetingId, startTime, endTime, transcript, segments, speaker, processed |
| `Action` | meetingId, content, assignee, status, sourceWindowId |
| `Decision` | meetingId, content, confidence, sourceWindowId |
| `Visual` | meetingId, type, title, description, data, sourceWindowId |
| `Insight` | meetingId, content, type, metadata |
| `VisualArtifact` | meetingId, chartType, config, generatedAt |
| `AutomationLog` | meetingId, triggerText, intent, parameters, status, externalId, error |

### Firestore Repositories (`repositories/`)

| Repository | Methods |
|------------|---------|
| `meetingRepository.js` | `createMeeting()`, `getMeetingById()`, `getAllMeetings()`, `updateMeeting()`, `deleteMeeting()`, `getLatestLiveMeeting()` |
| `minuteRepository.js` | `upsertMinuteWindow()`, `appendTranscript()`, `getMinutesByMeeting()` |
| `insightRepository.js` | `createAction()`, `createDecision()`, `batchCreateInsights()`, `getArtifactsByMeeting()` |
| `visualRepository.js` | `createVisual()`, `getVisualsByMeeting()` |

### Configuration (`config/`)

| File | Purpose |
|------|---------|
| `db.js` | MongoDB/Mongoose connection |
| `firebase.js` | Firebase Admin SDK initialization |
| `env.js` | Environment variable exports |

### Environment Variables (`.env.example`)

- `PORT` - Server port (default: 5000)
- `DEMO_MODE` - Enable mock LLM processing
- `GEMINI_API_KEY` - Google Gemini API key
- `GROK_API_KEY` - Groq API key
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Firebase credentials
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` - TTS credentials
- `N8N_WEBHOOK_URL` - n8n automation webhook

### Property-Based Tests (`tests/property/`)

| Test File | Property Validated |
|-----------|-------------------|
| `roundTrip.property.test.js` | Meeting document round-trip consistency |
| `subcollection.property.test.js` | Subcollection structure integrity |
| `dataWriteRoundTrip.property.test.js` | Data write round-trip consistency |
| `captionIngestion.property.test.js` | Caption ingestion persistence |
| `llmDeterminism.property.test.js` | LLM demo mode determinism |
| `meetingListSorting.property.test.js` | Meeting list sorting order |
| `artifactsRetrieval.property.test.js` | Artifacts retrieval completeness |
| `queryResultLimiting.property.test.js` | Query result limiting |
| `transformers.property.test.js` | Data transformation schema compliance |
| `errorSanitization.property.test.js` | Error response sanitization |

---

# Unfinished

## Database Migration (MongoDB → Firestore)

| Item | Status | Issue |
|------|--------|-------|
| `server.js` entry point | ❌ Uses MongoDB | Calls `connectDB()` instead of `initializeFirebase()` |
| `config/db.js` | ❌ Still exists | Should be deleted per migration plan |
| Mongoose models | ❌ Still active | Controllers/services still import Mongoose models |
| AutomationService | ❌ Uses Mongoose | `AutomationLog` model not migrated to Firestore |
| Firestore repositories | ✅ Implemented | Ready but not connected in `server.js` |

## Frontend - Not Connected to Backend

| View | Issue |
|------|-------|
| `DashboardView` | Uses `mockDashboardStats`, `mockRecentActions` instead of API |
| `VisualIntelligenceView` | Uses `mockVisualizations` instead of `/api/meetings/:id/artifacts` |
| `InsightsView` | Uses `mockTimeMetrics`, `mockTrendData`, `mockRecommendations` instead of API |

## Real-Time Updates

| Expected | Actual |
|----------|--------|
| Firestore `onSnapshot` listeners for live updates | Frontend polls `/api/meetings/:id/transcript` every 3 seconds |
| Firebase Client SDK in frontend | Not installed |

## The Doer (Voice-to-Action)

| Aspect | Status |
|--------|--------|
| Intent detection | ✅ Regex patterns for `schedule_meeting`, `create_ticket` |
| n8n webhook trigger | ✅ Implemented in `AutomationService.triggerWebhook()` |
| Voice command capture | ❌ No microphone input integration |
| Jira/Trello integrations | ❌ Not implemented (would be in n8n workflows) |
| Approval UI | ❌ No frontend panel for pending automations |
| Broader action types | ❌ Only 2 intents implemented |

## The Brain (Truth Engine)

| Component | Status |
|-----------|--------|
| Cross-Meeting RAG | ❌ Not implemented |
| Vector database | ❌ Not implemented |
| Google Vertex integration | ❌ Not implemented |
| Contradiction detection | ❌ Not implemented |
| Past decisions lookup | ❌ Not implemented |

## The Truth Check

| Component | Status |
|-----------|--------|
| Real-time fact-checking | ❌ Not implemented |
| External source validation | ❌ Not implemented |
| Fact-check UI indicators | ❌ Not implemented |

## Summary Generation

| Aspect | Status |
|--------|--------|
| Backend endpoint | ✅ `POST /api/meetings/:id/generate-summary` |
| LLM integration | ✅ `LLMService.generateSummary()` |
| Frontend trigger button | ❌ Not implemented |

## Voice/TTS Integration

| Aspect | Status |
|--------|--------|
| Backend endpoint | ✅ `POST /api/voice/synthesize` |
| ElevenLabs integration | ✅ `VoiceService.generateAudio()` |
| Frontend audio playback | ❌ No UI for voice output |
| Voice response synthesis | ✅ `LLMService.generateVoiceResponse()` |

## Automation Management UI

| Feature | Status |
|---------|--------|
| Backend endpoints | ✅ `/api/automation/pending`, `/approve`, `/reject` |
| Frontend panel | ❌ Not implemented |
| Edit parameters before approval | ❌ Backend supports, no UI |

## Tests

| Category | Status |
|----------|--------|
| Property-based tests | ✅ 10 test files |
| Unit tests | ⚠️ Minimal coverage |
| Frontend tests | ⚠️ Only `App.test.tsx` |
| Integration tests | ❌ Not implemented |
| E2E tests | ❌ Not implemented |

## Firestore Indexes

| Item | Status |
|------|--------|
| `firestore.indexes.json` | ✅ Created with required indexes |
| Deployment | ❓ Unknown if deployed to Firebase |

---

## File Inventory

### Files to Remove (per migration plan)

- `server/src/config/db.js` - MongoDB connection

### Files to Update (per migration plan)

- `server/server.js` - Switch from MongoDB to Firebase
- `server/src/services/AutomationService.js` - Migrate from Mongoose to Firestore
- `server/src/models/AutomationLog.js` - Convert to Firestore repository

---

## Environment Requirements

### Required for Production

- Firebase project with Firestore enabled
- Groq API key for LLM processing
- ElevenLabs API key for TTS (optional)
- n8n instance with webhook (optional, for automations)

### Required for Development

- Node.js >= 18.0.0
- MongoDB instance (current active database)
- Firebase credentials (for Firestore features)

---

*End of Documentation*
