/* Forty individually authored public pages. Private delivery notes live in docs/course. */
(function (root, factory) { const api = factory(); if (typeof module !== 'undefined') module.exports = api; else root.EconomicPrelude = api; })(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const version = 'economic-mathematics-prelude-v1';
  const units = [
    { n: 1, title: '引入与函数模型', hours: 4, lessons: '01—02', question: '怎样描述数量关系？' },
    { n: 2, title: '极限与连续', hours: 8, lessons: '03—06', question: '不断靠近，会走向哪里？' },
    { n: 3, title: '导数与微分', hours: 10, lessons: '07—11', question: '此刻变化有多快？' },
    { n: 4, title: '边际与弹性', hours: 10, lessons: '12—16', question: '再改变一点，值得吗？' },
    { n: 5, title: '不定积分', hours: 8, lessons: '17—20', question: '能从变化找回原函数吗？' },
    { n: 6, title: '定积分与累计', hours: 10, lessons: '21—25', question: '一段时间，总共多少？' },
    { n: 7, title: '多元函数微分', hours: 8, lessons: '26—29', question: '多个因素怎样共同作用？' },
    { n: 8, title: '约束与决策', hours: 6, lessons: '30—32', question: '资源有限，如何分配？' }
  ];
  const pages = [
    { id: 'film', layout: 'film', section: '序章', title: '经济数学', subtitle: '从一个点，进入一个变化的世界。', source: '原创几何动画与电子配乐' },
    { id: 'welcome', layout: 'hero', section: '课程地图', title: '看见变化，\n做出选择。', subtitle: '经济数学 · 2026', visual: 'orbit', lines: ['一个价格，一次点击，一份有限的预算。', '把直觉变成可以检查的判断。'] },
    { id: 'four-shapes', layout: 'four', section: '课程地图', title: '刚才的形状，也是问题的形状。', items: [['点', '一个人的选择'], ['曲线', '变化的方向'], ['面积', '累计的结果'], ['曲面', '多个因素的作用']], source: '几何隐喻' },
    { id: 'receipt', layout: 'ledger', section: '课程地图', title: '一家店，两周收入。', subtitle: '哪一周卖得更好？先说清“好”指什么。', columns: ['周次', '单价', '销量', '收入'], rows: [['第一周', '20 元/杯', '500 杯', '10,000 元'], ['第二周', '18 元/杯', '550 杯', '9,900 元']], reveals: ['销量增加了，收入却减少了。', '收入 = 单价 × 销量；利润还需要成本。'], source: '教学情境' },
    { id: 'scope', layout: 'numbers', section: '课程地图', title: '这门课的坐标', items: [['64', '学时'], ['32', '讲'], ['8', '单元'], ['4', '学分']], lines: ['市场营销专业 · 大一年级 · 第一学期', '中文授课，课堂教学；课外资源用于复习。'], source: '2026版课程教学大纲' },
    { id: 'map', layout: 'map', section: '课程地图', title: '八个单元，一条问题链。', subtitle: '描述关系 → 研究变化 → 计算累计 → 做出决策' },
    { id: 'unit-1', layout: 'unit', section: '课程地图', unit: 1, title: '给现实中的量一个名字。', subtitle: '价格改变时，销量怎样回应？', lines: ['分清自变量、因变量和单位。', '在数据、图形与公式之间转换。'], visual: 'function', source: '单元一 · 函数与营销定量模型' },
    { id: 'unit-2', layout: 'unit', section: '课程地图', unit: 2, title: '越来越近，\n不等于已经到达。', subtitle: '“趋近”能支持怎样的判断？', lines: ['观察函数在某点附近的行为。', '区分函数值、极限与连续。'], visual: 'limit', source: '单元二 · 极限与连续' },
    { id: 'unit-3', layout: 'unit', section: '课程地图', unit: 3, title: '把镜头推近。', subtitle: '平均变化，怎样走向瞬时变化？', lines: ['从割线走向切线。', '用导数和微分描述局部变化。'], visual: 'derivative', source: '单元三 · 导数与微分' },
    { id: 'unit-4', layout: 'unit', section: '课程地图', unit: 4, title: '再多一点，\n带来什么？', subtitle: '多生产一件、多花一元、降价百分之一。', lines: ['边际量关注增加一单位的影响。', '弹性比较相对变化的敏感程度。'], visual: 'marginal', source: '单元四 · 导数应用、边际与弹性分析' },
    { id: 'unit-5', layout: 'unit', section: '课程地图', unit: 5, title: '沿着变化，\n找回原来的函数。', subtitle: '知道变化率，能否恢复总量？', lines: ['求一个函数的原函数。', '用初始条件确定积分常数。'], visual: 'family', source: '单元五 · 不定积分' },
    { id: 'unit-6', layout: 'unit', section: '课程地图', unit: 6, title: '把每一小段，加起来。', subtitle: '销量速率不断变化，总销量是多少？', lines: ['用小块近似，再研究极限。', '从速率得到累计量，核对单位。'], visual: 'area', source: '单元六 · 定积分及累计量应用' },
    { id: 'unit-7', layout: 'unit', section: '课程地图', unit: 7, title: '世界不只有一个旋钮。', subtitle: '价格与广告投入同时改变。', lines: ['用曲面与等高线表示双输入关系。', '区分偏导数、全微分及条件变化。'], visual: 'contour', source: '单元七 · 多元函数微分' },
    { id: 'unit-8', layout: 'unit', section: '课程地图', unit: 8, title: '有限的预算，\n更好的分配。', subtitle: '在可行的方案中寻找最优。', lines: ['明确目标、约束与可行集。', '比较内部候选点与边界情况。'], visual: 'allocation', source: '单元八 · 无约束、约束优化与营销决策' },
    { id: 'evidence-chain', layout: 'sequence', section: '课程地图', title: '一个结论，需要一条证据链。', items: [['现实问题', '你要决定什么？'], ['数学模型', '变量、关系、假设是什么？'], ['计算与检验', '方法、单位、边界对吗？'], ['经济解释', '结果支持什么行动？']], reveals: ['公式帮助我们判断；假设决定判断能走多远。'] },
    { id: 'teacher', layout: 'teacher', section: '认识老师', title: '李行之', subtitle: '重庆交通大学 · 经济与管理学院 · 讲师', lines: ['研究问题，', '也亲手做工具。'], visual: 'orbit', source: '教师资料 · 2026年9月核对' },
    { id: 'research', layout: 'split', section: '认识老师', title: '当 AI 加入协作，\n决策会怎样改变？', subtitle: '我正在研究的问题', lines: ['信息怎样影响行动？', '不同参与者如何协调？', '工具提高效率，也改变了什么？'], visual: 'network', source: '在研方向 · 生成式AI、组织协作与决策' },
    { id: 'tools', layout: 'sequence', section: '认识老师', title: '把想法做成可以使用的工具。', items: [['课程', '把知识变成可操作的问题'], ['平台', '课件、课堂活动与数学实验'], ['反馈', '从真实使用中继续改进']], subtitle: '这套课程平台，也是持续开发和检验的教学工具。', source: '教学平台开发实践' },
    { id: 'practice', layout: 'split', section: '认识老师', title: '从教学现场，\n检验技术的价值。', subtitle: 'AIGC 赋能《统计学B》课程教育教学应用案例', lines: ['2025年重庆交通大学', 'AIGC教师教学应用大赛 · 特等奖', '把技术用在理解、练习与反馈上。'], visual: 'rays', source: '获奖证明 · 2025年12月' },
    { id: 'conversation', layout: 'question', section: '认识老师', title: '你可以带着\n“不确定”来上课。', subtitle: '一种有用的提问方式', lines: ['“我能做到这一步。”', '“这里用了什么条件？”', '“换一个例子，结论还成立吗？”'], reveals: ['写下卡住的位置，比只说“我不会”更容易得到帮助。'] },
    { id: 'textbook', layout: 'book', section: '学习须知', title: '一本主教材，一套练习工具。', items: [['主教材', '吴传生 主编\n《经济数学——微积分》第5版\n高等教育出版社 · 2026'], ['配套学习', '《经济数学——微积分（第4版）\n学习辅导与习题选解》\n高等教育出版社 · 2022']], source: 'ISBN 9787040661514 / 9787040577044 · 教学大纲指定' },
    { id: 'resources', layout: 'split', section: '学习须知', title: '课堂之外，\n把问题再走一遍。', lines: ['教材：回到定义与完整例题。', '课程平台：回看课件与数学实验。', '武汉理工大学慕课：补充回顾与练习。'], visual: 'loop', reveals: ['课外资源用于复习；本课程64学时均为线下理论教学。'], source: '2026版课程教学大纲' },
    { id: 'assessment', layout: 'assessment', section: '学习须知', title: '成绩来自四个部分。', items: [['15%', '作业'], ['15%', '阶段考核'], ['20%', '个人应用任务'], ['50%', '期末考试']], source: '2026版课程教学大纲' },
    { id: 'homework', layout: 'sequence', section: '学习须知', title: '作业留下你的思考过程。', subtitle: '作业占总评15%', items: [['列条件', '变量、范围、单位'], ['写依据', '为什么可以用这个方法'], ['查结果', '代回、估算或换一种表示']], reveals: ['做错后的订正，请说明错误发生在哪一步。'], source: '考核比例据教学大纲；过程记录为学习建议' },
    { id: 'stage-test', layout: 'split', section: '学习须知', title: '阶段考核：\n独立完成一次检查。', subtitle: '占总评15% · 限时闭卷', lines: ['会识别题目给出的条件。', '能选择并执行适当的方法。', '能用自己的话解释结果。'], visual: 'steps', source: '2026版课程教学大纲' },
    { id: 'application', layout: 'brief', section: '学习须知', title: '个人应用任务：\n把预算分配说清楚。', subtitle: '占总评20% · 固定营销预算 · 多渠道配置', items: [['建模', '定义投入、目标与约束'], ['比较', '至少两个客群或情境'], ['交付', '独立推导、核验结果、提出建议']], reveals: ['建议面向管理者；同时写明假设、适用范围及工具使用情况。'], source: '2026版课程教学大纲' },
    { id: 'final', layout: 'assessment', section: '学习须知', title: '期末：从计算走向解释。', subtitle: '占总评50% · 闭卷笔试', items: [['12', '常识选择'], ['18', '计算选择'], ['40', '计算题'], ['30', '案例题']], lines: ['图中数值为卷面分值，总计100分。'], source: '2026版课程教学大纲' },
    { id: 'ai', layout: 'split', section: '学习须知', title: '让 AI 帮忙，\n也让结论经得起检查。', lines: ['电子表格、绘图工具与AI可辅助学习。', '保留独立推导，核验计算与条件。', '在应用任务中说明工具与提示词。'], visual: 'network', reveals: ['不能把工具输出直接当成自己的推导和证据。'], source: '2026版课程教学大纲' },
    { id: 'verification', layout: 'question', special: true, section: '学习须知', title: '算出来了，\n就一定对吗？', subtitle: '某工具输出：“销量 = −20 件”。', lines: ['先查定义域。', '再查单位与量纲。', '最后回到情境解释。'], reveals: ['负数可能是模型超出适用范围的信号；不能直接当作可销售数量。'], source: '教学情境' },
    { id: 'independent', layout: 'split', section: '学习须知', title: '能复现，\n才算真正掌握。', lines: ['合上答案，重新完成关键步骤。', '说出公式成立所需的条件。', '换一组数据，再检查一次。'], visual: 'loop', reveals: ['交流可以帮助理解；提交的个人任务应体现自己的推导与判断。'], source: '独立学习与学术诚信要求' },
    { id: 'routine', layout: 'sequence', section: '学习须知', title: '把复习变成一个小循环。', items: [['课前', '看标题，记一个问题'], ['课中', '动笔判断，记录分歧'], ['课后', '独立复做，解释订正']], subtitle: '先把一个问题做完整，再增加题量。', source: '学习建议' },
    { id: 'start-line', layout: 'question', section: '学习须知', title: '起点可以不同。\n问题可以一起研究。', lines: ['读懂题目中的量。', '画图、列表、列式，选择一个入口。', '遇到困难，保留尝试，再提出问题。'], reveals: ['今天的第一次判断，只需要乘法与比例。'] },
    { id: 'challenge', layout: 'question', special: true, section: '第一次判断', title: '降价10%，\n销量至少增加多少，\n收入才不下降？', subtitle: '先独立估计，再写一个理由。', options: ['10%', '约11.1%', '20%', '还不能判断'], source: '教学情境 · 只比较销售收入' },
    { id: 'choose-base', layout: 'ledger', section: '第一次判断', title: '先选一组容易检查的数据。', columns: ['状态', '单价', '销量', '收入'], rows: [['原来', '10 元/件', '100 件', '1,000 元'], ['降价后', '9 元/件', '待求', '至少1,000 元']], subtitle: '把未知销量记为 q，单位：件。', reveals: ['收入条件：9q ≥ 1,000。'], source: '教学情境 · 同一商品' },
    { id: 'wrong-ten', layout: 'split', special: true, section: '第一次判断', title: '“少10%，多10%”\n能互相抵消吗？', subtitle: '先检查，不急着接受。', lines: ['新单价：9 元/件', '新销量：110 件'], visual: 'ninety-nine', reveals: ['新收入：9 × 110 = 990 元。', '比原来少10元；两个百分比的基数不同。'], source: '教学情境' },
    { id: 'derive', layout: 'derivation', section: '第一次判断', title: '保住收入，需要跨过这条线。', subtitle: '原收入：1,000元；新单价：9元/件。', reveals: ['9q ≥ 1,000  ⇒  q ≥ 111.111…', '销量增幅 ≥ (111.111… − 100) ÷ 100 = 11.111…%', '如果销量只能取整数件，本例至少卖112件，增幅为12%。'], conclusion: '约11.1%是连续量下的门槛；整数销售量需要向上取整。', source: '收入模型 · 价格与数量均为正' },
    { id: 'generalize', layout: 'derivation', section: '第一次判断', title: '从一组数，走向一般关系。', subtitle: '原单价 p > 0，原销量 q > 0，销量增幅为 g。', reveals: ['新收入 = 0.9p × (1 + g)q', '0.9p(1 + g)q ≥ pq  ⇒  0.9(1 + g) ≥ 1', 'g ≥ 1 ÷ 0.9 − 1 = 1/9 ≈ 11.111%'], conclusion: '销量增长10%时：0.9 × 1.1 = 0.99，收入减少1%。', source: '教学推导 · 暂不考虑销量整数性' },
    { id: 'transfer', layout: 'question', section: '第一次判断', title: '收入不下降，\n利润也不下降吗？', subtitle: '单价仍从10元降到9元；单位成本6元，固定成本不变。', lines: ['原销量100件；请先比较每件商品贡献的金额。'], reveals: ['原贡献： (10 − 6) × 100 = 400 元。', '新贡献： (9 − 6)q = 3q；保住利润需要 q ≥ 133.333…件。', '整数销量至少134件。保住收入，不等于保住利润。'], source: '教学情境 · 单位成本与固定成本不变' },
    { id: 'exit', layout: 'question', section: '带着问题出发', title: '把今天的判断，\n写成三句话。', lines: ['我比较的量是什么？', '我的结论依赖什么条件？', '我怎样检查这个结论？'], subtitle: '可以用刚才的降价问题，也可以换一个生活中的例子。' },
    { id: 'begin', layout: 'hero', section: '带着问题出发', title: '从一个量开始。', subtitle: '下一站 · 第2讲 · 函数与营销定量模型', lines: ['给变量命名。', '让关系显形。', '用数学，解释选择。'], visual: 'orbit' }
  ];
  const clampStep = (index, value) => Number.isInteger(value) ? Math.max(0, Math.min(pages[index]?.reveals?.length ?? 0, value)) : 0;
  function publicContext(index, step) {
    const p = pages[index]; if (!p) return '';
    const visibleStep = clampStep(index, step), mapUnits = p.layout === 'map' ? units : p.unit ? [units[p.unit - 1]] : [];
    return [p.section, p.title, p.subtitle, ...mapUnits.map(u => `${u.title}：${u.hours}学时，第${u.lessons}讲`), ...(p.lines ?? []), ...(p.items ?? []).map(a => a.join('：')), ...(p.columns ? [p.columns.join(' / '), ...p.rows.map(r => r.join(' / '))] : []), ...(p.options ?? []), ...(p.reveals ?? []).slice(0, visibleStep), visibleStep >= (p.reveals?.length ?? 0) ? p.conclusion : '', p.source].filter(Boolean).join('\n');
  }
  function restore(raw) {
    try { const state = JSON.parse(raw); if (state.version !== version) return null; const index = Number.isInteger(state.index) ? Math.min(39, Math.max(0, state.index)) : 0; const steps = pages.map((_, i) => clampStep(i, state.steps?.[i])); return { version, index, steps, filmTime: Number.isFinite(state.filmTime) ? Math.min(90, Math.max(0, state.filmTime)) : 0 }; } catch { return null; }
  }
  return { version, units, pages, clampStep, publicContext, restore };
});
