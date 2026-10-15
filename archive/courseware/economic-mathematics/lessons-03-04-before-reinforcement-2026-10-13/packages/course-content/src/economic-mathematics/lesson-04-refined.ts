import { limitsLesson, type LimitPage } from './limits-authoring.js';

/** Pages and narration are individually authored; reveals preserve the current premises. */
const pages: readonly LimitPage[] = [
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "接续第三讲；恢复日能力400件",
    "accent": "ink",
    "layout": "cover",
    "style": "cover",
    "teachingCue": "直接接住上一讲悬念，不重复一般课程目标页。",
    "title": "同一个最优点，两种极限问题",
    "image": "v2/l04-scene.png",
    "imageAlt": "采购与商家情境的编辑插画",
    "lead": "上一讲：数列先看全部尾项，函数再看全部附近输入；现在分别检查左右两侧。",
    "body": [
      "从左右趋近，到采购门槛与规模决策。"
    ],
    "speech": [
      "上一讲从数列建立了全部尾部的保证，再把它转成函数的全部附近输入保证。现在回到八十元这个商家最优点，把两侧分别检查。记住，利润函数和利润差商是两个不同对象。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "先分对象和单位再看曲线，防止用利润连续的图证明导数。",
    "title": "利润与差商，是不同的数学对象",
    "table": {
      "columns": [
        "对象",
        "表达式",
        "单位"
      ],
      "rows": [
        [
          "日利润",
          "$\\Pi(80+h)$",
          "元/日"
        ],
        [
          "平均变化率",
          "$Q_{80}(h)=[\\Pi(80+h)-\\Pi(80)]/h$",
          "（元/日）/（元/件）"
        ]
      ]
    },
    "body": [
      "两者都用 $h\\to0$，但考察的输出不同。差商仍须 $h\\ne0$。"
    ],
    "prompt": "一个对象两侧靠近同值，能否直接推出另一个也一样？",
    "speech": [
      "同一个价格增量h可以送入两个对象。第一个是日利润，第二个是日利润增量除以价格增量。它们的输出和单位不同。因此利润两侧靠近同值，不能直接推出差商两侧也相同。我们必须各算各的。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "原日利润模型；价格连续近似",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "题设范围先可见；用±h接入左右极限定义。",
    "title": "固定80元，让新价格从两边靠近",
    "formula": "\\Pi(p)=\\begin{cases}360p-10000,&30\\le p\\le80,\\\\-9p^2+1280p-26000,&80<p\\le100.\\end{cases}",
    "limitFigure": {
      "kind": "profit",
      "params": {
        "min": 78,
        "max": 82
      }
    },
    "body": [
      "$h<0$：新价格低于80；$h>0$：新价格高于80。",
      "限定 $0<|h|<1$，两侧都在原价格定义域内。"
    ],
    "prompt": "哪一个分段式分别控制左边与右边？",
    "speech": [
      "基准保持80元，新价格写成80加h。h为负从低价一侧靠近，h为正从高价一侧靠近。先把h绝对值限制小于1，保证两边都在合法连续区间中。左边用线性利润式，右边用二次利润式，不可以跨分段套公式。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "完整定义只改变输入范围，其余量词沿用第三讲。",
    "title": "只从一侧靠近：左右极限",
    "lead": "右极限 right-hand limit：只保证右侧所有足够近的输入；左极限 left-hand limit同理。",
    "formula": "\\begin{aligned}x\\to a^+:&\\quad0<x-a<\\delta,\\\\x\\to a^-:&\\quad0<a-x<\\delta.\\end{aligned}",
    "body": [
      "固定实数L。对任意ε>0，存在δ>0，使对应一侧范围内的所有输入满足 $|f(x)-L|<\\varepsilon$。",
      "分别记作 $\\lim_{x\\to a^+}f(x)=L$ 与 $\\lim_{x\\to a^-}f(x)=L$。"
    ],
    "prompt": "改动的是输出精度要求，还是接受检验的输入范围？",
    "speech": [
      "只对右侧足够近的所有输入作误差保证，称为右极限。只对左侧作保证，称为左极限。任意ε、存在δ、范围内全部输入的次序完全保留，变化的是输入范围。右侧要求x减a在零与δ之间；左侧要求a减x在零与δ之间。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "原模型；差商单位（元/日）/（元/件）",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "完整左侧证明保留分段范围，不用两个取值代替证明。",
    "title": "80元左侧：利润在升，差商固定为360",
    "formula": "\\Pi(80+h)=18800+360h,\\qquad -1<h<0",
    "steps": [
      {
        "title": "差商是精确常数",
        "formula": "Q_{80}(h)=\\frac{360h}{h}=360\\quad(-1<h<0)"
      },
      {
        "title": "左侧误差保证",
        "text": "任取ε>0，取δ=1；所有−δ<h<0都有 |Q₈₀(h)−360|=0<ε。"
      }
    ],
    "speech": [
      "从左边代入线性利润式，利润等于18800加360h。这个等式对负1到零之间的所有h精确成立。",
      "利润增量是360h，除以非零h，得到差商360。它并非近似结果。",
      "对任意正ε，取δ等于1，范围内所有负h的差商误差都为零。因此差商的左极限是360，而不是从某个小数猜出来的。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "原模型；差商单位（元/日）/（元/件）",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "δ包含局部公式合法性与误差保证两个任务。",
    "title": "80元右侧：差商靠近−160",
    "formula": "\\Pi(80+h)=18800-160h-9h^2,\\qquad 0<h<1",
    "steps": [
      {
        "title": "右侧差商与误差",
        "formula": "Q_{80}(h)=-160-9h,\\qquad |Q_{80}(h)+160|=9h"
      },
      {
        "title": "一项δ同时保住分段与精度",
        "formula": "\\delta=\\min(1,\\varepsilon/9)\\quad\\Rightarrow\\quad0<h<\\delta\\Rightarrow9h<\\varepsilon"
      }
    ],
    "speech": [
      "右边代入二次式，精确得到18800减160h再减9h平方。此处h为正且小于1。",
      "差商等于负160减9h，距负160的误差就是9h。",
      "取δ为1与ε除以9中的较小值。这样h既留在公式适用范围内，也让误差严格小于ε。所以右极限是负160。δ不只管精度，还要管原式的条件。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "解析差商；输入0处均保持空点",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "两条差商方向与利润曲线严格分开；下一页解释一般判据。",
    "title": "左右极限都存在，却不相等",
    "formula": "\\lim_{h\\to0^-}Q_{80}(h)=360,\\qquad\\lim_{h\\to0^+}Q_{80}(h)=-160",
    "limitFigure": {
      "kind": "quotient",
      "params": {
        "base": 80
      }
    },
    "body": [
      "范围缩得再小，两侧输出也不能靠近同一个实数。"
    ],
    "prompt": "如果坚持给同一目标值，哪一侧会在某次精度要求下失败？",
    "speech": [
      "两侧分别有完整的误差保证，但一个目标是360，一个是负160。没有一个共同实数能同时满足任意精度要求。图上这是差商，不是利润；输入0处仍为空点。接下来把两侧判断整理成一般的极限判据。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "双向判据解释必要方向同一范围，充分方向较小δ；词汇形式定义留p10/p19。",
    "title": "两侧拼起来，何时得到函数极限？",
    "lead": "在目标点两侧都可考察时；符号⇔表示两个方向都能推出。",
    "formula": "\\lim_{x\\to a}f(x)=L\\quad\\Longleftrightarrow\\quad\\lim_{x\\to a^-}f(x)=\\lim_{x\\to a^+}f(x)=L",
    "steps": [
      {
        "title": "相同目标，用较小范围同时保证",
        "text": "给定ε；左、右分别给δ₋、δ₊。",
        "formula": "\\delta=\\min(\\delta_-,\\delta_+)"
      }
    ],
    "prompt": "若只证明两侧各有极限，为什么还少一个条件？",
    "speech": [
      "两侧都有定义可考察时，函数的两侧极限存在并相等，才有一个共同的函数极限。反过来，整个范围都能保证，自然也能保证其中任何一侧。",
      "若两侧都以同一个L为目标，给定ε分别选好左右δ，再取较小的那个，就能保证两边全部输入。若目标值不同，单靠缩小输入范围不能拼出同一个L。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "原400件模型；元/日与变化率分开",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "完整解释“没有跳跃”现象，连续正式定义留第六讲。",
    "title": "利润没有跳跃，差商却分成两边",
    "formula": "\\lim_{h\\to0^-}\\Pi(80+h)=\\lim_{h\\to0^+}\\Pi(80+h)=18800",
    "table": {
      "columns": [
        "所研究的对象",
        "左极限",
        "右极限",
        "共同实数极限"
      ],
      "rows": [
        [
          "利润",
          "18 800",
          "18 800",
          "18 800"
        ],
        [
          "差商",
          "360",
          "−160",
          "不存在"
        ]
      ]
    },
    "prompt": "利润图没有断开，为何仍不能画一条共同的切线？",
    "speech": [
      "日利润本身的两侧极限都等于18800，且等于80元处的利润值，因此图没有跳跃。但差商的两侧目标不同，没有共同实数极限。没有断开与能用一条共同切线描述附近变化，是两项不同要求。正式的连续定义留到后面，我们这里先保持对象清楚。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "给数学名称完整含义，再述费马必要条件；数列网格不偷用局部连续输入。",
    "title": "“最优点导数为零”有前提",
    "lead": "可导 differentiable：差商趋近时存在有限实数极限，这个极限称导数。",
    "body": [
      "内点 interior point：目标点左右有一小段输入都在定义域内。",
      "必要条件 necessary condition：结论成立必须满足的条件，满足它本身未必足够。",
      "若内点处附近函数值都不大于该点，即局部最大，且函数在此可导，则导数必须为零。"
    ],
    "prompt": "80元的最优结论成立；上面哪个前提不成立？",
    "speech": [
      "差商有有限实数极限时，叫在该点可导，那个极限是导数。内点指左右一小段输入都属于定义域。必要条件表示某结论成立必须满足，但满足它未必能保证结论。局部最大是在附近所有函数值都不超过该点。内点处局部最大并且可导，才推出导数为零。80元满足最优，却不可导，因此不能套这个结论。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "数学范围与执行规则",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "经济定义域深化前提；不介绍未解释的约束驻点等词。",
    "title": "端点和报价网格，也不能套同一句话",
    "body": [
      "在价格区间[30,100]的端点，只能从定义域内的一侧研究。",
      "报价网格没有任意小的非零调价；网格最优不能直接推出导数为零。",
      "原模型的全域最优证明仍须覆盖每个合法输入，不能由必要条件替代。"
    ],
    "prompt": "若最高利润发生在最高允许售价，是否一定要出现水平切线？",
    "speech": [
      "价格区间的30和100是端点，只能从合法的一侧靠近。五角网格又是离散集合，没有任意小的非零调价。因此端点最优、网格最优都不能机械推出导数为零。导数条件帮助分析，不替代对整个合法范围的比较。"
    ]
  },
  {
    "kind": "exercise",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "合同A：给定规则与数量上限",
    "accent": "ink",
    "layout": "exercise",
    "style": "editorial",
    "teachingCue": "先解释全量折扣与所有量，再进行4分钟独立计算；门槛归右段。留足独立作答时间，计时不自动公开答案。",
    "title": "采购满500件，整批都按新单价计费",
    "exerciseMinutes": 3,
    "lead": "全量折扣 all-units discount：达到门槛后，整批数量都改按较低单价计算。",
    "formula": "C_A(q)=\\begin{cases}5000+20q,&0<q<500,\\\\5000+18q,&500\\le q\\le10000.\\end{cases}",
    "body": [
      "q：每批采购件数；$C_A$：每批总成本（元）。实际q取整数，极限采用连续数量近似。",
      "固定费用5000元/批；这是全量折扣，非只给第500件以后的部分打折。"
    ],
    "prompt": "三题选择：Q₈₀的双侧极限？利润有极限能否推出可导？499件改500件总款如何变化？",
    "speech": [
      "先做两个已讲清的判断：八十元差商的左右极限不同，双侧极限是否存在？利润的极限存在能否推出导数存在？第三题加入给定合同规则。固定费用五千，未满五百件单价二十，满五百件后整批改成十八。全量折扣指整批都改按新单价，不是只给多出的部分打折。实际件数是整数，算四百九十九件改五百件的总款变化。"
    ],
    "exerciseActivityId": "l4-sides"
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "合同A；原生图按解析模型绘制",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "反馈整数980与连续跳差1000不同，保留一万上限。",
    "title": "极限跳差1000元，实际少付980元",
    "table": {
      "columns": [
        "比较对象",
        "结果（元/批）"
      ],
      "rows": [
        [
          "左侧趋近500",
          "15 000"
        ],
        [
          "右侧趋近500；恰买500件",
          "14 000"
        ],
        [
          "恰买499件",
          "14 980"
        ],
        [
          "499件改为500件的成本变化",
          "−980"
        ]
      ]
    },
    "limitFigure": {
      "kind": "contract",
      "params": {
        "view": 0
      }
    },
    "body": [
      "极限比较的1000元跳差，不等于相邻整数订单的成本差。"
    ],
    "prompt": "多买1件却少付总款，来自哪一项合同规则？",
    "speech": [
      "左侧趋近500时，总成本趋近15000；右侧和恰在500件时都是14000。两侧极限不同，差1000元。实际499件成本14980，比500件多980。相邻整数订单的成本差与连续极限跳差不是同一个量。多买一件少付钱，来自整批重计单价的全量折扣。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "用两个同一故事内例子比较，避免新例子跳跃。",
    "title": "分段写法，不决定极限是否存在",
    "table": {
      "columns": [
        "分段对象",
        "接合处两侧",
        "共同极限"
      ],
      "rows": [
        [
          "80元处的日利润",
          "18 800与18 800",
          "存在"
        ],
        [
          "500件处的合同A总成本",
          "15 000与14 000",
          "不存在"
        ]
      ]
    },
    "body": [
      "要核对两侧的实际结果，而不是数公式有几段。"
    ],
    "prompt": "如果把“函数分段”当成没有极限的理由，遗漏了哪一步？",
    "speech": [
      "两个函数都分段，日利润在接合处却有共同极限，采购总成本没有。分段是写法，不是极限存在与否的判据。必须算清接合处两侧，并检查是否相同。接下来，总成本由几项组成，我们怎样从组成部分计算极限？"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "成本构成示意；变量单位一致",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "由采购计算的需求引出法则，不把规则列表孤立插入。",
    "title": "组合成本，能否分别取极限再相加？",
    "formula": "C(q)=F(q)+q\\,u(q)",
    "body": [
      "F(q)：固定或批次费用；u(q)：每件费用；q·u(q)是本批货款。",
      "附近的各项都有有限极限时，才能用相应法则组织计算。"
    ],
    "prompt": "若两项各自没有有限极限，和是否也一定没有？",
    "speech": [
      "总成本由批次费用和货款组成。若这些组成部分在同一个输入趋近过程中各有有限极限，我们想把整体极限分项计算。但如果某项没有有限极限，不能先把它写成一个不存在的数。请保留这个条件，也别急着断言它们的和一定没有极限。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "必要输入一致条件可见，四则商留下一页；用直接lim记号有前置同一过程。",
    "title": "有限极限的四则法则，先看条件",
    "lead": "同一过程 $x\\to a$ 下，设 $f(x)\\to A$、$g(x)\\to B$，A、B均为实数。",
    "formula": "\\begin{aligned}\\lim(f\\pm g)&=A\\pm B,\\\\\\lim(cf)&=cA,\\\\\\lim(fg)&=AB.\\end{aligned}",
    "body": [
      "c为固定实数；函数在目标附近的共同输入范围有定义。",
      "对同一整数编号n趋于无穷的数列，相应法则也成立。"
    ],
    "prompt": "若两项使用不同自变量或不同趋近方向，能否直接拼起来？",
    "speech": [
      "现在统一条件：同一个x趋于a的过程中，两个函数各有有限实数极限A和B，固定常数为c。它们的和差、常数倍和乘积就有对应结果。数列也可使用相应法则，但必须是同一个整数编号过程。不能把不同输入、不同方向的结果直接拼接。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "条件失效与结论相反分开，后续0/0例子回答这个疑问。",
    "title": "商法则为什么要求分母极限非零？",
    "formula": "\\lim_{x\\to a}\\frac{f(x)}{g(x)}=\\frac AB,\\qquad B\\ne0",
    "body": [
      "若 $|g(x)-B|<|B|/2$，便有 $|g(x)|>|B|/2>0$。",
      "足够近时，分母既非零，也与零保持可控制的距离。"
    ],
    "prompt": "B=0时是“这条法则不能用”，还是“所有商的极限都不存在”？",
    "speech": [
      "商法则额外要求分母极限B不为零。因为当g与B的误差小于B绝对值的一半时，g的绝对值就大于这一半，不会变成零，也不会任意贴近零。B等于零时这条法则不能用，却不代表所有商都没有极限。后面我们就算几个这样的商。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "名称含义先解释，累积公式保留；只证一条法则以理解条件与机制。",
    "title": "和法则：把总误差拆成两项",
    "lead": "三角不等式 triangle inequality：$|u+v|\\le|u|+|v|$；合成误差不超过两项误差之和。",
    "formula": "|(f+g)-(A+B)|\\le|f-A|+|g-B|",
    "steps": [
      {
        "title": "分别分配误差预算",
        "text": "给定ε>0，分别保证 |f−A|<ε/2 与 |g−B|<ε/2，得到δ₁与δ₂。"
      },
      {
        "title": "同一输入范围同时通过",
        "formula": "\\delta=\\min(\\delta_1,\\delta_2)\\quad\\Rightarrow\\quad|(f+g)-(A+B)|<\\varepsilon"
      }
    ],
    "prompt": "为什么不能给两项都分配完整的ε，然后直接声称总误差小于ε？",
    "speech": [
      "三角不等式说两个量相加后的绝对值，不超过各自绝对值之和。这里把总误差拆成f的误差与g的误差。",
      "给定正ε，分别分配ε一半的误差预算。两项各自有极限，所以都能给出相应δ。",
      "取两个δ中较小的值，让同一个输入同时满足两项要求，总误差便小于ε。若给两项各一个完整ε，直接得到的只是总误差小于二ε，不能偷换成原要求。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "constructivist",
    "teachingCue": "把p15悬问收回，建立充分条件后再谈反向失败。",
    "title": "法则能正着用，不表示反过来也成立",
    "lead": "充分条件 sufficient condition：满足它就能保证结论；反向未必成立。",
    "formula": "u(x)=1/x,\\qquad v(x)=-1/x,\\qquad u(x)+v(x)=0\\quad(x\\ne0)",
    "body": [
      "u、v各自没有 $x\\to0$ 时的有限实数极限。",
      "它们的和恒为0，极限却存在。"
    ],
    "prompt": "“和有极限，所以每项都有极限”错在什么？",
    "speech": [
      "充分条件是满足它就能保证结论，但不能自动反过来。取u为x的倒数、v为它的相反数。两项在x趋零时各自没有有限实数极限，可是和恒为零。因此各项有有限极限足以保证和有极限，和有极限却不能倒推出各项都有。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "未定式先解释，不把0/0说极限不存在或数字0。",
    "title": "0/0不是一个可计算的数",
    "lead": "未定式 indeterminate form：组成部分的趋近状态，尚不能决定整体的结果。",
    "body": [
      "“0/0”描述分子、分母都趋于0；它不是除以零所得的数值。",
      "要回到非零输入的精确关系，继续比较变化尺度。"
    ],
    "formula": "\\lim_{x\\to1}\\frac{x^2-1}{x-1}\\quad\\text{不能由 }0/0\\text{ 直接给答案}",
    "prompt": "这道题与上一讲平方函数差商，有什么共同的合法运算？",
    "speech": [
      "未定式不是某个答案，而是组成部分的趋近状态还不足以确定整体结果。零比零表示分子和分母都趋于零，不能把它当除以零算出的数。回到非零输入，我们可以进行精确变形，这与上一讲的差商具有相同逻辑。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "局部相等给出机制，不用尚未介绍的去心邻域术语。",
    "title": "目标点以外相等，极限就能比较",
    "formula": "\\frac{x^2-1}{x-1}=x+1\\quad(x\\ne1)",
    "steps": [
      {
        "title": "保持原式在目标点无定义",
        "formula": "\\lim_{x\\to1}\\frac{x^2-1}{x-1}=\\lim_{x\\to1}(x+1)=2",
        "text": "两式在足够近而不等于1的全部输入处相等，误差保证完全相同。"
      }
    ],
    "prompt": "这是给原函数补值，还是用另一个表达式研究同一批输入？",
    "speech": [
      "非1输入处，分子可以因式分解并约去x减1，精确等于x加1。原式在1处依旧没有定义。",
      "两式在目标点之外的整段范围完全相同，所以对极限定义而言接受同一批输入、产生同一误差。x加1趋于2，原式也趋于2。这是研究极限，不是暗中给原函数补值。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "提高代数梯度，重复同一严谨依据而非泛泛重说结论。",
    "title": "同一种依据，处理立方差",
    "formula": "\\frac{x^3-8}{x-2}=x^2+2x+4\\quad(x\\ne2)",
    "steps": [
      {
        "title": "变形以后，再用有限极限法则",
        "formula": "\\lim_{x\\to2}\\frac{x^3-8}{x-2}=2^2+2\\cdot2+4=12"
      }
    ],
    "prompt": "为什么答案是12，仍不意味着原式在2处能直接计算？",
    "speech": [
      "立方差分解后，在非2输入处精确得到x平方加二x加4。保持这个条件，然后对多项式使用已有的有限极限法则。",
      "x趋于2时，结果为4加4加4，也就是12。答案属于趋近过程，原分式在目标2处仍不能直接计算。请在自己的推导每次约分处写清非零条件。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "共轭式就地解释而非直接丢术语，先核对定义域再取极限。",
    "title": "根式差不能直接约，怎样保留精确等式？",
    "lead": "有理化 rationalization：乘以共轭式，使根式差转为可以处理的乘积。",
    "formula": "\\frac{\\sqrt{1+x}-1}{x}=\\frac1{\\sqrt{1+x}+1}\\quad(x\\ge-1,\\ x\\ne0)",
    "body": [
      "共轭式是把两项之间的减号改为加号：$(\\sqrt{1+x}-1)(\\sqrt{1+x}+1)=x$。"
    ],
    "prompt": "新分母是否可能等于0？原式还保留哪些范围条件？",
    "speech": [
      "根式差用共轭式来有理化。这里的共轭式把减号改为加号，乘积精确等于x。x必须至少为负1，原分母还要求x非零。约分后得到根号一加x加1的倒数，新分母至少为1，不会为零。条件仍要保留。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "proof",
    "style": "editorial",
    "teachingCue": "不借尚未讲的复合连续性；根式界先证明，商法则合法性明示。",
    "title": "不偷用结论，先证明根式的趋近",
    "formula": "|\\sqrt{1+x}-1|=\\frac{|x|}{\\sqrt{1+x}+1}\\le|x|\\quad(x\\ge-1)",
    "steps": [
      {
        "title": "由误差保证根式趋于1",
        "text": "任取ε>0，取δ=min(1/2,ε)；0<|x|<δ时根式有定义，误差小于ε。"
      },
      {
        "title": "现在分母极限非零，才用商法则",
        "formula": "\\lim_{x\\to0}\\frac{\\sqrt{1+x}-1}{x}=\\frac1{1+1}=\\frac12"
      }
    ],
    "speech": [
      "为了不把尚未解释的根式趋近当成当然，先用同一个有理化等式估计误差。新分母至少为1，所以根式与1的误差不超过x的绝对值。",
      "取δ为二分之一与ε中的较小值，保证定义域及误差要求，因此根式趋于1。",
      "现在新分母趋于2，不为零，商法则可以用，原式的极限等于二分之一。顺序是先证明所用极限，再检查商法则条件。"
    ]
  },
  {
    "title": "基础计算：变形以前，先核对条件",
    "kind": "exercise",
    "layout": "exercise",
    "exerciseMinutes": 2,
    "exerciseActivityId": "l4-algebra",
    "body": [
      "① $\\lim_{x\\to2}(x^2-4)/(x-2)$：0、4还是不存在？",
      "② $\\lim_{x\\to0}(\\sqrt{1+x}-1)/x$：0、1还是1/2？",
      "③ 只知f→0、g→0且g≠0，能否确定f/g的极限？"
    ],
    "prompt": "选择后写一句依据：定义域、精确等式或法则条件。",
    "teachingCue": "安排基础选择组，先讲清法则和变形再练习。",
    "speech": [
      "先做三个基础计算判断。前两题不靠在分母为零处硬代入，要说明目标点以外的精确等式。第三题不能只看分子和分母都趋零，还要问商法则的前提有没有满足。"
    ]
  },
  {
    "title": "反馈：0/0提示继续研究，不给出答案",
    "steps": [
      {
        "title": "平方差约分",
        "formula": "x\\ne2:\\quad (x^2-4)/(x-2)=x+2\\quad\\Rightarrow\\quad\\lim=4"
      },
      {
        "title": "根式差有理化",
        "formula": "x\\ne0:\\quad(\\sqrt{1+x}-1)/x=1/(\\sqrt{1+x}+1)\\quad\\Rightarrow\\quad\\lim=1/2"
      },
      {
        "title": "分母极限为零时，不能套商法则",
        "text": "x²/x→0；x/x→1；x/x²=1/x无双侧有限极限。相同形式不决定结果。"
      }
    ],
    "teachingCue": "完成反馈后进入参数条件变化，做到浅题有收获，深题有台阶。",
    "speech": [
      "先检查你是否写清了目标点以外的条件。",
      "第一题原式在x不等于二时等于x加二，极限为四。",
      "第二题有理化后的分母趋于二，非零，所以极限为二分之一。",
      "第三题不能确定。分母极限为零，商法则不适用。同样的零比零提示还要研究相对变化，不能当作一个数。"
    ]
  },
  {
    "kind": "exercise",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "exercise",
    "style": "editorial",
    "teachingCue": "4分钟独立练习；不在初始讲解透露a/2或c=4。留足独立作答时间，计时不自动公开答案。",
    "title": "参数与补值，分别会改变什么？",
    "exerciseMinutes": 3,
    "body": [
      "① 固定任意实数a，求 $\\lim_{x\\to0}(\\sqrt{1+ax}-1)/x$；说明附近哪些输入有定义，别漏a=0。",
      "② 设 $f_c(x)=(x^2-4)/(x-2)$（x≠2），并规定 $f_c(2)=c$。求 $x\\to2$ 时极限；何时它等于函数值？"
    ],
    "prompt": "先完成根式变形，再检查a=0和负参数；最后区分参数a与补值c。",
    "speech": [
      "请独立完成两题。第一题参数a是任意固定实数，先确定零附近根式可计算的范围，不能漏掉a等于零。第二题改变的是目标点的补值。请分别回答极限和函数值，别把这两个问题合成一个。推导中保留范围与所用法则。"
    ],
    "exerciseActivityId": "l4-parameters"
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "proof",
    "style": "editorial",
    "teachingCue": "参数符号和零值都明确处理，不把证明只写a>0。",
    "title": "参数a改变尺度，a=0也在答案里",
    "formula": "\\frac{\\sqrt{1+ax}-1}{x}=\\frac a{\\sqrt{1+ax}+1}\\quad(x\\ne0,\\ 1+ax\\ge0)",
    "steps": [
      {
        "title": "先守住附近定义域",
        "text": "若a≠0，取 |x|<1/(2|a|)，则1+ax>1/2；若a=0，根式恒为1。"
      },
      {
        "title": "误差界与商法则",
        "formula": "|\\sqrt{1+ax}-1|\\le|a|\\,|x|\\to0,\\qquad \\lim_{x\\to0}\\frac{\\sqrt{1+ax}-1}{x}=a/2"
      }
    ],
    "prompt": "a为负时，为什么仍能选一个目标两侧都合法的范围？",
    "speech": [
      "同样有理化，原式等于a除以根号一加ax加1，这个等式要求x非零，而且根式内部非负。",
      "a非零时，把x绝对值限制小于二倍a绝对值的倒数，根式内部大于二分之一；a等于零时根式恒为1。因此负参数也能保住目标两侧范围。",
      "根式误差不超过a绝对值乘x绝对值，所以趋于零。新分母趋于2，极限为a除以2，零参数也得到零，没有被排除。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "再次核查目标点与附近行为，但用新的参数练习完成反馈闭环。",
    "title": "改变c，只改变目标点的取值",
    "formula": "\\frac{x^2-4}{x-2}=x+2\\quad(x\\ne2)",
    "table": {
      "columns": [
        "问题",
        "结论"
      ],
      "rows": [
        [
          "$\\lim_{x\\to2}f_c(x)$",
          "对每一个实数c，均为4"
        ],
        [
          "$f_c(2)$",
          "c"
        ],
        [
          "极限是否等于函数值",
          "仅c=4时相等"
        ]
      ]
    },
    "prompt": "如果c=99，哪一条保证改变了？哪一条没有改变？",
    "speech": [
      "非2处，函数精确等于x加2，极限对每个c都为4。恰在2处的函数值却是c，所以两者相等仅当c等于4。c改为99，目标点值改变，非零距离内的误差保证没有改变。请用这个区别核对第二题。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "合同A；实际数量范围0<q≤10000",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "第一课时留规模问题，第二课时按平均成本进入，不凭空换模型。",
    "title": "500件附近，与规模越来越大，是两种问题",
    "body": [
      "靠近500件：考察折扣门槛左右，输入变化很小。",
      "扩大批量：考察固定费用分摊，输入规模继续增大。",
      "合同上限10000件。规模分析必须先说明允许讨论多大的输入。"
    ],
    "prompt": "真实合同有上限，是否能直接对它谈q趋于无穷？",
    "speech": [
      "第一课时从80元两側进入采购门槛，又建立了计算法则。下一课时仍用这份合同，但改问固定费用如何随规模分摊。靠近500与批量不断扩大是不同过程。合同有一万件上限，直接谈真实合同的q趋于无穷会遗漏定义域条件。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "接续合同A；元/批与元/件分开",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "第二课时复接上限与门槛，先提经济问题再给平均成本定义。",
    "title": "总成本之外，商家还关心每件成本",
    "formula": "C_A(q)=5000+18q\\quad(500\\le q\\le10000)",
    "body": [
      "较低单价的采购段保留相同费用规则。",
      "每批总款随q增加；每件承担的固定费用却在减少。"
    ],
    "prompt": "总成本增加，是否必然意味着每件成本也增加？",
    "speech": [
      "第二课时继续合同A达到500件后的采购段。每批总款随着数量增加，但固定费用由更多件分摊。总款增加是否意味着每件更贵？为了回答，需要把总成本与每件平均承担的成本分开。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "合同A；给定确定性成本",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "“平均”用成本口径定义，避免误读成统计外推。",
    "title": "平均成本：本批总款除以本批数量",
    "lead": "平均成本 average cost：每批总成本除以采购件数，单位元/件。",
    "formula": "\\overline C_A(q)=\\frac{C_A(q)}q=18+\\frac{5000}{q}\\quad(500\\le q\\le10000)",
    "body": [
      "横线在此表示平均成本，不是统计样本均值。",
      "18元/件是单件费用；5000/q是每件分摊的固定费用。"
    ],
    "prompt": "平均成本下降与采购总款下降，是同一结论吗？",
    "speech": [
      "平均成本等于本批总成本除以本批件数，单位为元每件。这里横线只是平均成本记号，不是样本均值。18是单件费用，5000除以q是分到每件的固定费用。平均成本可以下降而总款仍增加，两者不能互换。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "合同A实际范围500≤q≤10000",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "先画实际实线，不把无界曲线当有限合同图。",
    "title": "数量增加，18元仍未成为实际平均成本",
    "table": {
      "columns": [
        "本批件数",
        "每件固定费用",
        "平均成本（元/件）"
      ],
      "rows": [
        [
          "500",
          "10",
          "28"
        ],
        [
          "1000",
          "5",
          "23"
        ],
        [
          "5000",
          "1",
          "19"
        ],
        [
          "10000",
          "0.5",
          "18.5"
        ]
      ]
    },
    "limitFigure": {
      "kind": "average-cost",
      "params": {
        "view": 0
      }
    },
    "body": [
      "到合同上限，固定费用仍有0.5元/件；不能沿此合同继续采购到无限大。"
    ],
    "prompt": "“平均成本最终为18”究竟描述哪个模型？",
    "speech": [
      "从500件到一万件，平均成本由28降到18点5。合同上限处固定费用仍分摊零点5元每件。若说平均成本最终为18，就必须说明它属于哪个模型：真实合同在一万件结束，不能直接越过上限研究无限批量。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "理想化延伸；实际区间实线，扩展段虚线",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "显式新符号A与新定义域，在学生画布清楚标明假设变化。",
    "title": "另设理想延伸，再研究无限规模",
    "formula": "A(q)=18+5000/q,\\qquad q\\ge500",
    "body": [
      "另定义A：假设单价与固定费用不变，取消数量上限。",
      "A在实际区间内与原平均成本相同；区间外是理想化延伸，不是原合同承诺。"
    ],
    "limitFigure": {
      "kind": "average-cost",
      "params": {
        "view": 1
      }
    },
    "prompt": "取消数量上限，是代数化简，还是改变了问题假设？",
    "speech": [
      "现在明确另设一个函数A，表达式相同，但假定价格和固定费用不变，并取消批量上限。在原合同区间里，它与原平均成本一致；一万件以外是理想化延伸。改变定义域是改变假设，绝不是代数化简。只有这个新函数才有无界输入可考察。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "无界输入的前提先说，M解释范围与单位；“对定义域上点”不掩盖有限域漏洞。",
    "title": "由整数尾部，推广到所有充分大的实数输入",
    "lead": "T>0是输入规模门槛，作用类似数列的N；它不必是整数。",
    "body": [
      "要求函数对所有充分大的输入有定义。任意ε>0，都能选T>0，使所有x>T满足$|f(x)-L|<\\varepsilon$。"
    ],
    "formula": "\\lim_{x\\to+\\infty}f(x)=L",
    "prompt": "输入趋于−∞时，条件应改成x<−T；有限实数目标L不变。",
    "speech": [
      "第三讲已经理解整数编号走向无穷。现在把它推广到所有充分大的实数输入。用T表示输入规模门槛，它类似N，但不必是整数。函数须对所有充分大的输入有定义。任意误差要求都能选出T，使所有x大于T的输出都靠近有限实数L，才是输入趋于正无穷的有限极限。负无穷则检查所有小于负T的输入。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "proof",
    "style": "editorial",
    "teachingCue": "完整ε-M证明保留q≥500，防止偷渡真实合同无限规模。",
    "title": "对理想平均成本，给一个完整保证",
    "formula": "|A(q)-18|=5000/q\\quad(q\\ge500)",
    "body": [
      "任取ε>0，选择$T=\\max(500,5000/\\varepsilon)$。"
    ],
    "steps": [
      {
        "title": "所有超过门槛的输入都通过",
        "formula": "q>T\\Rightarrow|A(q)-18|=5000/q<\\varepsilon"
      },
      {
        "title": "结论属于另设的理想函数",
        "formula": "\\lim_{q\\to+\\infty}A(q)=18",
        "text": "18元/件是理想延伸的极限，不是有限批量的实际平均成本。"
      }
    ],
    "speech": [
      "平均成本与十八之间的误差是五千除以批量。我们沿用同样的先要求、再给门槛方法。",
      "给定ε，取门槛T为五百和五千除以ε的较大者。所有q大于T都在理想函数定义域内，误差严格小于ε。",
      "所以在取消数量上限的理想函数中，平均成本趋于十八。这个结论不能自动写回有一万件上限的实际合同。"
    ]
  },
  {
    "kind": "exercise",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "合同A与理想函数A分开解释",
    "accent": "ink",
    "layout": "exercise",
    "style": "editorial",
    "teachingCue": "经济定义域决定可兑现精度，显式限制实现意义。",
    "title": "经济判断：0.1元误差，实际合同能兑现吗？",
    "formula": "\\overline C_A(q)=18+5000/q\\quad(\\text{元/件})",
    "body": [
      "实际批量为整数，500≤q≤10000。",
      "① 能否使与18元的差严格小于0.1元？",
      "② 实际最低平均成本是多少？③ 理想极限能否直接作为预算单价？"
    ],
    "prompt": "分别给出代数门槛与实际范围，写清预算中的费用。",
    "speech": [
      "现在独立检查实际背景。批量最多一万件，能否把平均成本与十八的差压到严格小于零点一？先解不等式，再与定义域比较。随后求实际范围内的最低平均成本，说明为什么理想极限不能直接写成本批预算。不要只写趋于十八。"
    ],
    "exerciseActivityId": "l4-real-domain",
    "exerciseMinutes": 1.5
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "从5000/q到一般量级，高中幂函数复用但明确除法条件。",
    "title": "比值看主导项，先让尺度相同",
    "formula": "\\frac{2x^2+3}{5x^2-x}=\\frac{2+3/x^2}{5-1/x}\\quad(x>1)",
    "steps": [
      {
        "title": "在大规模输入下核对商法则",
        "formula": "\\lim_{x\\to+\\infty}\\frac{2x^2+3}{5x^2-x}=\\frac25",
        "text": "1/x与1/x²趋于0；新分母趋于5≠0。x充分大时原分母也非零。"
      }
    ],
    "prompt": "把分子分母各自写成“无穷”，能否代替这一步精确变形？",
    "speech": [
      "前页的误差要求需要五万件以上，实际最多一万件，所以不能兑现。实际最低平均成本是十八点五，固定费用仍须分摊。接下来将同一种规模分析推广到多项式比值：先除以同一尺度，让每个小项的极限有依据。",
      "x趋于正无穷时，x倒数及其平方都趋零，新分母趋于5不为零，所以商法则给五分之二。写分子分母都无限增大本身不能给出这个比例。"
    ],
    "body": [
      "前页反馈：误差<0.1需q>50000，超出合同；实际最低18.5元/件，仍须分摊固定费用。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "只称状态未定，正式输出无穷定义39给出；增长率不混为导数。",
    "title": "同样“都增大”，比值可以完全不同",
    "table": {
      "columns": [
        "x趋于正无穷",
        "精确变形",
        "结果"
      ],
      "rows": [
        [
          "$x/x$",
          "1",
          "1"
        ],
        [
          "$x^2/x$",
          "x",
          "无界增大"
        ],
        [
          "$x/x^2$",
          "1/x",
          "0"
        ]
      ]
    },
    "body": [
      "“∞/∞”只记录两部分的增大状态；不能当作两个数相除。"
    ],
    "prompt": "决定结果的，是哪一个量增长得更快？",
    "speech": [
      "三组分子分母都随正x无界增大，商却分别恒为1、无界增大和趋于零。∞不是可相除的实数。决定整体的是两部分的相对尺度，必须看精确关系，不能只看它们都变大。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "0/0反例梯度到无穷极限，高度要求下一页定义。",
    "title": "同样“都趋零”，也不能给商定值",
    "table": {
      "columns": [
        "x趋于0，x≠0",
        "精确变形",
        "输出行为"
      ],
      "rows": [
        [
          "$x/x$",
          "1",
          "恒为1"
        ],
        [
          "$x/x^2$",
          "1/x",
          "正负两侧不同"
        ],
        [
          "$x^2/x^4$",
          "1/x²",
          "两侧都向上无界增大"
        ]
      ]
    },
    "prompt": "第三个输出没有有限实数极限，怎样严格描述它的无界增大？",
    "speech": [
      "两个部分都趋零也一样不能决定结果。x除以x恒为1；x除以x平方等于x倒数，正负方向相反；x平方除以x四次方等于x平方的倒数，两侧都向上无界增大。最后一种没有有限实数极限，但可以给它另一种严格的高度保证。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "形式定义前先解释输出高度，单侧定义只需替换输入范围。",
    "title": "输出趋于无穷：高度要求，输入距离来保证",
    "lead": "沿用第三讲的高度要求：H>0表示要超过的输出高度，δ管输入距离。",
    "formula": "\\lim_{x\\to a}f(x)=+\\infty\\quad\\Longleftrightarrow\\quad\\forall H>0\\ \\exists\\delta>0:\\ 0<|x-a|<\\delta\\Rightarrow f(x)>H",
    "body": [
      "趋于−∞时，要求范围内所有输入都有$f(x)<-H$。",
      "与数列的正负无穷一样，这不是收敛于某个实数，也不表示取到无穷。"
    ],
    "prompt": "这一项高度保证，与“误差小于ε”保证有什么不同？",
    "speech": [
      "第三讲用高度要求判断数列趋于正负无穷。现在输出仍要超过任意高度，但输入通过靠近某个目标点来保证。给任意正高度H，选一个正δ，所有距离目标大于零而小于δ的输入，输出都大于H，记作函数趋于正无穷。负无穷则要求全部输出小于负H。H管输出高度，δ管输入距离。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "图曲线裁到高度边界仍画向上/向下箭头，保留符号方向与空点。",
    "title": "1/x²两侧向上，1/x两侧却相反",
    "formula": "0<|x|<1/\\sqrt H\\quad\\Rightarrow\\quad1/x^2>H",
    "limitFigure": {
      "kind": "reciprocal"
    },
    "body": [
      "$1/x^2$在x→0时趋于+∞。",
      "对1/x：右侧趋于+∞，左侧趋于−∞；不能写两侧共同趋于+∞。"
    ],
    "prompt": "把绝对值很大误说成输出很大，会漏掉什么？",
    "speech": [
      "平方倒数只要把输入绝对值限制小于H平方根的倒数，就一定超过高度H，而且两边都为正。x倒数则不同，右边向正无穷，左边向负无穷。绝对值很大表示幅度，输出很大表示正方向，不能抹掉符号。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "与历史无穷小明确区分，过程定义不偷换非标准分析对象。",
    "title": "现代无穷小，是一个趋零过程",
    "lead": "在现代极限框架中，无穷小 infinitesimal指某个指定过程中趋于0的函数或数列。",
    "body": [
      "α(x)=x，在x→0时是无穷小；固定常数10⁻⁶不是这个过程的无穷小。",
      "非零无穷小的倒数绝对值无界增大，但正负方向仍要看符号。",
      "恒为0的函数也趋于0，却不能取倒数。"
    ],
    "prompt": "“无穷小乘无穷大”为什么还不能告诉你乘积结果？",
    "speech": [
      "在本课程的现代框架里，无穷小是指定过程中趋于零的函数或数列，不是一个固定而神秘的小实数。x趋于零时的x是例子，固定百万分之一不是这个过程的无穷小。非零趋零量的倒数幅度无界增大，但方向看符号；恒零函数不能取倒数。现在再问，一个变小一个变大，乘积会怎样？"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "constructivist",
    "teachingCue": "与37/38一致的精确反例；不宣称对任意输出模型成立。",
    "title": "一项变大，一项变小，乘积仍需计算",
    "table": {
      "columns": [
        "x趋于正无穷",
        "精确结果",
        "乘积的极限行为"
      ],
      "rows": [
        [
          "$x\\cdot1/x$",
          "1",
          "恒为1"
        ],
        [
          "$x\\cdot1/x^2$",
          "1/x",
          "趋于0"
        ],
        [
          "$x\\cdot1/\\sqrt x$",
          "$\\sqrt x$",
          "趋于+∞"
        ]
      ]
    },
    "body": [
      "“0·∞”同样是未定状态；比较尺度才能确定整体。"
    ],
    "prompt": "仅用“越来越小”解释第二项，为何还不够？",
    "speech": [
      "正x趋于无穷时，x变大，其倒数、平方倒数和平方根倒数都趋零，乘积却完全不同。三个结果分别恒为1、趋零、趋正无穷。因此变大乘变小不能决定答案，必须比较同一输入下的精确尺度。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "接第三讲同一个振荡反例，原生曲线仅画分辨率足够的范围、零点靠包络证据。",
    "title": "振荡没有消失，影响却可以被压小",
    "formula": "r(x)=x^2\\sin(\\pi/x)\\quad(x\\ne0)",
    "limitFigure": {
      "kind": "squeeze"
    },
    "body": [
      "sin(π/x)本身没有x→0时的实数极限。",
      "x²把它的输出压在越来越窄的范围内。"
    ],
    "prompt": "乘积法则的条件不满足，还能换一条什么依据？",
    "speech": [
      "回到第三讲的正弦派除以x，它本身没有实数极限。现在乘上x平方，振荡仍在，却被压在越来越小的幅度内。不能套乘积法则，因为一项没有有限极限。我们需要用上下界，而不是冒填那个不存在的极限。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "包络由同一x生成，保证是证明，视觉不是代替。",
    "title": "夹逼：给所有输入同一组上下界",
    "lead": "夹逼定理 squeeze theorem：目标附近若 $u(x)\\le f(x)\\le v(x)$，且上下界都趋于同一实数L，则f也趋于L。",
    "formula": "-x^2\\le x^2\\sin(\\pi/x)\\le x^2\\quad(x\\ne0)",
    "steps": [
      {
        "title": "直接写出完整误差保证",
        "formula": "|r(x)|\\le x^2,\\qquad\\delta=\\sqrt\\varepsilon\\Rightarrow0<|x|<\\delta\\Rightarrow|r(x)|<\\varepsilon"
      },
      {
        "title": "无需给振荡因子填一个假极限",
        "formula": "\\lim_{x\\to0}x^2\\sin(\\pi/x)=0"
      }
    ],
    "prompt": "图上曲线看似贴近0，哪个不等式才真正覆盖全部输入？",
    "speech": [
      "夹逼定理的条件是：目标附近，函数被两个都趋于同一个L的函数夹在中间。本题正弦值在负1与1之间，乘非负x平方后，上下界就是负x平方与x平方。",
      "更直接地，输出绝对值不超过x平方。任取正ε，取δ为ε的平方根，范围内所有非零x的误差都小于ε。",
      "于是乘积趋于零。这个保证覆盖再细的振荡，不需要给正弦因子虚构一个极限。图只能帮助观察，完整不等式才是证据。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "新增给定合同B；同质量、同交期的比较假设",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "以同一采购任务延伸模型，写明可比商品质量交期，避免只看极限。",
    "title": "另一份报价：单位便宜，固定费用更高",
    "lead": "供应商B提出：每件17元，固定费用7000元/批。",
    "body": [
      "合同A：固定5000元，达到500件后每件18元。",
      "合同B：固定7000元，每件17元；实际范围同样是500至10000件。"
    ],
    "prompt": "单价17比18低，是否足以推荐B？先固定这次采购数量。",
    "speech": [
      "供应商B给更低的单位费用17元，但每批固定费用7000元，高于A的5000元。比较假定商品质量和交期相同，两份合同在500到一万件范围都可用。17低于18还不足以直接推荐B，必须先知道这次买多少。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "实际合同；件/批与元/批",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "图交点不在此时标出2000可作先观察但练习题不可直接泄漏，图只画两成本线。",
    "title": "两份合同，在同一批量上比较",
    "formula": "C_A(q)=5000+18q,\\qquad C_B(q)=7000+17q\\quad(500\\le q\\le10000)",
    "limitFigure": {
      "kind": "contract",
      "params": {
        "view": 1
      }
    },
    "body": [
      "本次需求暂定1500件；q是同一批数量，不能给A、B各选一个不同q后比较总款。"
    ],
    "prompt": "每件省1元，需要多少件才补回多出的2000元固定费用？",
    "speech": [
      "两份合同放在同一个q上比较。A为5000加18q，B为7000加17q。本次需求暂定1500件。不能让A买一批、B买另一批后只比总款，那会改变任务。每件省一元，要采购多少件才能抵掉额外2000元固定费用？接下来请完整写一份判断。"
    ]
  },
  {
    "kind": "exercise",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "实际区间与理想延伸区分；同质同交期",
    "accent": "ink",
    "layout": "exercise",
    "style": "editorial",
    "teachingCue": "6分钟真实决策任务，起始口播不泄漏交点/推荐/金额，后两页反馈。留足独立作答时间，计时不自动公开答案。",
    "title": "给1500件采购，写一份带条件的建议",
    "exerciseMinutes": 6,
    "body": [
      "① 另设无上限的理想平均成本：$A(q)=18+5000/q$，$B(q)=17+7000/q$（q≥500）。求各自的无穷规模极限。",
      "② 在真实共同范围内，求两合同等价批量及各自较便宜的范围。",
      "③ 本批1500件，推荐哪个？写出两份总款。",
      "④ 若需求为1500件，多买的库存持有成本为h元/件/批（h>0），写出采购加持有成本。是否应只因平均成本下降而多买？"
    ],
    "prompt": "4分钟独立完成，2分钟同桌核对。理想模型与实际合同的结论分别写清。",
    "speech": [
      "这是本讲的综合决策。先求两份理想平均成本的极限，再回到同一实际批量比较总款。基础部分完成前面三项，说明一千五百件本批选哪份。进一步思考第四项：若需求仍是这一千五百件，多出的余货每件每批有正的持有成本h，怎样把费用写进式子？平均成本降低是否足够证明多买更好？先独立写四分钟，再同桌核对两分钟。"
    ],
    "exerciseActivityId": "l4-procurement"
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "实际合同差；理想极限另列",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "精确差值决定区间，极限只回答规模假设问题；不需要导数。",
    "title": "分界是2000件，依据来自真实成本差",
    "formula": "C_B(q)-C_A(q)=2000-q\\quad(500\\le q\\le10000)",
    "table": {
      "columns": [
        "实际批量",
        "成本差B−A",
        "较便宜合同"
      ],
      "rows": [
        [
          "500≤q<2000",
          "正",
          "A"
        ],
        [
          "q=2000",
          "0",
          "相同"
        ],
        [
          "2000<q≤10000",
          "负",
          "B"
        ]
      ]
    },
    "body": [
      "理想平均成本极限：A为18、B为17元/件；不能据此声称B在所有实际批量都更便宜。"
    ],
    "prompt": "这个交点在共同定义域内吗？若它落在区间外，建议会怎样变化？",
    "speech": [
      "两份总成本之差是2000减q。共同范围内，少于2000件时A便宜，等于2000相同，多于2000时B便宜。交点确实在共同定义域里。理想平均成本极限A为18、B为17，但这没有推出B在每个实际批量都便宜。请回到成本差检查建议范围。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "实际总款与平均成本；两种单位分行",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "回到题目1500而非无限规模；以10k另场合显示条件变化。",
    "title": "本批1500件选A；一万件时B更便宜",
    "table": {
      "columns": [
        "批量",
        "合同A",
        "合同B",
        "含义"
      ],
      "rows": [
        [
          "1500件",
          "32 000元/批",
          "32 500元/批",
          "本任务A省500元"
        ],
        [
          "10000件",
          "18.5元/件",
          "17.7元/件",
          "上限处B平均成本更低"
        ]
      ]
    },
    "body": [
      "同一q比较平均成本，与比较总款给出同样排序；不同q之间则不能混用。"
    ],
    "prompt": "用“B的极限低”推翻本批A省钱的计算，错在哪里？",
    "speech": [
      "1500件时，A总款32000，B为32500，A省500元。到一万件上限，平均成本A为18点5、B为17点7，B较低。两结论并不冲突，因为批量不同。同一个q上，平均成本与总款排序一致；跨批量比较时不能只看一个较低的平均数。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "采购决策边界；未给定库存收益模型",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "深层经济追问不是泛谈涨跌，而是指出目标与遗漏成本；允许不同有依据答案。",
    "title": "选供应商，与决定买多少，是两层决策",
    "body": [
      "固定1500件任务，先比较同量、同质量、同交期的总成本。",
      "决定买多少，还需库存与未来用途。"
    ],
    "prompt": "如果只能追加一个变量进入模型，你会选哪一个？它如何改变判断？",
    "speech": [
      "供应商选择和采购量决策是两层问题。固定一千五百件任务，比较同一数量的总款。若改变数量，就要把余货成本与未来用途写进去。",
      "以j表示合同A或B。假设超过一千五百的余货每件有持有成本h，总费用是采购款加h乘余货数。在没有未来收益的简单设定中，两份费用都随数量增加，平均成本下降不能使多买最优。",
      "如果余货以后可售，就还要加入未来收益、损耗、仓储与资金条件。提出一个变量之后，必须说明它怎样进入判断。"
    ],
    "steps": [
      {
        "title": "把一个实际约束写进费用",
        "formula": "T_j(q)=C_j(q)+h(q-1500),\\quad q\\ge1500,\\quad h>0",
        "text": "j表示合同A或B。暂设当批余货都需要持有，且没有未来收益；两份成本都随q增加而增加。"
      },
      {
        "title": "扩大决策范围需补资料",
        "text": "若余货以后可售，应加入未来收益、损耗、仓储与资金约束；不能仅凭平均成本下降推荐多买。"
      }
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "归纳自然桥接回开头导数，不用教师编排语言。",
    "title": "一条公式，换了过程就换了问题",
    "table": {
      "columns": [
        "过程",
        "要保证什么",
        "决策含义"
      ],
      "rows": [
        [
          "价格p→80",
          "利润或差商在两侧的行为",
          "局部变化与转折"
        ],
        [
          "数量q→500",
          "门槛两侧的成本",
          "全量折扣"
        ],
        [
          "理想数量q→+∞",
          "超过规模门槛的全部输入",
          "固定费用分摊的理想极限"
        ]
      ]
    },
    "prompt": "每次写lim前，先说清：哪个对象、哪种输入过程、哪些合法范围？",
    "speech": [
      "同一个极限符号服务不同问题：价格靠近80、数量靠近500，或理想模型数量无界增大。要先确定输出对象、输入过程与合法范围，随后才使用法则。现在回到价格，但换到不跨分段的90元，比较它与80元的差商。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "原400件模型；变化率单位（元/日）/（元/件）",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "回到高中的导数公式，局部单段与范围条件保留，不能套90公式跨到80。",
    "title": "90元附近，两侧差商终于靠近同一值",
    "formula": "Q_{90}(h)=\\frac{\\Pi(90+h)-\\Pi(90)}h=-340-9h\\quad(0<|h|<10)",
    "steps": [
      {
        "title": "完整保证同时处理两侧",
        "formula": "\\delta=\\min(10,\\varepsilon/9)\\Rightarrow0<|h|<\\delta\\Rightarrow|Q_{90}(h)+340|=9|h|<\\varepsilon"
      },
      {
        "title": "有限实数极限，才称导数",
        "formula": "\\Pi\\prime(90)=-340"
      }
    ],
    "speech": [
      "90元附近取h绝对值小于10，整个范围都在二次利润段里。展开再除以非零h，得到负340减9h，两侧是同一个表达式。",
      "给任意正ε，取δ为10与ε除以9的较小值，既保住分段，又让差商误差小于ε。",
      "因此差商有共同有限实数极限负340，这个值才称90元处导数。80元缺少的可导条件，在这里成立。导数的单位仍表示利润对价格的反应。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "教学情境",
    "sourceNote": "原模型；线性估算为高中导数应用回顾",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "不提前教授泰勒术语，以完整恒等式解释近似与精度。",
    "title": "导数给局部反应，五角调价仍要算实际值",
    "formula": "\\Pi(90+h)-\\Pi(90)=-340h-9h^2\\quad(|h|<10)",
    "table": {
      "columns": [
        "涨价0.5元/件",
        "日利润变化（元）"
      ],
      "rows": [
        [
          "导数的线性估算",
          "−340×0.5=−170"
        ],
        [
          "原模型的精确变化",
          "−172.25"
        ],
        [
          "实际−估算",
          "−2.25"
        ]
      ]
    },
    "body": [
      "线性估算 linear approximation：只保留与h成正比的部分；误差是−9h²，有限操作不能假装没有它。"
    ],
    "prompt": "把调价幅度减半，估算误差为什么变为四分之一？",
    "speech": [
      "导数描述任意小变化的局部反应。线性估算只保留与h成正比的部分。有限涨价五角时，乘导数得到日利润减少170元，但原式精确减少172点25元，多出负2点25的差。它来自负9h平方，不能当作零。把调价幅度减半，平方项缩为四分之一，这让局部近似的质量也可以被核对。"
    ]
  },
  {
    "kind": "exercise",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "exercise",
    "style": "editorial",
    "teachingCue": "一分钟出口书写；总预算仅1分钟，不额外自动反馈或泄漏。",
    "title": "离开教室前，解释清楚这一次除法",
    "body": [
      "用自己的话写三句：",
      "① 每次差商计算时，为什么分母不能取零？",
      "② 极限怎样在不除以零的前提下给出确定结果？",
      "③ 80元最优为何没有导数，90元又为何有？"
    ],
    "prompt": "用1分钟独立写，不只写“因为lim”。下一讲带着自己的解释回来。",
    "speech": [
      "请用一分钟写三句解释，不只写一个lim符号。先说明差商为何不能取零增量，再说明极限作什么保证，最后说明80元与90元为何不同。写下你自己的依据，下一讲用它检验更难的极限。"
    ],
    "exerciseActivityId": "l4-exit",
    "exerciseMinutes": 1
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "闭合必要条件反向失败，不引新驻点分类术语；强调第三课所有条件深度。",
    "title": "导数为零，还不能把“最优”证完",
    "formula": "f(x)=x^3,\\qquad f\\prime(0)=\\lim_{h\\to0}h^2=0",
    "body": [
      "在0左边，函数值为负；右边为正。0既非局部最大，也非局部最小。",
      "内点处可导且局部最优 ⇒ 导数为零；反向不能自动成立。"
    ],
    "prompt": "为原商家证明最优，为什么仍需要分段范围与全域比较？",
    "speech": [
      "最后再检查必要条件的方向。x立方在零处差商为h平方，导数是零。但附近左边为负、右边为正，零点既不是局部最大也不是局部最小。导数为零不能单独证明最优。原商家仍需要保留分段和合法范围，完成整个范围的比较。"
    ]
  },
  {
    "kind": "definition",
    "visual": "formula-board",
    "sourceLabel": "概念模型",
    "sourceNote": "数学例题",
    "accent": "ink",
    "layout": "essay",
    "style": "editorial",
    "teachingCue": "承接夹逼与高中几何，先解释弧度条件；答案留第五讲。",
    "title": "下一问：三角函数的极限，依据在哪里？",
    "lead": "弧度 radian：角所对应的弧长除以半径；单位圆指半径为1的圆。",
    "formula": "\\frac{\\sin h}{h}\\qquad(h\\ne0,\\ h\\text{以弧度计})",
    "limitFigure": {
      "kind": "unit-circle",
      "params": {
        "angle": 0.6
      }
    },
    "body": [
      "分子、分母都趋于0，直接商法则不能给答案。"
    ],
    "prompt": "能否用单位圆的几何关系，给出覆盖全部小角度的上下界？",
    "speech": [
      "下一讲把刚才的严谨方法用到正弦h除以h。h必须以弧度计，弧度是弧长除以半径；单位圆半径为1。分子分母都趋零，直接商法则无法给答案。请带着一个问题：能否用单位圆的几何关系，给出覆盖所有足够小角度的上下界？"
    ]
  }
];

const minutes = [0.25,1.5,1.5,1.5,2,2,1.5,1.5,1.5,1,1,3,2,1.5,1.5,1.5,1.5,1.5,1,1.5,1.5,1.5,1.5,1.5,2,1,3,1.5,1,0.25,0.5,1.5,1.5,2,2,1.5,1.5,1.5,1.5,1.5,2,1.5,1.5,1.5,1.5,1.5,1.5,1.5,6,1.5,1.5,1.5,1.5,1.5,1.5,1,1,0.5];
const authored = limitsLesson(4, "左右极限、计算与采购决策", "左右能否拼成同一个极限，理想成本能否指导本批采购？", ["区分函数极限与差商极限，判断左右条件","有条件地运用法则与精确变形","区分输入规模、输出无穷与实际定义域","在同一批量和完整费用下作出采购判断"], pages, minutes, 30);
export const refinedLesson04 = authored.lesson;
export const lesson04Narration = authored.narration;
