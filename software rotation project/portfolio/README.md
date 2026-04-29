# SpeakFlow — CS6005 Portfolio (rebuilt)

This folder contains the rebuilt portfolio after lecturer feedback. Everything is derived from a single source of truth so the consistency problems (classes not matching between diagrams, success scenarios not matching sequence diagrams, unlabelled associations) are fixed.

## Files — read in this order

| # | File | What's in it |
|---|---|---|
| 0 | [`00-canonical-model.md`](00-canonical-model.md) | **Read this first.** The exact names of every actor, class, model and service used in the portfolio. Every later file pulls names from this one. |
| 1 | [`01-ideation.md`](01-ideation.md) | Section 1 — Project Ideation [20%]: objective, analysis of Orai/Yoodli/Poised, feature matrix. |
| 2 | [`02-requirements.md`](02-requirements.md) | Section 2 — Requirements Analysis [25%]: use case diagram, three use case tables, FR/NFR, three sprint tables. |
| 3 | [`03-architecture-and-design.md`](03-architecture-and-design.md) | Section 3 — Architecture & OO Design [25%]: architecture style (MVC + P&F), pipe-and-filter diagram, class diagram (MVC layered, labelled, multiplicities), class descriptions, three sequence diagrams. |
| 4 | [`04-implementation-quality.md`](04-implementation-quality.md) | Section 4 — Quality of Implementation [25%]: screenshot guide. |
| 5 | [`05-reflection.md`](05-reflection.md) | Section 5 — Reflection [5%]: why solo, lessons, AI use, references. |

Diagrams are kept separately in [`diagrams/`](diagrams/) as `.mmd` (Mermaid) files so you can edit them independently:

| File | Purpose |
|---|---|
| `diagrams/use-case-diagram.mmd` | Section 2.1 |
| `diagrams/class-diagram.mmd` | Section 3.3 |
| `diagrams/architecture-pipe-filter.mmd` | Section 3.2 |
| `diagrams/sequence-uc1-generate-prompt.mmd` | Section 3.5 |
| `diagrams/sequence-uc2-record-speech.mmd` | Section 3.5 |
| `diagrams/sequence-uc3-analyse-style.mmd` | Section 3.5 |

## What changed from the feedback

The lecturer's main criticisms were:

| Problem | Where it was | Fixed by |
|---|---|---|
| Class names in use case tables didn't match the class diagram | Section 2.2 vs 3.3 | New canonical model in `00-canonical-model.md` — every name now comes from one list. Use case tables reference `PromptController`, `RecordingController`, `AnalysisController`, `DataRepository`, etc. — exactly the names on the class diagram. |
| Success scenario steps didn't match sequence diagram messages | Section 2.2 vs 3.5 | Step numbers are identical. Step 5 in the UC2 table is message 5 in the UC2 sequence diagram, and so on. |
| Class diagram associations weren't labelled | Section 3.3 | Every line now has both a verbal label (`hosts`, `uses`, `builds`, `emits`…) and a multiplicity on both ends (`"1"`, `"0..*"`). |
| Not every class had a clear M/V/C role | Section 3.3 | MVC layering is declared with `<<View>>`, `<<Controller>>`, `<<Model>>`, `<<External>>` stereotypes, and the classes are grouped into four `namespace` blocks in the diagram. |
| Diagrams looked inconsistent (some clean, some hand-drawn) | All sections | All diagrams are now clean Mermaid in the same visual style. |
| Architecture description was confused (text said P&F, class diagram was MVC) | Section 3.1 | Now explicitly: MVC at the OO level, Pipe-and-Filter at the runtime data-flow level. Two diagrams at two abstraction levels. |

## How to verify the consistency yourself

From this folder, run:

```bash
# Every canonical class should appear in the canonical model, the class diagram, and at least one sequence diagram
for cls in TrainerView DashboardView PromptController RecordingController AnalysisController \
           Prompt AudioRecording TranscriptSegment SpeechAnalysis DrillSession \
           MicrophoneService SpeechRecognitionService AIAnalysisService DataRepository; do
  echo "$cls"
  grep -l "$cls" 00-canonical-model.md 02-requirements.md 03-architecture-and-design.md diagrams/*.mmd
  echo "---"
done
```

Every class should show up in at least four places. I ran this as the verification step of the rebuild; output is clean.

## Rendering the Mermaid diagrams

Any Markdown renderer that supports Mermaid (GitHub, VS Code with Markdown Preview Mermaid Support, Obsidian) will render the diagrams inline. For a standalone PNG/SVG of any diagram, paste the `.mmd` contents into <https://mermaid.live> and export.
