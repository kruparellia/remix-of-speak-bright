# 1. Project Ideation [20%]

## 1.1 Main Objective and Overview

SpeakFlow is a personal speaking coach built as a web app. The goal is to help people who struggle to get their words out cleanly — whether that's public speaking, job interviews, or just explaining something on the fly in a conversation. A lot of speech tools focus on polished presentations, but the gap I kept noticing is that nobody really practises *everyday* speaking. You can't easily rehearse a Zoom call or a shop interaction.

The app works like this: the user opens the Trainer page, gets a random prompt, and speaks about it for 30–60 seconds. While they're talking, the app listens in real time, transcribes what they say, and flags filler words like "um", "uh", and "like". When the drill ends, the transcript and stats get sent to an AI service that scores clarity, pacing, and topic relevance, and writes back short feedback. Every session is saved to a history page so the user can track improvement week to week.

I wanted to keep the scope tight enough to actually finish, so I built the system around three core use cases — generating a speaking prompt, recording a practice speech, and analysing the speaking style. Everything else (teleprompter mode, micro-lessons, streaks) is layered on top of those three.

## 1.2 Analysis of Similar Systems

### System Name: Orai

**1. General Overview and Highlights**
Orai is an AI-powered public speaking coach available on Android and iOS. It gives instant feedback on clarity, pacing, filler words, tone, and verbal confidence, and lets users practise speeches and track progress across structured lessons. It's probably the closest match to what I'm building, so it's the main benchmark.

**2. Major Features**
- AI Speech Analysis: evaluates clarity, pace, tone, filler words, and confidence
- Guided Practice Tools: Duolingo-style custom lessons, speech practice, and improvement tracking

**3. Operating Environment**
- Platform: Android, iOS (mobile only)
- Required HW: microphone, speaker
- Required SW: mobile OS audio processing + cloud AI engine

**4. Pros**
- Clear, actionable feedback with specific numbers (clarity %, filler counts)
- Daily lesson format is good for habit-building, similar to Duolingo

**5. Cons**
- UI is a bit childlike for a professional user
- Feedback can feel generic because lessons are pre-scripted
- No teleprompter mode — so users can't practise reading scripts
- Mobile-only; no web version

### System Name: Yoodli

**1. General Overview and Highlights**
Yoodli is a private real-time AI speech coach that runs in the browser or as a desktop app. It's aimed more at professional users — interview prep, pitch practice, presentations — than casual users. It analyses clarity, pacing, filler word usage, and delivery, and produces detailed post-session reports.

**2. Major Features**
- Real-Time Speech Coaching: live analysis of clarity, pacing, filler words, and structure
- Conversation Simulation: AI-powered mock interviews and presentation practice

**3. Operating Environment**
- Platform: Web, Windows, macOS
- Required HW: microphone, speaker
- Required SW: browser or desktop application, cloud AI processing

**4. Pros**
- Strong analytics with detailed breakdowns
- Gamifies the experience with exercises like "Spin a Yarn", "No Filler", "Storyteller"

**5. Cons**
- Corporate-focused — prices are aimed at enterprise users, not individuals
- Doesn't target everyday conversational speaking or cognitive fluency, only "performance" speaking

### System Name: Poised

**1. General Overview and Highlights**
Poised is an AI communication assistant that runs during live meetings (Zoom, Google Meet, Teams). Instead of being a practice tool, it listens while you work and gives insights on tone, confidence, filler words, pacing, clarity, and energy during real meetings. It then produces a post-meeting report.

**2. Major Features**
- Live Meeting Analysis: real-time tracking of tone, clarity, pacing, and energy
- Post-Meeting Reports: detailed summaries, strengths, weaknesses, and improvement suggestions

**3. Operating Environment**
- Platform: Windows, macOS
- Required HW: microphone, speaker
- Required SW: integrations with Zoom, Google Meet, Microsoft Teams

**4. Pros**
- Great for improving communication in real professional meetings
- Seamless integration with the conferencing platforms people already use
- Clean UI, real-time feedback

**5. Cons**
- Requires continuous video/mic access, which raises privacy concerns
- Advanced features are behind a paid tier
- Web/desktop only — no mobile
- Only works *during* meetings, not as a standalone practice tool

## 1.3 Feature Matrix

| Feature | Orai | Yoodli | Poised | **SpeakFlow (mine)** |
|---|:---:|:---:|:---:|:---:|
| Random topic speaking trainer | ✅ | ✅ | ✅ | ✅ |
| Teleprompter mode | ❌ | ❌ | ✅ | ✅ |
| Speaking style analyser | ✅ | ✅ | ✅ | ✅ |
| Guided lessons | ✅ | ✅ | ❌ | ✅ |
| Progress tracker | ✅ | ❌ | ❌ | ✅ |
| Filler word detection | ✅ | ✅ | ✅ | ✅ |
| Gamified | ✅ | ✅ | ❌ | ✅ |
| Forced-restart on fillers | ❌ | ❌ | ❌ | ✅ |
| Everyday conversational practice | ❌ | ❌ | ❌ | ✅ |
| Free to use | ❌ | Partial | ❌ | ✅ |

The last three rows are where SpeakFlow tries to actually be different. Every competitor lets you practise a *speech*; none of them force you to re-start when you over-use filler words, and none really target everyday conversation quality.
