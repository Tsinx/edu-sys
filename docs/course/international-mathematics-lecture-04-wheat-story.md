# Lecture 4: the king, the chessboard and the wheat

Lecture 4 page 2 (`im-l04-02-a`) now contains a 90-second animated story. Pages 3–9 develop the reward rule, compare adding one with doubling, count the multiplications, and distinguish one square from the running total. Existing slide keys, all 76 Lecture 4 pages, the course version and saved reading positions remain stable.

The story is labelled **Traditional legend**. It follows the reward narrative described by [Cambridge NRICH](https://nrich.maths.org/content/03/04/penta5/prob.html), using the wheat version of the [Wolfram MathWorld problem](https://mathworld.wolfram.com/WheatandChessboardProblem.html). Jacques §2.3–2.4 supplies the surrounding exponential and logarithmic mathematics; the legend is supplementary teaching material. No historical date, named king or contemporary grain-production estimate is asserted.

## Classroom use / 中文备课

First teaching hour, minutes 0–5: run the story after the existing opening film. Pause at **The first row** and **Half the board**. Ask, “Would you accept the promise?” and “Does halfway mean half the total?” Show **The bill** only after predictions. Continue through the existing pages on powers and growth factors.

第1学时前5分钟：保留原开场片，再进入故事。先播放一遍，再用章节按钮停在第8格、第32格和最终账单。让基础较弱的学生先报1、2、4、8，随后数箭头解释格号与翻倍次数相差一；较快学生比较第33格与前32格之和。不要把图示麦堆的高度解释成实际体积。

“One grain first. Twice as many next.”

“Are you counting one square, or the whole board?”

“The exponent counts doublings, not the printed square number.”

## Exact mathematics

- Square n: `G_n = 2^(n−1)`, for integer n from 1 through 64.
- Running total through n: `S_n = 2^n−1`.
- Square 64: **9,223,372,036,854,775,808** grains.
- Entire board: **18,446,744,073,709,551,615** grains.
- Square 33 alone exceeds the sum of squares 1–32 by one grain.

All counts use BigInt. The first five squares show literal grain symbols; later piles are explicitly symbolic. The timeline accelerates for storytelling and does not represent grain production in real time. The closing question asks whether finite real resources can support indefinite doubling.

## Playback and delivery

**Play story / Pause** is registered in the existing presentation toolbar. **Page tools** contains Replay, the time slider, previous/next square, a square selector and chapter jumps. Classroom playback uses the existing playing/positionMs/anchorMs/runId contract. Students following a teacher cannot operate the story; independent and offline readers can play locally. Fullscreen keeps the existing controller mounted. The animation has English on-screen narration; no new recorded voice track is claimed.

The shared React renderer also powers the offline viewer. Static/PDF rendering uses the fully populated board at 76 seconds, rather than an empty animation container. Existing v2 packages are not overwritten by this source change.

Automated and browser verification are recorded separately from actual projection and classroom pacing acceptance.
