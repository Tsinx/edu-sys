# International mathematics: ranked textbook practice

Practice release `1.0.0` adds one shared ten-question set to each of the sixteen
lessons. It retains course `course-international-mathematics`, deck
`deck-international-mathematics-jacques-2026`, release
`release-international-mathematics-jacques-v2`, all 1,312 slide keys and reading
records. Practice is an activity beside the slides, so it adds no counted pages.

Each set contains three Foundation, three Core, three Application and one
optional Challenge question. All questions have four distinct choices and one
correct answer. There are no school-grade weights or student ability rankings.
Students receive all ten questions immediately and may complete different amounts.
Teaching schedules are now 45 minutes teaching, 25 minutes teaching and 20 minutes
practice: two minutes instructions, fourteen minutes individual work and four
minutes feedback. The second slide block retains its page range; the revised
handbook supplies the compressed teaching timings.

## Content and source boundary

The server-only bank is in `apps/platform-api/src/practice-content`. Each question
records the Jacques ninth-edition section, exercise/example/choice question,
subpart, printed page, PDF page and wording/option adaptations. Selected
mathematical data and task meaning are retained; repeated context, currency
notation, rounding and additional interpretation are identified. The supplied
PDF has a seventeen-page offset. Selected expressions were checked against
rendered source pages, including roots, fractions, limits and model parameters.
Original textbook pages are not included in the release.

Private records contain a worked solution, explanations for all four options and
an independent symbolic verification expression. `publicPack` is an explicit
whitelist parsed by the public contract. No private bank is imported by live web
components or the offline build. Practice graphs use SVG and formulas use KaTeX.

## Live workflow and authorization

- Course → Activities → **Ranked Practice** previews each set and downloads its
  worksheet. The teacher can request a private answer preview.
- The teacher classroom's **Ranked Practice** panel opens a shared set, summarizes
  completion and question results, closes responses and reveals explanations.
- Student classrooms display the entire frozen set. Choices autosave and can be
  revised while open. A local pending draft survives refresh and retries after
  reconnection. A closed run locks responses; reveal publishes feedback.
- **Answered n/10** measures completion. After reveal, correctness is reported
  against attempted questions. Unanswered questions remain **Not attempted**.

Contracts in `packages/contracts/src/ranked-practice.ts` have `schemaVersion: 1`;
packs and individual questions have content versions. An open run stores a full
immutable snapshot in the existing participation SQLite/WAL database. Editing
the bank affects future runs. One run can be open per classroom; request receipts
make duplicate opening idempotent. Answer revisions prevent stale overwrites.
Class end locks any open run without revealing it.

Authenticated endpoints:

| Method | Path relative to `/api` | Access |
| --- | --- | --- |
| GET | `courses/:courseId/practice-packs/:lesson` | Course access, public payload |
| GET | Same path plus `/teacher` | Course owner, private answers |
| POST | `class-sessions/:sessionId/practice/join` | Enrolled student; existing membership |
| GET | `class-sessions/:sessionId/practice` | Owner or joined student; latest run |
| POST | Same path plus `/runs` | Classroom/course owner; request UUID and lesson |
| GET | Same path plus `/runs/:runId` | Owner or joined student |
| PUT | Same path plus `/runs/:runId/questions/:questionId/answer` | Student's own answer |
| POST | Same path plus `/runs/:runId/action` | Owner; `close` or `reveal` |

Students cannot open/reveal sets, obtain the private pack, inspect another
student's responses or address a run in another classroom. Teacher summaries
remain teacher-only. Ending a classroom that has practice history also checks
its teacher owner. Existing identity, enrollment and classroom membership are
reused; no additional login or account system is introduced.

## Release and reproduction

Outputs are separate from the preserved v2 course archive:
`output/international-mathematics/practice-v1`.

- `documents`: sixteen five-page English worksheets, an eighty-page combined
  workbook, a 160-page teacher answer book and sixteen-page bilingual schedules.
- `offline`: public-only viewer, student PDFs, retained slides/films/images and
  bundled local Node runtime. Extract the ZIP and double-click `Start-Course.cmd`.
- `teacher-materials`: private editable packs, solutions and schedules. Keep this
  folder outside public server roots. It is excluded from the offline ZIP.
- `qa` and `SHA256SUMS.txt`: source index, browser/PDF/integrity checks and hashes.

Offline choices use local storage keyed by pack ID and version. They never submit
to a live classroom. The viewer can export a personal JSON receipt, but it does
not contain an answer key or calculate correctness. Reading restoration still
uses slide keys, with the existing v1 index migration for legacy records.

From the repository root:

```powershell
pnpm --filter @edu/platform-api exec tsx ../../scripts/ranked-practice-export.mts
node scripts/ranked-practice-documents.mjs
# Print the 18 generated private HTML documents with Chromium Page.printToPDF.
# The PDF QA assembles the nineteenth, combined workbook and adds bookmarks.
python -X utf8 scripts/ranked-practice-pdf-qa.py
python -X utf8 scripts/ranked-practice-math-check.py apps/platform-api/.runtime/ranked-practice/private-packs.json
pnpm --filter @edu/teacher-web exec vite build --config ../../scripts/ranked-practice-viewer/vite.config.mjs
node scripts/ranked-practice-package.mjs
python -X utf8 scripts/ranked-practice-release-verify.py
pnpm test
pnpm build
git diff --check
```

The document HTML and its print server are private scratch files, never student
assets. Generated student PDFs also live under the web app's public course assets
for authenticated course-interface downloads. The offline ZIP contains only the
public root; the teacher answer book is delivered separately.

## Acceptance evidence and limits

Independent recomputation covers all 160 keys and option equivalence. Content
checks cover counts, ranks, exact reference fields, KaTeX, English copy and public
serialization. API regressions cover frozen snapshots, duplicate opening, partial
completion, revision, persistence, isolation, owner checks, closure and reveal.
Browser checks cover all 160 questions at 1600, 820 and 390 pixels, teacher/student
delivery, save/revision/refresh, a blocked save followed by recovery, closure and
reveal. PDFs are reopened with count/bookmark/text-bound checks and rendered for
visual review. Offline checks block external networking, restore local choices,
exercise navigation and verify public files, ZIP CRC and every file hash.

Automated and local browser acceptance does not establish actual classroom
pacing, projection or teaching-trial acceptance. Existing film human-listening
limitations remain as recorded in v2. This release does not deploy to the campus
server.
