# Prerequisites Analysis for Session Objectives

**Date**: 2026-01-14  
**Objectives Under Analysis**:
1. Fixing the Voice Mode
2. Adding Visualization Features
3. Implementing In-Meeting Visual Triggers and Closers

---

## Executive Summary

Before implementing the three session objectives, there are critical **foundational gaps** that must be addressed. The most significant blocker is the **database connection state** - the server currently connects to MongoDB while repositories use Mongoose models, but there's an incomplete migration to Firestore. Additionally, the frontend lacks real-time data flow for visualizations, relying on mock data.

---

# OBJECTIVE 1: Fixing Voice Mode

## Current State

| Component | File | Status |
|-----------|------|--------|
| Voice API Endpoint | `/api/voice/interact` | ✅ Implemented |
| VoiceService (ElevenLabs TTS) | `server/src/services/VoiceService.js` | ✅ Implemented |
| VoiceController | `server/src/controllers/voiceController.js` | ✅ Implemented |
| LLM Voice Response | `LLMService.generateVoiceResponse()` | ✅ Implemented |
| VoiceSessionModal (Frontend) | `client/src/components/Modals/VoiceSessionModal.tsx` | ✅ Implemented |
| VoiceVisualizer (Frontend) | `client/src/components/Voice/VoiceVisualizer.tsx` | ✅ Implemented |

## Prerequisites & Blockers

### P1.1: Environment Variable Configuration (CRITICAL)

**Issue**: Voice mode requires `ELEVENLABS_API_KEY` to function properly.

| Variable | Required | Current State |
|----------|----------|---------------|
| `ELEVENLABS_API_KEY` | Yes | ❌ Not in `.env` (missing file) |
| `ELEVENLABS_VOICE_ID` | No | Has default (`21m00Tcm4TlvDq8ikWAM`) |

**Prerequisite**: Create `server/.env` with `ELEVENLABS_API_KEY` value.

### P1.2: LLM API Key for Context Responses (HIGH)

**Issue**: `generateVoiceResponse()` in `LLMService.js` requires `GROK_API_KEY` for real responses. Without it, only hardcoded fallback is returned.

| Variable | Required | Fallback Behavior |
|----------|----------|-------------------|
| `GROK_API_KEY` | For real responses | Returns static mock response |

**Prerequisite**: Either set `GROK_API_KEY` or accept demo mode behavior.

### P1.3: Meeting Context Data Flow (HIGH)

**Issue**: The voice controller fetches meeting context via:
- `getMeetingById()` → From `meetingRepository.js` → Uses MongoDB/Mongoose
- `getMinutesByMeeting()` → From `minuteRepository.js` → Uses MongoDB/Mongoose

**Current Flow**:
```
VoiceController → meetingRepository.getMeetingById() → Mongoose → MongoDB
VoiceController → minuteRepository.getMinutesByMeeting() → Mongoose → MongoDB
```

**Prerequisite**: MongoDB connection must be active and contain valid meeting data.

### P1.4: Browser API Compatibility (MEDIUM)

**Issue**: `VoiceSessionModal.tsx` uses `SpeechRecognition` API which is:
- ✅ Supported in Chrome/Edge
- ❌ Not supported in Firefox/Safari

**Code Location** (lines 50-54):
```typescript
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
if (!SpeechRecognition) {
    setError('Browser does not support Voice Recognition.')
    return
}
```

**Prerequisite**: Document browser requirements or implement fallback.

### P1.5: Audio Context Suspended State (MEDIUM)

**Issue**: `VoiceVisualizer.tsx` creates an `AudioContext` which starts suspended until user gesture. Lines 25-37 handle this, but may need verification.

**Prerequisite**: Test that first user interaction (clicking mic button) properly resumes AudioContext.

### P1.6: MediaElementAudioSourceNode Limitation (LOW)

**Issue**: In `VoiceVisualizer.tsx` lines 83-84:
```typescript
const source = ctx.createMediaElementSource(audioElement)
```
A `MediaElementAudioSourceNode` can only be created **once** per `HTMLMediaElement`. If the audio element ref changes, this will error silently.

**Prerequisite**: Verify audio element lifecycle management doesn't cause visualization failures.

---

# OBJECTIVE 2: Adding Visualization Features

## Current State

