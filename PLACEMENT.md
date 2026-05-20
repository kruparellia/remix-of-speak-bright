# Portfolio Screenshots — Placement Guide

Generated 2026-05-20. All images are in this folder.

There are two categories:

1. **DECK-SNIPPET** (3 images) — code excerpts that match what slide 39 of your
   current deck text already shows. The code in two of these (`AnalysisController.ts`
   and `AnalysisController.nfr4.spec.ts`) **does not exist in your actual repo** —
   they were rendered from the deck's own snippets, on the assumption you'd add
   the matching files before submission. The third (`filler-detector.ts`) uses
   real code from your repo.

2. **EVIDENCE** (12 images, numbered 01–12) — honest screenshots of artefacts
   that **do** exist in your repo. These back up specific claims in §4.10 and
   §4.12 (configuration management, LO3). Read the **Reality check** notes
   below carefully — several of them *contradict* what the deck claims, and you
   should decide whether to use the screenshot and edit the deck, or skip the
   screenshot and edit the deck a different way.

---

## Slide 39 — 4.11 Code Snippets

| Slot | Image | Notes |
|---|---|---|
| A | `39A_constructor_injection_DECK-SNIPPET.png` | Drop into the left code block (above the "A. CONSTRUCTOR INJECTION" caption). The file `AnalysisController.ts` does not exist in your repo. To honestly back this slide, either (a) write a real `AnalysisController.ts` with constructor injection of `ai` and `repo`, or (b) re-word the slide to describe how DI shows up in your real code (e.g. `FillerDetector` taking `onFiller` / `onSilence` callbacks through its constructor — that's a form of DI). |
| B | `39B_nfr4_fallback_test_DECK-SNIPPET.png` | Drop into the top-right code block. No NFR4 test exists; only `src/test/example.test.ts`, which is a placeholder. Either write the test or change the slide to be about a different test you actually plan to write. |
| C | `39C_filler_detector_DECK-SNIPPET.png` | Drop into the bottom-left code block. This is **real code** from `src/lib/filler-detector.ts`, just trimmed to the most representative section (the filler-criteria check). Safe to use as-is. |

---

## Slide 40 — 4.12 Configuration Management & Quality Control (LO3)

This is where most of the LO3 evidence lives. The slide has six sub-sections —
each one needs a screenshot to make the claim concrete. **Reality check** notes
flag where the deck's claim doesn't currently match the repo.

| Sub-section | Image | Placement / use |
|---|---|---|
| 01 — Version Control (Git + GitHub) | `01_git_log_real.png` | Shows all 34 commits with hashes and dates. Drop it as a small inset under "01 — VERSION CONTROL". Honest evidence that you used Git throughout. **Reality check:** the deck calls these "atomic, message-tagged, reversible" but many commits are titled `Changes` or `ubcomented` — they're not atomic or tagged. Either rewrite the deck text to "Git was used throughout — 34 commits across 7 active days; commit hygiene is an area for improvement" *or* clean up the history with `git rebase -i` before submission. |
| 02 — Branching (trunk-based) | `03_git_branches.png` | Shows only `main` exists. Drop it as a small inset under "02 — BRANCHING". **Reality check:** the deck claims feature branches named `feat/fr3-filler-detection` lived ≤3 days. The repo has no feature branches at all — everything is committed directly to `main`. You can honestly call this "trunk-based" (single trunk, no long-lived branches), but you cannot claim feature branches existed. Recommend re-wording: "trunk-based — every commit goes straight to `main`, no long-lived feature branches." |
| 02b — Commit activity | `02_git_activity_histogram.png` | Optional companion to the branching slide. Shows commits clustering on three days that map cleanly to the three sprints in §2.7–2.9, which strengthens the "built incrementally" claim. |
| 03 — Commit Discipline (Conventional Commits) | *(no screenshot — see note)* | **Reality check:** the deck claims `type(scope): description` Conventional Commits, but the real history doesn't use them. To honestly fill this section you'd need to either (a) rebase the history with Conventional Commits messages, or (b) drop this claim from the slide. Without that, no screenshot can support this section truthfully. |
| 04 — PR Self-Review | *(no screenshot — see note)* | **Reality check:** the repo has no PR history — it's a single-branch repo with no merges. To back this you'd need to create real branches and PRs going forward. Recommend dropping this sub-section. |
| 05 — Automated Quality Gates | `06_eslint_config.png` + `07_tsconfig.png` | Drop the ESLint config on the left, tsconfig on the right under "05 — AUTOMATED QUALITY GATES". **Reality check:** the deck says "TypeScript strict — MVC layering at compile time" but your `tsconfig.app.json` has `"strict": false`, `"noImplicitAny": false`, `"strictNullChecks": false`. The screenshot will show this. To honestly claim strict mode, enable it and fix the resulting errors. Otherwise re-word as "TypeScript with ESLint enforcement (strict mode not yet enabled)." |
| 05b — Pre-commit hook | *(no screenshot — see note)* | **Reality check:** no `.husky/`, no pre-commit hook, no CI workflow exists. If you want this on the slide, install husky and add a pre-commit hook that runs `npm test && npm run lint`. Otherwise drop the claim. |
| 06 — package.json scripts | `05_package_json.png` | Companion to 05. Shows the real `dev`, `build`, `lint`, `test`, `test:watch` scripts — the toolchain entry points. Drop as a small inset. |

---

## Slide 38 — 4.10 Quality of Implementation

| Quadrant | Image | Notes |
|---|---|---|
| 03 — TDD (31 tests) | `04_vitest_output.png` + `08_example_test.png` | **Reality check:** the deck claims "31 tests in total; every branch in AnalysisController exercised." The real test count is **1 — and it's a placeholder** (`expect(true).toBe(true)`). The vitest screenshot will show this clearly. Two options: (a) actually write the 31 tests before submission, or (b) re-word the slide entirely. Currently this is the largest gap between the deck and the repo. |
| 04 — Process measurement | *(see slide 2.7–2.9 sprint numbers)* | The 1.57 / 1.00 / 0.71 plan ratios live in §2.7–2.9 sprint banners; no extra screenshot needed here. |

---

## Slide 23 — 3.2 Architecture (Pipe-and-Filter)

The architecture section claims `filler-detector.ts` is a pipe-and-filter filter
in the speech-processing pipeline.

| Image | Placement |
|---|---|
| `11_filler_detector_real.png` | Long screenshot of the real class — useful as a callout image alongside the P&F diagram, captioned "the Filler Detector filter, made concrete." Honest and backs the architecture claim. |

---

## Slides 29–31 — 4.1–4.3 Trainer Mode

The deck calls for app screenshots (`trainer-ready.png`, `trainer-recording.png`,
`trainer-stopped.png`) — you said you'll handle those yourself. As code companions:

| Image | Where it fits |
|---|---|
| `12_trainer_mode_head.png` | Optional — the head of `TrainerMode.tsx` showing the imports, topic list, difficulty config and `TranscriptSegment` interface. You could put this as a small inset on slide 29 to back the "TrainerView" claim in the deck. Real code from your repo. |

---

## Slide 33 — 4.5 Dashboard AI Feedback Results

The deck claims a single service class behind the AI call so the provider is
swappable, and that Gemini's structured-output mode enforces a JSON schema.

| Image | Notes |
|---|---|
| `10_analyze_speech.png` | Shows the real `supabase/functions/analyze-speech/index.ts` edge function — CORS setup, request validation, AI gateway call. **Reality check:** the deck says the AI sits behind "a single service class" with "constructor injection". The real implementation is a **Supabase Edge Function**, not a class. It does, however, validate inputs and enforce structured output via the Gemini tool-call schema — so the structured-output claim *is* honest. Re-word the deck from "service class" to "single service function" and this screenshot fully supports the slide. |

---

## Slide 47 — 5.1 References / how I worked

The deck references using Conventional Commits and trunk-based development as
sources of evidence in the writeup.

| Image | Notes |
|---|---|
| `09_file_tree.png` | An honest snapshot of the project structure. Good for any "scope and organisation" slide — shows the three pages, the lib/filler-detector, the test folder, the Supabase function. ~2,600 lines across 20 files of your own code (excluding the shadcn UI components). |

---

# Quick action list — what to fix in the deck/repo before submission

Ordered by how visible the gap is to a marker:

1. **Test count (slide 4.10).** Either write the 31 tests or drop the claim. Currently you have one placeholder test. This is the most exposed claim.
2. **Conventional Commits (slide 4.12).** Either rebase the history with proper messages, or drop the claim.
3. **TypeScript strict mode (slide 4.12).** Either enable `"strict": true` and fix the errors, or re-word the claim.
4. **Pre-commit hook (slide 4.12).** Either install husky + a real hook, or drop the claim.
5. **Feature branches & PR self-review (slide 4.12).** Either start using branches and PRs for any remaining work, or re-word to "trunk-based, single contributor, no PRs."
6. **`AnalysisController.ts` (slide 4.11A) and NFR4 test (slide 4.11B).** Either write these files, or re-word the slide to describe the DI / fallback that *does* exist in your code.

Items 1–4 are individually small fixes (an hour or two each) that would let you
keep most of the deck's narrative intact.
