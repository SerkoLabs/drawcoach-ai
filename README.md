# DrawCoach AI

## One-line promise
DrawCoach AI teaches drawing through personalized lesson paths and checkpoint-by-checkpoint visual feedback, so learners always know what to practice and what to fix next.

## Problem
Most drawing apps either provide passive lessons or generic inspiration. Learners can watch content but still do not know whether their own composition, perspective, values, color, proportions or technique are improving. The missing loop is timely, specific feedback on the learner's actual work.

## Primary user
Beginner and intermediate learners aged 13+ who want structured practice and actionable feedback, especially users trying to improve in a specific category such as landscape or portrait drawing.

For the MVP, age is collected as an age band rather than date of birth. Users under 13 are outside the supported MVP audience.

## Product concept
The app builds a learning path from the learner's age band, experience level, goal, preferred medium and drawing category. Each lesson is divided into checkpoints. At each checkpoint the learner photographs or uploads the current artwork, receives concise AI feedback, makes a correction and submits again. The app records progress and uses recurring weaknesses to choose the next practice focus.

## Core loop
1. Choose goal, level, category and medium.
2. Start the next lesson and complete the current checkpoint.
3. Photograph or upload the work.
4. Receive structured feedback: strength, highest-priority issue, why it matters, concrete correction and a micro-exercise when useful.
5. Correct and resubmit until the checkpoint is complete.
6. Finish the lesson, update the skill profile and continue to the next recommended lesson.

## MVP
- Mobile app for iOS and Android.
- Onboarding with age band, experience level, goal, category, medium and weekly practice preference.
- Initial learning paths for:
  - Landscape — pencil.
  - Landscape — watercolor.
  - Portrait — pencil.
  - Portrait — watercolor.
- Lesson/course structure with numbered lessons, objectives, instructions, checkpoints and assignments.
- Artwork capture or library upload at lesson checkpoints.
- AI visual critique using a category-, medium- and checkpoint-specific rubric.
- Feedback format with one strength, one priority issue, explanation, concrete next action and optional micro-exercise.
- Resubmission and comparison of initial vs corrected checkpoint images.
- Lesson completion and simple skill progress across composition, perspective/proportion, value/light, color and medium control where applicable.
- Personalized next-focus recommendation based on recent feedback history.
- Private learner account and private artwork history.
- Account deletion and deletion of uploaded artwork.

## Explicitly not in MVP
- Public social feed, likes, comments or follower graph.
- Marketplace, instructor marketplace or live human critique.
- Real-time video analysis while the user draws.
- AR overlays or automatic drawing correction on the canvas.
- Open-ended support for every art category and medium.
- Certificates, competitions or public rankings.
- Subscription/paywall activation before the learning loop is validated.
- Users under 13.

## Differentiation
- Feedback-first rather than content-first.
- Critique happens at meaningful intermediate checkpoints, not only after a finished artwork.
- The next assignment is influenced by demonstrated weaknesses rather than a fixed course sequence alone.
- Feedback is constrained to an explicit rubric and a small number of actionable corrections instead of generic praise or long free-form critique.

## Primary success metric
Percentage of activated learners who complete at least one full feedback loop: submit checkpoint → receive feedback → resubmit a correction → complete the lesson.

## Secondary metrics
- Onboarding-to-first-submission conversion.
- Median time from first submission to corrected resubmission.
- Lesson 1 to Lesson 2 continuation rate.
- 7-day returning learner rate.
- Percentage of feedback sessions rated useful.
- Reduction in repeated rubric weaknesses across consecutive lessons.

## Known constraints
- Visual feedback is probabilistic and must be framed as coaching, not objective artistic truth.
- The AI provider key must never be shipped in the mobile client.
- Artwork images are private user content and require explicit storage/access controls.
- The MVP should minimize personal data and collect age band rather than exact birth date.
- Version-sensitive framework, API and store decisions must be verified against current official documentation before implementation or release.

## Key assumptions and risks
- AI image understanding is accurate enough to identify high-level composition, proportion, value and color issues when prompts are constrained by lesson context.
- Learners will tolerate photographing work at several checkpoints if feedback is fast and specific.
- Poorly calibrated feedback can reduce trust; the system therefore prioritizes one correction at a time and records confidence/limitations where appropriate.
- Uploaded artwork may contain faces or other personal content; privacy, deletion and provider data-handling behavior require explicit design.
- Supporting minors aged 13–17 increases privacy and product-policy sensitivity; no social or public sharing is included in MVP.

## Current status
Planning. Product concept approved from the initial idea; lifecycle artifacts and implementation foundation are being created according to the repository playbook.