| Component | File | Status |
|-----------|------|--------|
| VisualIntelligenceView | `client/src/views/VisualIntelligence/VisualIntelligenceView.tsx` | ⚠️ Uses mock data only |
| VisualizationCard (chart rendering) | Same file | ✅ Renders bar, line, pie, timeline charts |
| VisualEngine (backend) | `server/src/services/VisualEngine.js` | ✅ Generates chart configs |
| visualRepository | `server/src/repositories/visualRepository.js` | ⚠️ Uses Mongoose |
| GET /api/meetings/:id/artifacts | `meetingController.js` | ✅ Returns visuals |

## Prerequisites & Blockers

### P2.1: Frontend Uses Mock Data Instead of API (CRITICAL)

**Issue**: `VisualIntelligenceView.tsx` line 1:
```typescript
import { mockVisualizations } from '../../data/mockData'
```

The view **never calls the backend API** - it only renders hardcoded mock data.

**Prerequisite**: Replace mock data import with API call to `/api/meetings/:id/artifacts` to fetch real visuals.

### P2.2: No Meeting Context for Visualization View (HIGH)

**Issue**: The `/visuals` route has no concept of which meeting's visualizations to show.

**Current**: Shows static mock data for all users regardless of active meeting.

**Prerequisite**: Architecture decision needed:
- Option A: Show visuals for currently selected meeting (requires `activeMeetingId` from AppContext)
- Option B: Show aggregated visuals across all meetings
- Option C: Add meeting selector to the page

### P2.3: Database Connection State (HIGH)

**Issue**: `visualRepository.js` uses Mongoose models:
```javascript
const Visual = require('../models/Visual');
// ...
const visuals = await Visual.find({ meetingId });
```

**Prerequisite**: MongoDB must be running and connected via `server/src/config/db.js`.

### P2.4: Visualization Type Mapping (MEDIUM)

**Issue**: Backend `VisualEngine.js` returns Chart.js format, but frontend `VisualizationCard` expects different structure:

**Backend returns** (Chart.js format):
```javascript
{
  type: 'line',
  data: {
    labels: [...],
    datasets: [{ label: '', data: [], borderColor: '' }]
  }
}
```

**Frontend expects** (simplified):
```typescript
{
  type: 'line',
  data: {
    labels: string[],
    values: number[]  // NOT datasets
  }
}
```

**Prerequisite**: Add transformation in `transformVisual()` utility or align data structures.

### P2.5: transformVisual Utility Exists but May Be Incomplete (MEDIUM)

**Issue**: `server/src/utils/transformers.js` contains `transformVisual()` but it needs to convert backend structure to frontend interface.

**Prerequisite**: Verify transformer correctly maps:
- `datasets[0].data` → `values`
- Preserves `labels`
- Handles missing/null fields gracefully

---

# OBJECTIVE 3: In-Meeting Visual Triggers and Closers

## Current State

| Component | File | Status |
|-----------|------|--------|
| LLMService.processWindow() | `server/src/services/LLMService.js` | ✅ Returns visualCandidates |
| SimulationService | `server/src/services/SimulationService.js` | ✅ Creates visuals during simulation |
| VisualEngine.generateChart() | `server/src/services/VisualEngine.js` | ⚠️ Limited (only 2 context types) |
| Live Meeting View | `client/src/views/LiveMeeting/LiveMeetingView.tsx` | ❌ No visual display |

## Prerequisites & Blockers

### P3.1: No Real-Time Visual Delivery to Frontend (CRITICAL)

**Issue**: When visuals are created during a live meeting (via simulation or ingestion), the frontend has **no way to receive them in real-time**.

**Current Data Flow**:
```
Backend: SimulationService → createVisual() → MongoDB
Frontend: Polls /api/meetings/:id/transcript (NOT /artifacts)
Result: Visuals are NOT fetched during live meetings
```

**Prerequisite**: One of:
- Add polling for `/api/meetings/:id/artifacts` in `AppContext.tsx`
- Implement WebSocket/Server-Sent Events for real-time visual push
- Implement Firebase Client SDK with `onSnapshot` listener

### P3.2: LiveMeetingView Has No Visual Container (CRITICAL)

**Issue**: `LiveMeetingView.tsx` only contains:
- `TranscriptView` component
- Auto-scroll controls

There is **no UI area** to display incoming visualizations during a live meeting.

