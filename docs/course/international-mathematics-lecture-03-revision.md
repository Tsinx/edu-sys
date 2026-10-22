# Lecture 3 revision: completing the square and the quadratic formula

第三讲现在为100页核心内容、2页选学内容。课程、课件身份和全部旧页面标识保留，发布版本更新为v3。原40页因式分解补充讲仍位于第三讲之后。

## 教学重点

配方先从四格乘法解释两个交叉项，再解释“一次项系数的一半”和“平方”。先改写表达式，再解方程，分别说明补进又减回同一个数、等式两边同时加同一个数的原因。完整例题为 `x²+6x+5=0`，开平方后分两支求解，最后代回原式。

求根公式从同一平方模式引出。通用推导作为理解公式来源的支持材料，不要求基础薄弱学生当堂背写。重点检查标准形式、带符号的a/b/c、−b、判别式、±两支和完整分子除以2a。实数范围下分别说明两个不同根、一个重根和无实根。

第二学时先处理a不等于1，再处理教材非整数根例题和收入模型中的负号。近似值代回产生小残差，与精确根为零明确区分。

## 两学时参考安排

| 学时 | 时间 | 页码 | 重点与英文话术 |
|---|---|---|---|
| 1 | 0–12 min | 1–26 | 票价、收入、系数和因式分解回顾。 “Which coefficient belongs to the square term?” |
| 1 | 12–25 min | 27–34 | 平方展开、配方与完整数值例题。 “Why nine?” “The same addition on both sides.” |
| 1 | 25–31 min | 35–37 | 从平方到一般公式。 “The formula comes from the same square pattern.” |
| 1 | 31–41 min | 38–47 | 符号、判别式、±两支、分母与代回。 “Divide the whole numerator.” |
| 1 | 41–45 min | 48–50 | 重根、无实根、根数与根的正负。 “D counts distinct real roots.” |
| 2 | 0–4 min | 51–52 | 非首一二次式先提出系数。 “The outside factor multiplies the whole bracket.” |
| 2 | 4–9 min | 53–56 | 教材非整数根，保留根号到最后。 “Round the final roots.” |
| 2 | 9–15 min | 57–68 | 符号、对称、收入模型配方与外部负号。 “A real square is nonnegative.” |
| 2 | 15–22 min | 69–94 | 价格、收入、成本、利润和可行范围的应用回顾。 |
| 2 | 22–25 min | 95–100 | 错误诊断与出口检查。 |
| 2 | 25–27 min | 既有练习 | 说明同一套10题、独立作答、自选进度。 |
| 2 | 27–41 min | 既有练习 | 14分钟个人选择题练习。 |
| 2 | 41–45 min | 既有练习 | 4分钟反馈。未作答保留Not attempted。 |

101–102页为选学，不计入90分钟核心安排。表内时间是备课参考，需要真实课堂校准。

### 根据理解情况减速

第33页先让学生独立选择根；只有能解释两支及移项后再转一般公式。第41页检查−b，第50页检查判别式含义，第52页检查外部系数。答案继续由教师控制揭示。

若这些检查显示学生尚未理解，优先保留27–34、38–50和51–56页的讲解与独立练习，把后半段应用回顾延续到下一次课；不以翻完全部页面作为当堂完成标准。35–37页可以口头串联，课后再读。教师可先用第40页的平方根复习，再返回第33页。

## 教材与原创补充边界

- Jacques, *Mathematics for Economics and Business*, 9th edition, §1.1，印刷第16页／PDF第33页：括号乘法背景。
- §2.1，印刷第124–125页／PDF第141–142页，Example (a)：`2x²+9x+5=0`，保留原数值，分步计算两个近似根。
- §2.1，印刷第125页／PDF第142页，Example (b)：`x²−4x+4=0`，说明重根。
- §2.1，印刷第125–126页／PDF第142–143页，Example (c)：`3x²−5x+6=0`，说明无实根。
- 数值配方例题、四格展开支持页和一般公式的中间推导为原创教学补充；学生页脚标为Supplement。

## 版本与导出

- 第三讲82→102页；主课1332页，含40页补充讲共1372页。
- 1352个v2旧页面标识全部保留；v1的416页映射继续有效。旧索引记录通过冻结的v2标识表迁移，优先使用记录中的slideKey。
- 第一学时1–50页；第二学时51–100页。第二学时内容讲解计时1500秒，另有1200秒练习。
- 新PDF、离线本讲查看器和验证记录在 `output/international-mathematics/lesson-03-revision/`。旧v2文件不覆盖。
- 构建：`node scripts/build-international-lesson03-revision.mjs`；核验：`python scripts/verify-international-lesson03.py`；接入下载：`pnpm --filter @edu/teacher-web exec tsx ../../scripts/publish-international-lesson03-pdfs.mts`。Python需PyMuPDF、Pillow和本地已有SymPy支持。

实际投影阅读与课堂学习效果需要教学试用；自动排版检查不能替代课堂反馈。
