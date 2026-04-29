# SpeakFlow — Canonical Model (Single Source of Truth)

> This file defines the **exact** names of every actor, class, and model used in the portfolio. The use case diagram, use case tables, class diagram, and sequence diagrams all reference these names verbatim. Nothing else is allowed to appear in those documents. If something new is needed, it gets added here first.

## Actors

| Name | Kind | Role |
|---|---|---|
| **User** | Primary (human) | Practices speaking, records speech, reviews feedback |
| **MicrophoneService** | Secondary (system/hardware) | Wraps the device microphone; supplies an audio stream when asked |

## Classes — grouped by layer

### Views (V) — what the user sees
| Class | Responsibility |
|---|---|
| `AppLayoutView` | Top-level shell; owns navigation and routes between the four page views below |
| `TrainerView` | The practice page: generate prompt → record speech → show live transcript |
| `TeleprompterView` | Scrolling-script practice page (not part of the 3 core scenarios; shown in class diagram for completeness) |
| `MicroLessonsView` | Library of short skill lessons (shown in class diagram for completeness) |
| `DashboardView` | Post-session feedback page: shows `SpeechAnalysis` and history of `DrillSession`s |

### Controllers (C) — MVC glue, no UI, no persistence
| Class | Responsibility |
|---|---|
| `PromptController` | Gets a random `Prompt` from `DataRepository` and hands it to the view |
| `RecordingController` | Orchestrates `MicrophoneService` + `SpeechRecognitionService`; builds the `AudioRecording` + live `TranscriptSegment`s |
| `AnalysisController` | Sends a finished `AudioRecording` + transcript to `AIAnalysisService`; packages the result as a `DrillSession` and stores it |

### Models (M) — plain data objects
| Class | Key attributes |
|---|---|
| `Prompt` | `id`, `topic`, `category`, `difficulty` |
| `AudioRecording` | `id`, `userId`, `promptId`, `startedAt`, `durationMs`, `audioBlob` |
| `TranscriptSegment` | `type` ("speech" \| "filler" \| "pause"), `text`, `timestampMs` |
| `SpeechAnalysis` | `fillerCount`, `wpm`, `clarityScore`, `relevanceScore`, `feedbackText` |
| `DrillSession` | `id`, `promptId`, `audioRecordingId`, `analysis: SpeechAnalysis`, `createdAt` |

### External / Service layer — the "filters" in the pipe-and-filter data flow
| Class | Responsibility |
|---|---|
| `MicrophoneService` | Hardware mic access (also acts as a secondary actor in UC2) |
| `SpeechRecognitionService` | Browser Speech-to-Text; emits `TranscriptSegment`s as the user speaks |
| `AIAnalysisService` | External AI (Gemini Flash) — consumes transcript, produces `SpeechAnalysis` |
| `DataRepository` | Single database access point (Supabase) — reads `Prompt`s, writes `DrillSession`s |

## Use-case-to-class map

| Use case | Actor(s) | Views touched | Controller | Models created/read | External services used |
|---|---|---|---|---|---|
| **UC1 — Generate Speaking Prompt** | User | `TrainerView` | `PromptController` | `Prompt` (read) | `DataRepository` |
| **UC2 — Record Practice Speech** | User, `MicrophoneService` | `TrainerView` | `RecordingController` | `AudioRecording`, `TranscriptSegment` (create) | `MicrophoneService`, `SpeechRecognitionService`, `DataRepository` |
| **UC3 — Analyse Speaking Style** | User | `DashboardView` | `AnalysisController` | `AudioRecording` (read), `TranscriptSegment` (read), `SpeechAnalysis` (create), `DrillSession` (create) | `AIAnalysisService`, `DataRepository` |

## Rule for the portfolio

Every name in the use case tables, class diagram, and sequence diagrams **must** appear in the tables above. If a slide uses a name not on this list, it is wrong and needs fixing.
