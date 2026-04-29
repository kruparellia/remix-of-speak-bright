# 4. Quality of Implementation [25%]

This section is primarily screenshots from the running app, paired with short captions explaining what each screen demonstrates. The goal is to show the working feature and — where relevant — trace it back to a specific use case and class.

> **What to paste on each slide:** a screenshot of the app running in the browser (from `remix-of-speak-bright`), plus 1–2 sentences of caption in the format below. Keep the captions explicit about which use case and class are being demonstrated — that reinforces the consistency theme of the portfolio.

## 4.1 Trainer screen — ready state (UC1, UC2)

**What to screenshot:** `TrainerView` when the user has just clicked "Generate Prompt" and is about to click "Start". The prompt topic should be visible.

**Caption:**
> `TrainerView` after UC1 "Generate Speaking Prompt" has completed. The displayed topic is the `Prompt.topic` returned by `PromptController.generatePrompt()` in step 6 of the UC1 success scenario. The "Go" button triggers UC2 step 1.

## 4.2 Trainer screen — recording in progress (UC2)

**What to screenshot:** `TrainerView` mid-drill, with the countdown ticking down and the live transcript filling in underneath. Try to capture a transcript that contains at least one filler word highlighted.

**Caption:**
> Live transcript updating in real time. Each line appearing in the transcript box is a `TranscriptSegment` emitted by `SpeechRecognitionService` (step 6 of UC2) and forwarded to the view by `RecordingController` (step 7). Filler words are colour-coded so the user can see them as they happen — this is the incremental-processing benefit of the pipe-and-filter architecture.

## 4.3 Trainer screen — post-recording (UC2 complete)

**What to screenshot:** the view immediately after clicking Stop, showing the final transcript and a "Session saved" indicator.

**Caption:**
> After step 13 of UC2: the `AudioRecording` has been persisted via `DataRepository.saveRecording()` and the saved `recordingId` has been returned to the view. The "Analyse" button that appears is the entry point to UC3.

## 4.4 Dashboard — history list (UC3 entry point)

**What to screenshot:** `DashboardView` with at least 3–4 past drills listed, sorted by date, each with a small summary.

**Caption:**
> `DashboardView` showing past `DrillSession`s loaded from `DataRepository`. Clicking "Analyse" on any row triggers UC3 step 1.

## 4.5 Dashboard — AI feedback (UC3)

**What to screenshot:** the rendered `SpeechAnalysis` results: filler count, WPM, clarity %, relevance %, and the feedback paragraph from the AI.

**Caption:**
> UC3 step 11 — `DashboardView.renderAnalysis(SpeechAnalysis)`. Every field on screen maps directly to an attribute of the `SpeechAnalysis` model: `fillerCount`, `wpm`, `clarityScore`, `relevanceScore`, and `feedbackText`. The AI service that produced these values is `AIAnalysisService` (Gemini Flash).

## 4.6 Dashboard — progress charts

**What to screenshot:** the charts view showing filler count and WPM trends across sessions.

**Caption:**
> FR5 realised: the dashboard plots each `DrillSession`'s `SpeechAnalysis` over time so the user can see week-on-week improvement. This is the "progress tracker" differentiator from the feature matrix in Section 1.3.

## 4.7 Graceful degradation (NFR4)

**What to screenshot:** the dashboard showing the "full AI analysis unavailable — showing basic stats" banner, with `fillerCount` and `wpm` still populated.

**Caption:**
> Exception path 5e of UC3 — `AIAnalysisService` unreachable. `AnalysisController` falls back to computing `fillerCount` and `wpm` locally from the `TranscriptSegment`s so the user still gets meaningful feedback. This is the reliability NFR4 in action.

## 4.8 Teleprompter mode (FR6)

**What to screenshot:** `TeleprompterView` with a script scrolling at user-selected WPM.

**Caption:**
> Sprint 3 deliverable (FR6). Re-uses `SpeechRecognitionService` from the class diagram so pacing accuracy can be displayed without writing a second speech-recognition implementation.

---

## Notes on code quality

Alongside the screenshots, the following quality evidence is worth mentioning in the talk-track for this section:

- **MVC invariants enforced by static typing.** `TrainerView` has no import path to `DataRepository`; the only way data flows in is via the three Controller classes. This was a design goal that comes from the MVC architecture chosen in Section 3.1.
- **Separation of concerns tested.** `AnalysisController.analyse()` is unit-testable with a fake `AIAnalysisService` because the controller never imports the real service directly — it receives it as a constructor argument (basic dependency injection).
- **Graceful degradation tested.** The fallback branch in `AnalysisController` (UC3 step 5a/5e) is exercised by injecting a throwing fake `AIAnalysisService` into the test.
