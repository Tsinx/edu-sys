# Lecture 4–5 practice revision

Revision date: 2026-10-26. Course: `course-international-mathematics`.

## Teaching scope

Each lecture has ten English single-choice questions, four options per question,
one correct answer, and a 20-minute limit. The ranks remain 3 Foundation,
3 Core, 3 Application and 1 optional Challenge. Each set contains eight
textbook selections/adaptations and two explicitly labelled supplementary
questions. The seven companion workbook exercises per lecture now also use
four-choice questions, with six core items and one optional item.

- Lecture 4: powers, logarithms, compound growth, continuous target time and
  the first whole-period report meeting a target. The companion exercises
  connect the wheat story to the exponent `n − 1` for square `n`.
- Lecture 5: straight-line slopes, constant functions, function value versus
  tangent slope, average and instantaneous speed, nonzero difference quotients,
  and a chord of the square-root graph. The optional symmetric-interval question
  states the permitted interval and explains why its equality with the tangent
  rate is special to the quadratic example. Power-rule questions are deferred
  to Lecture 6.

Both schedules are 45 minutes teaching, 25 minutes teaching and 20 minutes
practice. Practice uses 2 minutes of instructions, 14 minutes of individual
work and 4 minutes of feedback. Existing slide identities and page counts are
preserved. The second teaching block now assigns 1,500 seconds to its slides,
leaving the final 1,200 seconds for practice.

## Textbook verification

Source: Ian Jacques, *Mathematics for Economics and Business*, ninth edition.
Printed pages 168, 183, 277 and 278 were rendered and visually checked against
the supplied PDF. PDF page numbers are printed page numbers plus 17.

| Lecture | Selected textbook tasks |
| --- | --- |
| 4 | §2.3 Exercise 2.3: 1(1)(a), (c), (f), 2(a); §2.4 Exercise 2.4: 2(a), 4(a), 6(b), 7 |
| 5 | §4.1 Exercise 4.1: 1(a), (b), (c), 3, selections/adaptations of 7; Exercise 4.1*: 3(a)(ii) |

The two supplementary questions in each set identify the related textbook
section as conceptual context; they are not presented as numbered textbook
exercises. The system and worksheets include redrawn graphs for the constant
function and quadratic vertex. The Chaoxing questions state the functions in
full and can be answered without an external figure. Platform mathematical
typography is adapted to plain text, with parentheses retained for powers,
fractions and square roots.

## System versions and records

The current Lecture 4 and 5 practice packs and their questions use version
`2.0.0`. Question IDs remain stable. Original `lesson-04.ts` and `lesson-05.ts`
private packs remain byte-identical; the revised packs are separate `-v2.ts`
modules. Existing classroom runs retain their frozen question snapshots and
responses. Opening a future run uses the revised pack.

The worksheet download links for these two lectures point to `practice-v2`.
Other lectures continue to use their existing releases. Teacher solutions and
portal-entry JSON remain outside public assets.

## Chaoxing delivery

Course ID `267794046`, class ID `156507404`, 国贸（全英文）2602班.
The initial inventory contained 26 activities and no Lecture 4 or 5 set.
Two new activities were saved, giving 28 activities. All original title/status
rows remain unchanged.

| Group | Activity | Activity ID | State |
| --- | --- | --- | --- |
| Lecture 4 Practice | Lecture 4: Growth, Powers & Logs (20 min) | 7000177007832 | Not started |
| Lecture 5 Practice | Lecture 5: Rates & Derivatives (20 min) | 7000177009487 | Not started |

Both saved activities were reopened and compared against the authoritative
portal entries: ten stems, forty options, ten keys and ten explanations each,
with zero mismatches after whitespace normalization. Each question is worth
10 points and is not required, allowing partial completion. Settings verified
after reopening: 20 minutes, modification permitted before closure,
automatic submission at the deadline, answers shown after ending, manual
ending disabled. Neither activity was started.

## Deliverables and verification

The four PDFs are in `output/international-mathematics/practice-v2/documents`:
two five-page student worksheets, a separate twenty-page teacher answer book,
and a two-page bilingual schedule. Only the student worksheets are copied to
the public course-assets directory. `scripts/revise-international-practice-45.py`
reproduces the PDFs and portal entries from the practice export.

Evidence is in
`output/chaoxing/lectures-04-05-revision-2026-10-26/`, including reopened
audits, final inventory, screenshots, PDF renders, checksums and test logs.

- Independent symbolic checks passed for all 160 main-course questions.
- Web content, student-copy and timer tests: 19 passed; API/context/snapshot
  and timer regressions: 23 passed.
- Course validation passed, including 1,051 mathematical expressions and all
  416 legacy page mappings.
- Workspace type checking, Vite production build and `git diff --check` passed.
- All twenty revised questions passed browser geometry, formula, image and
  unrevealed-answer checks at 1600, 820 and 390 pixels; teacher answer preview
  was opened and hidden successfully.
- All 32 PDF pages were reopened, rendered and checked for page-boundary
  overflow; representative final pages were visually inspected. Public
  worksheet hashes match the delivered originals.

This revision updates local system content and saved Chaoxing activities.
It does not deploy the teaching application or replace the existing v1 ZIP,
combined workbook or full-course slide PDFs. Live student-device deadline
behavior and actual classroom pacing have not been trialled in these two
unstarted activities; automated timer/snapshot/privacy regressions passed.
