# 5. Reflection [5%]

This section is intentionally honest. Not everything went well, and the most useful thing I can do for myself in the next module is write down what actually happened rather than a tidied-up version.

## Why solo, and not in a team

The most important reflection point is that SpeakFlow was built as a solo project rather than as part of a team. That was a deliberate choice, not just a circumstance. Two reasons: first, the project idea is personal to me — I genuinely want a tool for practising everyday speaking, and I wasn't sure I could sell that vision convincingly enough to get teammates bought in for a whole rotation. Second, I wanted to force myself to handle every part of the stack — requirements, architecture, class modelling, UI, and the AI integration — because I know my weak spots are in design artefacts (diagrams, traceability) rather than in coding, and I couldn't hide from those by assigning them to a partner.

Retrospectively, this was a mixed decision. The upside is that I now understand the whole system and I wrote every line of code myself, which means the quality-of-implementation section is unambiguously mine. The downside is exactly the one my lecturer flagged in feedback: working alone made it easier to let inconsistencies slip between artefacts — the use case table said one thing, the class diagram said another, and there was no second pair of eyes catching it. In a team, someone building the sequence diagram from my use case table would have immediately pushed back that the class names didn't match. Going solo, I only caught it when the lecturer did. **If I did this again I would either pair-review my own artefacts by reading them back after a day's break, or build the "canonical model" document (like the one at the root of this portfolio) *first* — before any diagram — so every later artefact has a fixed vocabulary to pull from.**

## How I carried out the project

I worked in three sprints, loosely matching the three use cases:

- **Sprint 1** — UC1 + UC2 happy path. Get a prompt on screen, record audio, show the live transcript.
- **Sprint 2** — UC3. Hook up `AIAnalysisService`, persist `DrillSession`s, render the dashboard.
- **Sprint 3** — Teleprompter, account deletion, edge cases, and graceful degradation (NFR4).

The order was right, but my estimates were wrong. UC2's live transcript was harder than I expected because the browser Speech Recognition API emits partial results that needed de-duplication before I could produce clean `TranscriptSegment`s. I spent about 1.5× the planned time on Sprint 1 and had to squeeze Sprint 3.

## Lessons learned / what I would improve

1. **Build the vocabulary before the diagrams.** The single biggest fix in this rework was producing a canonical list of class and actor names *first* and then making every diagram draw from that list. In the original portfolio I drew each diagram semi-independently and the names drifted.
2. **Label every association on a class diagram, even if it seems obvious.** Lecturer feedback was explicit about this. A class diagram without association labels and multiplicities is not finished, even if the layout looks clean.
3. **Make success scenario steps and sequence diagram messages share numbering.** Having them match 1-to-1 makes the portfolio internally consistent in a way that's visible at a glance.
4. **Architecture diagrams should declare both the OO style and the data-flow style separately.** Trying to cram MVC and pipe-and-filter into one diagram is what made the earlier version feel confused. Two diagrams at two abstraction levels is clearer.
5. **Read my own work out loud.** Most of the "doesn't sound like you wrote it" feedback comes from prose that's been smoothed to death. A pass of reading it aloud and cutting anything I wouldn't actually say fixes that.

## Use of AI tools — identification, pros, cons

I used AI in two different ways on this project, and they deserve separate reflection.

**Gemini Flash as a runtime component of SpeakFlow.** This is `AIAnalysisService` in the class diagram — the AI is a product feature, not a development tool. It consumes the transcript and returns a `SpeechAnalysis`. *Pros:* high-quality natural-language feedback that a hand-written rules engine couldn't match, and easy to swap to a different model later because it lives behind a single service class. *Cons:* adds a network dependency, so I had to implement the graceful-degradation path (NFR4); responses are non-deterministic so they're hard to unit-test directly.

**Claude and ChatGPT as a development assistant.** I used these to brainstorm architecture choices, to draft some prose and tables, and at the end to restructure the portfolio after the feedback session. *Pros:* fast iteration on wording, good at spotting inconsistencies across long documents once you prompt for it, useful for generating first drafts of UML-style tables. *Cons:* and this is the big one — when I used AI to produce polished-looking text and diagrams early on *without running it through my own voice afterwards*, the output read as artificial and the lecturer caught it. The lesson here isn't "don't use AI"; the lesson is "AI output is a first draft, not a finished artefact". In this final version I wrote the canonical model myself and used AI to help tighten prose and catch inconsistencies, which is a healthier division of labour.

## Team formation experience

There wasn't one — I chose to work solo. The motivation was described above. What went well individually: ownership of the full stack, clear decision-making, nothing got stuck waiting on a teammate. What could be improved individually: I had no cross-check on my own artefacts, which directly caused the consistency problems the lecturer flagged. If I work solo again, I'll schedule a "pretend peer review" session halfway through — block out an hour, read all the artefacts cold, red-pen them — because having *no* reviewer is the biggest risk of solo work.

## References

1. *User-Centered Design in AI Speech Coaching Platforms* — discussion of how apps like Orai and Yoodli structure feedback cycles. Influenced the decision to show filler words highlighted in real time rather than only in a post-session report. **\[theaisurf.com\]**
2. *Speech-to-Text API patterns in the browser* — web developer documentation on the Web Speech API. Directly shaped `SpeechRecognitionService`'s interface (`start`, `stop`, `onTranscript` callback). **\[developer.mozilla.org / MDN Web Speech API\]**
3. Shaw, M. & Garlan, D. (1996). *Software Architecture: Perspectives on an Emerging Discipline.* The canonical text on the Pipe-and-Filter architectural style. Influenced how I framed the architecture choice in Section 3.1 and how I drew the runtime diagram.
4. *Gemini API documentation — structured outputs* — Google's docs on getting JSON-structured responses from Gemini Flash. Shaped the contract between `AIAnalysisService` and `AnalysisController` (so the returned `SpeechAnalysis` has the right shape every time). **\[ai.google.dev\]**
5. Comparative overviews of Poised, Yoodli and Orai — **\[declom.com\], \[talkpal.ai\]** — used for the feature matrix in Section 1.3.

> Replace the bracketed citations with the exact URLs you used when you submit. Keep the authors, titles, and the "how it influenced the project" sentences — those are what Section 5 is actually marked on.
