# Lecture 3 supplement: Factoring Quadratics

This English foundation supplement follows Lecture 3 and precedes Lecture 4 in the teaching system. It adds 40 slides, eight developed examples and 24 ranked single-choice questions. It adds support time outside the original 16 lectures / 32 teaching hours.

## Teaching sequence

| Time | Slides | Focus |
| --- | --- | --- |
| 0–9 min | 1–9 | Distribution, multiplication grid, Example 1, the sum/product rule and signs |
| 9–16 min | 10–16 | Systematic factor-pair search, Examples 2–3, checking the middle coefficient |
| 16–23 min | 17–23 | Examples 4–5, opposite signs, comparison and misconception checks |
| 23–29 min | 24–29 | Examples 6–8, repeated factors, missing terms and the root zero |
| 29–36 min | 30–36 | Expressions and equations, zero products, roots, substitution and the graph |
| 36–40 min | 37–40 | Limits of integer factoring, checking routine, exit questions and practice ranks |

Pause at each choice question before using the existing **Reveal reasoning** action in Page tools. All worked-example solution steps are public teaching material. The separate practice bank keeps its answer key and distractor explanations on the API server until the teacher reveals results.

## Eight worked examples

| Example | Expression | Factorisation | Slides |
| --- | --- | --- | --- |
| 1 | x²+5x+6 | (x+2)(x+3) | 3–7 |
| 2 | x²+7x+12 | (x+3)(x+4) | 10–12 |
| 3 | x²−5x+6 | (x−2)(x−3) | 13–15 |
| 4 | x²+x−6 | (x+3)(x−2) | 17–18 |
| 5 | x²−x−6 | (x+2)(x−3) | 20–21 |
| 6 | x²+6x+9 | (x+3)² | 24–25 |
| 7 | x²−9 | (x−3)(x+3) | 26–27 |
| 8 | x²+5x | x(x+5) | 28–29 |

Jacques, *Mathematics for Economics and Business*, 9th edition, §2.1, printed pp.127–128 / PDF pp.144–145 supplies the textbook explanation of factoring and zero products. The eight examples and 24 questions are original supplementary teaching material. They are explicitly labelled as extensions, without invented textbook exercise numbers.

## Practice

- Q1–8: Foundation (8 questions).
- Q9–16: Core (8 questions).
- Q17–22: Application (6 questions).
- Q23–24: optional Challenge (2 questions).

Every question has four distinct choices and exactly one correct answer. The two Challenge questions remain within monic single-variable quadratics. A failed search for integer factors does not prove that real roots do not exist.

In the course directory, use **Lecture 3 supplement → Ranked Practice** to preview the bank. In a classroom, open the existing Ranked Practice panel and select **Lecture 3 supplement**, set a time for the whole set, then open it. All 24 questions become available together. Students can revise and resubmit until the deadline. Saved responses finalize automatically. Completion uses a denominator of 24; correctness uses attempted questions after reveal. Practice remains formative.

## Registration and compatibility

- Course and deck identities and the v2 version ID remain unchanged.
- Storage slot 17 appends indices 1313–1352. The original 1,312 indices and slide keys stay unchanged.
- Ordered lesson summaries and `getInternationalMathematicsAdjacentIndex` place the slot after Lecture 3 in directory, reader, classroom and PDF navigation.
- The visible label is **Lecture 3 supplement**, rather than a seventeenth scheduled lecture.
- Course totals are 1,352 slides: 1,320 core/support pages and 32 optional pages. The main timetable remains 32 teaching hours.
- The existing v1/v2 deliverable archives remain unchanged. Supplement outputs use their own directory.

System preview: `/preview/course-international-mathematics?lesson=17`.

Practice preview: `/courses/course-international-mathematics/activities?view=practice&lesson=17`.

Public offline viewer: `/course-assets/international-mathematics/factorisation/index.html`. It contains 40 public slides, the public 24-question pack and local choice storage. It does not contain answer keys, contact an API or submit offline choices to a live classroom.

## Build and checks

1. Run `node scripts/build-factorisation-supplement.mjs` to build the public viewer, worksheets and private teacher answer book, audit all 40 pages and 24 questions at 1600px/820px/390px, and reopen/verify the PDFs. The first operation uses the PDF skill's artifact marker.
2. Private feedback and intermediate files stay under `.runtime/factorisation-build` and `output/international-mathematics/factorisation-supplement`. Only student files are copied to public assets and the student ZIP.
3. Run the independent symbolic checker with the 24-question private pack. Its isolated SymPy installation is under `.runtime/factorisation-python`; it is not a runtime application dependency.
4. Run the focused frontend and API supplement/content/context/navigation/practice suites, workspace typecheck, the frontend production build and `git diff --check`.
5. Run `tsx scripts/publish-factorisation-pdfs.mts` after the frontend build to publish the 17 chapter PDFs, combined student PDF and chapter ZIP. Reuse requires exact equality of the original core definitions and artwork. Source PDF hashes are recorded. This operation leaves the original v2 package untouched.

PDFs include section bookmarks. The combined course PDF places the 40 new pages between the original Lecture 3 and Lecture 4 and retains lesson/hour bookmarks. Receipt files and hashes are in the supplement output's `qa` directory.

Automated checks do not establish actual classroom pacing or projector acceptance. These require a teaching trial.
