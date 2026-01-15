# NeuroNotes2 Implementation Plan

## Last Updated: 2026-01-15

This document outlines remaining features and issues to be addressed by the team.

---

## 🔴 High Priority

### 1. Real LLM Integration Testing
**Status:** Partially Implemented  
**Location:** `server/src/services/LLMService.js`

- Grok and Gemini API integration code exists but uses mock fallback when keys missing
- Test with real API keys (GROK_API_KEY, GEMINI_API_KEY)
- Verify response parsing works with actual LLM responses
- Handle rate limiting and error states

### 2. Visualization Trigger Refinement
**Status:** Functional (with workarounds)  
**Location:** `server/src/services/VisualizationTriggerService.js`

Current triggers:
- **Start:** "Start chart", "Begin chart", "Hey NeuroNotes create a visualization"
- **Stop:** "End chart", "Stop chart", "Thanks NeuroNotes"

Issues:
- Chrome extension sends cumulative transcript (handled with lastProcessedLength tracking)
- Speech-to-text may misinterpret trigger phrases
- Consider adding content hashing to prevent duplicate processing

---

## 🟡 Medium Priority

### 3. Centralize API Base URL
**Status:** Not Started  
**Location:** 22 hardcoded instances in `client/src/`

**Current:** 
```typescript
fetch('http://localhost:5000/api/meetings')
```

**Target:**
```typescript
fetch(`${import.meta.env.VITE_API_BASE_URL}/api/meetings`)
```

**Files to update:**
- `client/src/context/AppContext.tsx` (9 instances)
- `client/src/views/Settings/WorkspaceSettings.tsx` (4 instances)
- `client/src/views/MeetingsHistory/MeetingsHistoryView.tsx` (3 instances)
- `client/src/views/VisualIntelligence/VisualIntelligenceView.tsx` (1 instance)
- `client/src/components/Modals/VoiceSessionModal.tsx` (1 instance)
- `client/src/components/Modals/NewMeetingModal.tsx` (1 instance)
- `client/src/components/Layout/MainLayout.tsx` (1 instance)

**Env variable:** `VITE_API_BASE_URL` (already defined in `client/env.example`)

### 4. Dashboard Stats Integration
**Status:** UI Only (hardcoded zeros)  
**Location:** `client/src/views/Dashboard/DashboardView.tsx`

Needs backend endpoint to return:
- Total meetings count
- Meetings this week
- Productivity score (calculated from actions/decisions ratio)
- Engagement rate
- Recent actions list

**Suggested endpoint:** `GET /api/analytics/dashboard`

### 5. Insights View Implementation
**Status:** UI Only (hardcoded zeros)  
**Location:** `client/src/views/Insights/InsightsView.tsx`

Needs backend to track and return:
- Total meeting time
- Average meeting length
- Time spent in decisions vs discussion
- Efficiency trend over time
- AI-generated recommendations

**Suggested endpoint:** `GET /api/analytics/insights`

### 6. User-Facing Error Messages
**Status:** Console-only errors  
**Location:** Multiple files

Currently, errors are logged to console but not shown to users. Add toast/notification system for:
- API failures
- Voice recognition errors
- Visualization generation failures

---

## 🟢 Low Priority

### 7. Visual Intelligence - Show All Visualizations
**Status:** Per-meeting only  
**Location:** `client/src/views/VisualIntelligence/VisualIntelligenceView.tsx`

Current behavior: Shows visualizations for the selected meeting only

Enhancement options:
- A) Show all visualizations from all meetings (grouped)
- B) Add dropdown filter by meeting
- C) Add "Show All" toggle

### 8. Voice Visualizer Speaking Animation
**Status:** Intentionally Disabled  
**Location:** `client/src/components/Voice/VoiceVisualizer.tsx`

The `createMediaElementSource` was causing audio playback issues. Currently using fallback animation when AI is speaking. Could be re-enabled once Web Audio API issues are resolved.

### 9. Meeting Scheduling Integration
**Status:** UI Exists, No Calendar Integration  
**Location:** Automation actions

The "Schedule Meeting" automation type exists but doesn't integrate with actual calendar APIs (Google Calendar, Outlook, etc.)

---

## ✅ Recently Completed (This Session)

1. **Voice Mode Audio Playback** - Fixed by bypassing Web Audio API routing
2. **AutomationLog Model** - Created missing Mongoose model
3. **Visualization Trigger System** - Implemented transcript-driven chart generation
4. **Visual Intelligence API Connection** - Frontend now fetches from backend
5. **VisualEngine Enhancement** - Supports dynamic data from LLM

---

## 📁 Key Files Reference

| Area | Backend | Frontend |
|------|---------|----------|
| Visualization | `VisualizationTriggerService.js`, `VisualEngine.js` | `VisualIntelligenceView.tsx` |
| Voice Mode | `VoiceService.js`, `voiceController.js` | `VoiceSessionModal.tsx`, `VoiceVisualizer.tsx` |
| LLM | `LLMService.js` | - |
| Meetings | `meetingController.js`, `meetingRepository.js` | `MeetingsHistoryView.tsx` |
| Automation | `automationController.js` | `ActionsView.tsx` |
| Ingest | `ingestController.js` | - |

---

## 🧪 Testing Commands

```bash
# Test visualization via API (browser console)
fetch('http://localhost:5000/api/ingest/test-visualization', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ meetingId: 'YOUR_MEETING_ID' })
}).then(r => r.json()).then(console.log);

# Test voice interaction (browser console)
fetch('http://localhost:5000/api/voice/interact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meetingId: 'YOUR_MEETING_ID',
    query: 'What were the main action items?'
  })
}).then(r => r.json()).then(d => {
  const audio = new Audio('data:audio/mp3;base64,' + d.audio);
  audio.play();
});
```

---

## 📝 Notes for Team

- Always have a **LIVE** meeting (status: 'live') when testing webhook ingestion
- The Chrome extension should be configured to send to `http://localhost:5000/api/ingest/webhook`
- Visualization triggers are case-insensitive
- Server auto-restarts on code changes (nodemon)