**Prerequisite**: Design and implement a visual panel/overlay/sidebar within the live meeting view.

### P3.3: LLM Mock Processing is Random (HIGH)

**Issue**: `LLMService.mockProcess()` uses `Math.random()` to decide when to generate visuals:
```javascript
if (rand > 0.6) {
    visualCandidates.push({...});
}
```

**Prerequisite**: For reliable testing, either:
- Set DEMO_MODE=false and use real LLM (requires `GROK_API_KEY`)
- Modify mock to be deterministic for testing
- Accept random behavior during demo

### P3.4: VisualEngine Limited Context Types (MEDIUM)

**Issue**: `VisualEngine.generateChart()` only handles 2 contexts:
- `financial_growth` → line chart
- `budget_split` → pie chart
- Everything else → `generic` (empty data)

**Prerequisite**: Expand context types or make engine more dynamic for meeting content.

### P3.5: Visual Lifecycle Management (HIGH)

**Issue**: No concept of "closing" or dismissing visuals exists.

**Missing Features**:
- Visual show/hide animations
- User dismiss action
- Auto-close after timeout
- Visual priority/queue management

**Prerequisite**: Define visual lifecycle specification:
- When does a visual appear? (immediately on creation? with animation?)
- How long does it stay? (fixed duration? until dismissed?)
- Can visuals queue/stack? (if multiple trigger simultaneously)

### P3.6: sourceWindowId Linkage (MEDIUM)

**Issue**: Visuals have `sourceWindowId` linking back to the transcript minute that triggered them, but there's no frontend UI to show this relationship.

**Prerequisite**: Decide if visuals should be:
- Displayed inline with transcript at the triggering point
- Displayed in a separate panel with "jump to source" functionality
- Both

---

# Cross-Cutting Prerequisites

## CC1: Database Consistency (CRITICAL)

| Issue | Details |
|-------|---------|
| `server.js` connects to MongoDB | Line 7: `connectDB()` |
| Repositories use Mongoose models | `Visual.find()`, `Meeting.create()`, etc. |
| MongoDB must be running | Default: `mongodb://localhost:27017/neuronotes` |
| `MONGODB_URI` env var | Optional (has fallback) |

**Prerequisite**: Ensure MongoDB is running before any feature testing.

## CC2: Missing .env File (CRITICAL)

The `server/.env` file does not exist. Required for:

| Feature | Variable Needed |
|---------|----------------|
| Voice Mode | `ELEVENLABS_API_KEY` |
| Real LLM Responses | `GROK_API_KEY` |
| Database | `MONGODB_URI` (optional, has fallback) |
| Demo Mode Toggle | `DEMO_MODE` |

**Prerequisite**: Create `server/.env` from `server/.env.example`.

## CC3: API Base URL Hardcoded (LOW)

Frontend has `http://localhost:5000` hardcoded in 10+ locations including:
- `AppContext.tsx`
- `VoiceSessionModal.tsx`
- `MainLayout.tsx`
- `MeetingsHistoryView.tsx`

**Prerequisite**: For deployment flexibility, consider centralizing API URL configuration.

---

# Prerequisites Checklist Summary

## CRITICAL (Must Fix First)

- [ ] Create `server/.env` with required API keys
- [ ] Ensure MongoDB is running and accessible
- [ ] Replace `mockVisualizations` import with API call in VisualIntelligenceView
- [ ] Add real-time visual delivery mechanism to frontend
- [ ] Add visual display container to LiveMeetingView

## HIGH PRIORITY

- [ ] Fix data structure mismatch between backend and frontend visualization formats
- [ ] Add meeting context (activeMeetingId) to VisualIntelligenceView
- [ ] Define visual lifecycle (trigger, duration, dismissal)
- [ ] Add artifacts polling or real-time subscription for live meetings

## MEDIUM PRIORITY

- [ ] Test browser compatibility for SpeechRecognition API
- [ ] Verify AudioContext resumption on user gesture
- [ ] Expand VisualEngine context type handling
- [ ] Verify transformVisual utility correctness

## LOW PRIORITY (Nice to Have)

- [ ] Centralize API URL configuration
- [ ] Add sourceWindowId visualization in UI
- [ ] Handle MediaElementAudioSourceNode single-creation limitation

---

*End of Prerequisites Analysis*
