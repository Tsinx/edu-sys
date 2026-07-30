import type {
  PortManagementSlideSpec,
  PortNarrativeBeat,
  PortNarrativeEvidence,
  PortNarrativeMetadata,
  PortNarrativePublicLabel
} from "./index.js";

const ASSET_ROOT = "/course-assets/port-management";

const IMAGES = {
  channelRewind: `${ASSET_ROOT}/story-l1-english-channel-rewind.png`,
  londonChineseSilk: `${ASSET_ROOT}/story-l1-london-chinese-silk.png`,
  jiangnanSericulture: `${ASSET_ROOT}/story-l1-jiangnan-sericulture.png`,
  silkWorkshop: `${ASSET_ROOT}/story-l1-silk-workshop.png`,
  dongtingGrainBarges: `${ASSET_ROOT}/story-l1-dongting-grain-barges.png`,
  oceanConvoy: `${ASSET_ROOT}/story-l1-ocean-convoy.png`,
  londonPortWarehouse: `${ASSET_ROOT}/story-l1-london-port-warehouse.png`,
  navalTradeTension: `${ASSET_ROOT}/story-l1-naval-trade-tension-v2.png`,
  industrialPortSteam: `${ASSET_ROOT}/story-l1-industrial-port-steam-v2.png`,
  waterCostCutaway: `${ASSET_ROOT}/story-l1-water-cost-cutaway-v2.png`,
  britishPortBooks: `${ASSET_ROOT}/story-l1-british-port-books.png`,
  londonFinance: `${ASSET_ROOT}/story-l1-london-finance.png`,
  shanghaiDawn: `${ASSET_ROOT}/story-l1-shanghai-dawn.png`,
  megashipScale: `${ASSET_ROOT}/story-l1-megaship-scale.png`,
  departureNight: `${ASSET_ROOT}/story-l1-departure-night.png`
} as const;

export const PORT_MANAGEMENT_LESSON_ONE_V6_IMAGEGEN_ASSETS =
  [
    IMAGES.londonChineseSilk,
    IMAGES.jiangnanSericulture,
    IMAGES.silkWorkshop,
    IMAGES.dongtingGrainBarges,
    IMAGES.oceanConvoy,
    IMAGES.londonPortWarehouse,
    IMAGES.navalTradeTension,
    IMAGES.industrialPortSteam,
    IMAGES.waterCostCutaway
  ] as const;

type LessonOneInput = Omit<
  PortManagementSlideSpec,
  "lesson" | "lessonTitle" | "kicker"
> & {
  kicker?: string;
};

function beat(
  location: string,
  voyageStage: string,
  storyBeat: PortNarrativeBeat,
  evidence: PortNarrativeEvidence,
  progress: number,
  openQuestion?: string,
  timeMarker?: string,
  publicLabel?: PortNarrativePublicLabel
): PortNarrativeMetadata {
  return {
    location,
    voyageStage,
    storyBeat,
    evidence,
    progress,
    ...(openQuestion ? { openQuestion } : {}),
    ...(timeMarker ? { timeMarker } : {}),
    ...(publicLabel ? { publicLabel } : {})
  };
}

function page(input: LessonOneInput): PortManagementSlideSpec {
  const { kicker, ...rest } = input;
  return {
    lesson: 1,
    lessonTitle: "第一讲 · 英国如何把贸易变成影响力？",
    kicker: kicker ?? "TRADE 01 · 从一件丝织品出发",
    ...rest
  };
}

export const PORT_MANAGEMENT_LESSON_ONE_V6_SLIDES: readonly PortManagementSlideSpec[] =
  [
    page({
      index: 1,
      slideKey: "l1-1700-wager",
      section: "1700年的赌局",
      title: "1700：如果只能押一个国家",
      kicker: "1700 · 英吉利海峡",
      layout: "cover",
      lead: "隔海相望的英格兰与法国，谁更可能在未来一个世纪形成全球影响力？",
      image: IMAGES.channelRewind,
      imageAlt: "英吉利海峡两岸港口与帆船时代的教学复原图",
      bullets: [
        "先看人口、陆地资源与军事基础",
        "再看港口、航线、商业与国家能力",
        "把你的选择写在证据出现之前"
      ],
      teachingCue:
        "先投票，不给答案；追问学生下注依据是人口、领土、军队还是贸易网络。",
      assistantCue:
        "1700年以前应称英格兰；本页是课堂悬念，不预设英国必然胜出。",
      sourceIds: ["population-europe-1700", "france-naval-history"],
      accent: "navy",
      narrative: beat(
        "英吉利海峡",
        "历史开场",
        "decision",
        "documented",
        1,
        "规模更大的国家一定更有全球影响力吗？",
        "约1700年",
        "史料"
      )
    }),
    page({
      index: 2,
      slideKey: "l1-population-gap",
      section: "1700年的赌局",
      title: "四倍人口差",
      kicker: "第一组证据 · 人口",
      layout: "stat",
      lead: "约1700年，英格兰和威尔士约500万人；法国约2000万人。",
      stat: {
        value: "1 : 4",
        label: "英格兰和威尔士 : 法国",
        detail: "历史人口估算存在口径差异，本页取便于比较的约数。"
      },
      diagram: "england-france-1700",
      bullets: [
        "法国拥有更大的国内市场与征税基础",
        "英格兰的人口规模并不支持“天然大国”想象",
        "人口是能力来源之一，却不是影响力的唯一上限"
      ],
      teachingCue:
        "让学生用第一次投票解释人口证据是否改变判断，再进入国家基础比较。",
      assistantCue:
        "只能表述为约数；1700年英格兰和威尔士约500万、法国约2000万，不写成精确普查。",
      sourceIds: ["population-europe-1700"],
      accent: "amber",
      narrative: beat(
        "英格兰与法国",
        "规模证据",
        "evidence",
        "documented",
        2,
        "人口差距会怎样影响财政、军队与市场？",
        "约1700年",
        "史料"
      )
    }),
    page({
      index: 3,
      slideKey: "l1-france-england-scale",
      section: "1700年的赌局",
      title: "法国并不弱，英格兰也不大",
      kicker: "第二组证据 · 国家基础",
      layout: "comparison",
      lead: "如果只看规模与传统军事资源，法国完全有理由被视为欧洲强国。",
      columns: [
        {
          heading: "英格兰",
          body: "岛屿防御压力、商业港口和海上通道更集中。",
          note: "人口较少，必须在有限资源中选择投入方向。"
        },
        {
          heading: "法国",
          body: "人口众多、陆军强大，同时拥有大西洋、海峡与地中海岸线。",
          note: "既要经营海洋，也要承担复杂的大陆安全责任。"
        }
      ],
      bullets: [
        "两国都拥有舰队、港口与殖民活动",
        "差别不是“重视海洋”与“不重视海洋”",
        "真正问题是资源如何在陆海、商业与战争之间配置"
      ],
      teachingCue:
        "保留法国强国地位，避免把后来的英国优势倒推成1700年的必然结果。",
      assistantCue:
        "法国不是失败者，也不是缺乏海洋能力；比较只用于呈现不同约束与资源配置。",
      sourceIds: ["population-europe-1700", "france-naval-history"],
      accent: "amber",
      narrative: beat(
        "英吉利海峡两岸",
        "规模证据",
        "concept",
        "documented",
        3,
        "有限资源会被配置到哪里？",
        "约1700年",
        "史料"
      )
    }),
    page({
      index: 4,
      slideKey: "l1-silk-in-london",
      section: "1700年的赌局",
      title: "一件中国丝织品进入伦敦",
      kicker: "镜头转向泰晤士河",
      layout: "image",
      lead: "它不产自英格兰，却能在伦敦被记录、融资、储存、出售并再次流通。",
      image: IMAGES.londonChineseSilk,
      imageAlt: "约1700年伦敦仓库中中国丝织品到港的教学复原图",
      imagePosition: "center",
      bullets: [
        "产地在中国，目的市场在欧洲",
        "价值要跨越港口、海洋、信用与时间",
        "影响力开始表现为组织远距离交换的能力"
      ],
      teachingCue:
        "以丝织品为故事物件，让学生找出画面中的货物、账簿、仓储和运输角色。",
      assistantCue:
        "画面为教学复原，不代表一批可连续追踪的真实货物；历史证据在后续页面分段呈现。",
      sourceIds: ["bl-eic-china-trade"],
      accent: "amber",
      narrative: beat(
        "伦敦",
        "商品抵达",
        "transition",
        "documented",
        4,
        "一个不生产丝绸的国家，如何从丝绸贸易中获得影响力？",
        "17—18世纪之交",
        "史料"
      )
    }),
    page({
      index: 5,
      slideKey: "l1-output-vs-influence",
      section: "1700年的赌局",
      title: "国内产量决定全球影响力吗？",
      kicker: "本讲核心问题",
      layout: "question",
      lead: "一个国家可以不生产所有商品，却控制商品抵达市场的方式。",
      prompt: "哪一种能力最可能把有限人口放大为全球影响力？",
      steps: [
        "生产更多本国商品",
        "连接更多产地与市场",
        "降低交换成本并稳定履约",
        "把商业网络转化为金融与国家能力"
      ],
      teachingCue:
        "接受多选，要求每个选择都说明因果链；第38页再回到同一问题。",
      assistantCue:
        "不能把海上贸易说成英国影响力的唯一原因；此处只建立本讲分析主线。",
      accent: "navy",
      narrative: beat(
        "伦敦",
        "提出主问题",
        "decision",
        "concept",
        5,
        "贸易网络如何放大有限的国内生产？",
        "约1700年"
      )
    }),
    page({
      index: 6,
      slideKey: "l1-eic-charter",
      section: "沿丝织品寻找网络",
      title: "1600：一纸特许状",
      kicker: "网络的组织者出现",
      layout: "statement",
      lead: "王室特许把远航贸易交给一个可持续筹资、签约和组织船队的公司。",
      stat: {
        value: "1600",
        label: "英格兰东印度公司获得特许",
        detail: "特许带来经营权，也制造垄断与权力不对称。"
      },
      bullets: [
        "单次冒险被组织为持续经营",
        "投资、船舶、人员和风险进入同一制度框架",
        "公司权力从商业逐步延伸到政治与军事"
      ],
      teachingCue:
        "把特许状解释为组织技术与权力安排，不把公司史讲成单纯商业成功。",
      assistantCue:
        "东印度公司是特许垄断公司；应同时说明其商业组织能力与后来的殖民强制。",
      sourceIds: ["uk-eic-charter"],
      accent: "navy",
      narrative: beat(
        "伦敦",
        "公司组织",
        "evidence",
        "documented",
        6,
        "为什么远航贸易需要公司而不只是船长？",
        "1600年",
        "史料"
      )
    }),
    page({
      index: 7,
      slideKey: "l1-china-direct-trade",
      section: "沿丝织品寻找网络",
      title: "从亚洲转口到直航中国",
      kicker: "贸易方式改变",
      layout: "sequence",
      lead: "英国对华贸易从亚洲据点转口，逐步转向直接派船抵达中国港口。",
      steps: [
        "1600—1680年前后：主要经万丹等亚洲据点组织中国商品",
        "1680年前后：公司开始直接派船前往中国",
        "1715年以后：驶往中国的船队趋于年度化",
        "航线一旦重复，港口、信息与信用就能持续积累"
      ],
      teachingCue:
        "沿时间轴读出“偶发交易—直接航行—重复服务”的组织升级。",
      assistantCue:
        "按英国图书馆档案摘要表述；不要把1715写成所有航班完全固定或现代班轮制。",
      sourceIds: ["bl-eic-china-trade"],
      accent: "teal",
      narrative: beat(
        "亚洲—中国—伦敦",
        "航线形成",
        "consequence",
        "documented",
        7,
        "重复航行会积累哪些网络能力？",
        "1600—1715年",
        "史料"
      )
    }),
    page({
      index: 8,
      slideKey: "l1-canton-1727-manifest",
      section: "沿丝织品寻找网络",
      title: "1727广州采购清单",
      kicker: "一页档案里的船舱",
      layout: "table",
      lead: "清单把宏大的“东西贸易”还原为可以计数、验收与付款的具体货物。",
      table: {
        headers: ["清单项目", "档案记录", "经营含义"],
        rows: [
          ["织造丝绸", "10,200件", "高价值货物占用有限船舱"],
          ["茶叶与瓷器等", "多品类采购", "组合需求与风险"],
          ["数量与品类", "逐项记录", "为结算、保险与追责提供依据"]
        ]
      },
      prompt: "如果没有准确清单，远距离贸易最先在哪一步失去控制？",
      teachingCue:
        "让学生区分货物事实、经营推论和未给出数量的品类，不补写档案中未核实的数字。",
      assistantCue:
        "10,200件仅指档案所列woven silks；不得扩写成重量、成交价或英国最终销量。",
      sourceIds: ["bl-canton-1727"],
      accent: "amber",
      narrative: beat(
        "广州",
        "货物采购",
        "evidence",
        "documented",
        8,
        "一张清单如何连接仓库、船舶与资本？",
        "1727年",
        "史料"
      )
    }),
    page({
      index: 9,
      slideKey: "l1-value-density",
      section: "沿丝织品寻找网络",
      title: "轻而贵：丝绸改变船舱价值",
      kicker: "船舱不是只装重量",
      layout: "comparison",
      lead: "远洋帆船的舱容、航期与风险都昂贵，高货值密度商品更能承受长距离运输。",
      columns: [
        {
          heading: "低货值密度",
          body: "大量重量只形成有限货值，运输成本更容易吞噬交易收益。",
          note: "距离会迅速缩小市场半径。"
        },
        {
          heading: "高货值密度",
          body: "较小重量承载较高货值，更能覆盖运费、保险和漫长周转。",
          note: "丝绸、茶叶和瓷器适合早期远洋贸易。"
        }
      ],
      bullets: [
        "货值密度影响什么值得远航",
        "船舱空间必须在多种商品之间配置",
        "高价值也意味着盗损、价格与信用风险更集中"
      ],
      teachingCue:
        "用船舱价值而非现代集装箱费率解释早期贸易品类选择。",
      assistantCue:
        "本页是经济机制解释，不给出未经来源支持的具体丝绸运费或利润率。",
      sourceIds: ["bl-canton-1727"],
      accent: "amber",
      narrative: beat(
        "广州港",
        "装船选择",
        "concept",
        "concept",
        9,
        "为什么最早跨洋的往往不是最重的商品？",
        "18世纪"
      )
    }),
    page({
      index: 10,
      slideKey: "l1-canton-london-route",
      section: "沿丝织品寻找网络",
      title: "从广州到伦敦",
      kicker: "海上路径复原",
      layout: "image",
      lead: "货物要跨过季风、补给点、海峡、好望角与大西洋，才进入泰晤士河市场。",
      diagram: "canton-london-trade",
      bullets: [
        "广州出海后进入南海与马六甲方向",
        "横跨印度洋并绕过好望角",
        "沿大西洋北上抵达伦敦",
        "路线是基于时代航海条件的教学复原"
      ],
      teachingCue:
        "沿路线只讲关键空间约束，不把示意线当作某艘船的逐日轨迹。",
      assistantCue:
        "本页是路线复原，不是1727年某艘船的完整官方航迹；不得补写未经核实的经停港。",
      sourceIds: ["bl-eic-china-trade"],
      accent: "navy",
      narrative: beat(
        "广州—伦敦",
        "跨洋运输",
        "evidence",
        "documented",
        10,
        "怎样让一次漫长航行变成可重复的贸易？",
        "17—18世纪",
        "路线示意"
      )
    }),
    page({
      index: 11,
      slideKey: "l1-london-redistribution",
      section: "沿丝织品寻找网络",
      title: "商品进入英国，也再次流向世界",
      kicker: "伦敦不是贸易终点",
      layout: "sequence",
      lead: "到港后的拍卖、批发、加工、消费与转售，让伦敦成为区域市场的组织节点。",
      image: IMAGES.londonPortWarehouse,
      imageAlt: "18世纪伦敦港卸货、仓储、拍卖与分销活动的教学复原图",
      imagePosition: "center",
      steps: [
        "卸货与查验：确认数量、品质与责任",
        "仓储与拍卖：形成价格并回收资本",
        "本地消费：进入英国市场",
        "再出口：通过商人网络进入欧洲其他市场"
      ],
      prompt: "港口城市获得的价值，只有装卸费吗？",
      teachingCue:
        "把港后市场组织与单纯运输区分开，让学生说出价格、信息和资本周转。",
      assistantCue:
        "可说明伦敦的分销与再出口功能，但不要断言1727清单中的每一件丝织品都发生再出口。",
      sourceIds: ["bl-eic-china-trade", "uk-port-books"],
      accent: "teal",
      narrative: beat(
        "伦敦",
        "市场分发",
        "consequence",
        "documented",
        11,
        "一个港口如何把货物转化为市场影响力？",
        "18世纪",
        "史料"
      )
    }),
    page({
      index: 12,
      slideKey: "l1-connects-not-makes",
      section: "沿丝织品寻找网络",
      title: "英国没有生产一切，它连接一切",
      kicker: "第一条答案",
      layout: "statement",
      lead: "当生产地、消费地、船舶、港口、账簿与资本被重复连接，有限的国内产量也能撬动更大的贸易网络。",
      stat: {
        value: "连接",
        label: "把分散的比较优势组织成持续货流",
        detail: "网络位置不替代生产，却能放大生产与交换的范围。"
      },
      bullets: [
        "连接更多产地与市场",
        "降低搜索、交易与履约成本",
        "让一次贸易沉淀为可重复能力"
      ],
      teachingCue:
        "在此首次给出“连接”答案，立即追问货流为何会存在，转入比较优势。",
      assistantCue:
        "连接一切是课堂化概括，不是字面上的全球全覆盖；需保留多因素与历史边界。",
      accent: "navy",
      narrative: beat(
        "伦敦",
        "网络初现",
        "transition",
        "concept",
        12,
        "为什么不同地区愿意持续交换？",
        "18世纪"
      )
    }),
    page({
      index: 13,
      slideKey: "l1-double-absolute-advantage",
      section: "极端比较优势模型",
      title: "一个地区两种产品都更快，还需要贸易吗？",
      kicker: "概念实验 · 两地两品",
      layout: "question",
      lead: "江南型地区生产丝和粮都更高效；湖广型地区还有什么值得交换？",
      prompt: "如果江南型地区在两种产品上都具有绝对优势，分工是否已经失去意义？",
      steps: [
        "比较每种产品的生产速度",
        "再比较多生产一种产品必须放弃什么",
        "把有限的100个劳动日重新分配"
      ],
      teachingCue:
        "先收集直觉答案，不立即定义比较优势；强调这是一组人工数字。",
      assistantCue:
        "必须称为同时具有绝对优势，不能称为帕累托更优；全部数字是概念模型。",
      accent: "teal",
      narrative: beat(
        "江南型地区与湖广型地区",
        "提出模型",
        "decision",
        "concept",
        13,
        "绝对效率更高是否意味着不需要交换？",
        "两地各有100个劳动日",
        "概念模型"
      )
    }),
    page({
      index: 14,
      slideKey: "l1-absolute-vs-comparative",
      section: "极端比较优势模型",
      title: "绝对优势不等于比较优势",
      kicker: "两种优势回答不同问题",
      layout: "comparison",
      columns: [
        {
          heading: "绝对优势",
          body: "同样时间里，谁能生产更多？",
          note: "比较生产率水平。"
        },
        {
          heading: "比较优势",
          body: "多生产一种商品，要少生产多少另一种商品？",
          note: "比较机会成本。"
        }
      ],
      lead: "即使一方什么都做得更快，有限时间仍迫使它在不同产品之间选择。",
      prompt: "生产率领先的一方，最稀缺的资源可能是什么？",
      teachingCue:
        "用“时间有限”建立机会成本，不先用公式压过直觉。",
      assistantCue:
        "比较优势只比较相对机会成本；不把生产率、工资或贸易福利混为一谈。",
      sourceIds: ["wto-comparative"],
      accent: "teal",
      narrative: beat(
        "两地模型",
        "概念辨析",
        "concept",
        "concept",
        14,
        "有限时间应优先投向哪种产品？",
        "100个劳动日",
        "概念模型"
      )
    }),
    page({
      index: 15,
      slideKey: "l1-jiangnan-huguang-model",
      section: "极端比较优势模型",
      title: "江南—湖广教学模型",
      kicker: "生产率同时领先的极端情形",
      layout: "table",
      lead: "每个地区各有100个劳动日；江南型地区在丝和粮两种产品上都更快。",
      table: {
        headers: ["地区", "1个劳动日可产丝", "1个劳动日可产粮", "100日全部产丝", "100日全部产粮"],
        rows: [
          ["江南型", "1匹", "2石", "100匹", "200石"],
          ["湖广型", "0.2匹", "1石", "20匹", "100石"]
        ]
      },
      prompt: "两行数字中，哪一项决定谁应当多生产丝？",
      teachingCue:
        "逐列读表，确认学生看见江南型地区在两种产品上都具有绝对优势。",
      assistantCue:
        "数据完全是概念模型，不得描述为明清历史统计或真实劳动生产率。",
      accent: "teal",
      narrative: beat(
        "两地模型",
        "设定生产率",
        "evidence",
        "concept",
        15,
        "同时领先的一方应该包揽全部生产吗？",
        "两地各100个劳动日",
        "概念模型"
      )
    }),
    page({
      index: 16,
      slideKey: "l1-half-time-output",
      section: "极端比较优势模型",
      title: "各用一半时间",
      kicker: "没有分工的基准线",
      layout: "table",
      lead: "两地都把50天用于丝、50天用于粮，得到一组可比较的总产量。",
      table: {
        headers: ["地区", "丝", "粮", "时间分配"],
        rows: [
          ["江南型", "50匹", "100石", "50日丝 + 50日粮"],
          ["湖广型", "10匹", "50石", "50日丝 + 50日粮"],
          ["合计", "60匹", "150石", "200个劳动日"]
        ]
      },
      stat: {
        value: "60匹 + 150石",
        label: "平均分配时的总产量",
        detail: "这是后续重新分工的比较基准。"
      },
      teachingCue:
        "让学生现场口算每一格；把60与150固定为后续参照。",
      assistantCue:
        "所有产量由第15页模型计算而来，不对应真实历史产量。",
      accent: "amber",
      narrative: beat(
        "两地模型",
        "建立基准",
        "evidence",
        "concept",
        16,
        "平均分配时间是否有效率？",
        "各50日生产丝与粮",
        "概念模型"
      )
    }),
    page({
      index: 17,
      slideKey: "l1-opportunity-cost-table",
      section: "极端比较优势模型",
      title: "机会成本是2与5",
      kicker: "真正需要比较的数字",
      layout: "table",
      lead: "多生产1匹丝，江南型地区放弃2石粮；湖广型地区放弃5石粮。",
      table: {
        headers: ["地区", "1匹丝的机会成本", "1石粮的机会成本", "相对优势"],
        rows: [
          ["江南型", "2石粮", "0.5匹丝", "丝"],
          ["湖广型", "5石粮", "0.2匹丝", "粮"]
        ]
      },
      prompt: "谁生产丝的相对代价更低？谁生产粮的相对代价更低？",
      teachingCue:
        "用放弃量解释2与5，避免直接背公式；让学生互相校验倒数关系。",
      assistantCue:
        "机会成本严格从模型生产率推导；不要额外引入价格、工资或货币。",
      sourceIds: ["wto-comparative"],
      accent: "teal",
      narrative: beat(
        "两地模型",
        "计算机会成本",
        "concept",
        "concept",
        17,
        "为什么较弱地区仍在粮食上有比较优势？",
        "每增加1匹丝",
        "概念模型"
      )
    }),
    page({
      index: 18,
      slideKey: "l1-reallocation-output",
      section: "极端比较优势模型",
      title: "重新分工以后",
      kicker: "把劳动日移向较低机会成本",
      layout: "table",
      lead: "江南型地区把70天用于丝、30天用于粮；湖广型地区100天全部用于粮。",
      table: {
        headers: ["地区", "丝", "粮", "时间分配"],
        rows: [
          ["江南型", "70匹", "60石", "70日丝 + 30日粮"],
          ["湖广型", "0匹", "100石", "100日粮"],
          ["合计", "70匹", "160石", "200个劳动日"],
          ["相对基准", "+10匹", "+10石", "总劳动日不变"]
        ]
      },
      stat: {
        value: "两种总量同时增加",
        label: "60→70匹丝；150→160石粮",
        detail: "增加来自时间重新配置，不是生产率突然提高。"
      },
      teachingCue:
        "让学生先验证各行，再圈出总时间不变和两种总量同时增加。",
      assistantCue:
        "这是特定模型下的可行重分配，不意味着现实贸易必然让每个人获益。",
      accent: "teal",
      narrative: beat(
        "两地模型",
        "重新配置",
        "consequence",
        "concept",
        18,
        "增加的产量来自哪里？",
        "总劳动日仍为200",
        "概念模型"
      )
    }),
    page({
      index: 19,
      slideKey: "l1-exchange-range",
      section: "极端比较优势模型",
      title: "交换区间：2＜P＜5",
      kicker: "分工以后还需要成交条件",
      layout: "statement",
      lead: "若1匹丝能交换P石粮，价格介于两地机会成本之间，双方才可能都愿意交易。",
      stat: {
        value: "2 ＜ P ＜ 5",
        label: "每匹丝可交换的粮食石数",
        detail: "江南型地区得到多于2石，湖广型地区付出少于5石。"
      },
      bullets: [
        "P≤2：江南型地区不如自己转回粮食生产",
        "P≥5：湖广型地区不如自己生产丝",
        "区间说明可能互利，不保证现实成交与收益分配"
      ],
      teachingCue:
        "用双方的退出条件夹出区间，不给一个虚假的唯一成交价。",
      assistantCue:
        "交换区间只来自概念模型；现实价格还受运输、议价、垄断、风险和制度影响。",
      sourceIds: ["wto-comparative"],
      accent: "teal",
      narrative: beat(
        "两地模型",
        "形成交换",
        "concept",
        "concept",
        19,
        "什么价格能让双方同时留在交易中？",
        "每匹丝的粮食价格",
        "概念模型"
      )
    }),
    page({
      index: 20,
      slideKey: "l1-production-possibility-frontier",
      section: "极端比较优势模型",
      title: "总时间有限，选择决定总产出",
      kicker: "生产可能性边界",
      layout: "image",
      lead: "生产率没有变化，仅仅改变劳动日用途，整体可获得的丝与粮组合就改变了。",
      diagram: "comparative-advantage",
      bullets: [
        "每个点都代表同一组有限劳动日",
        "沿边界移动意味着用一种产出换另一种产出",
        "分工把时间更多投向较低机会成本的产品",
        "交换让消费组合不必等于本地产出组合"
      ],
      teachingCue:
        "在图上标出平均分配与重新分工两点，强调不是凭空越过生产约束。",
      assistantCue:
        "图形只表达本模型的线性生产边界与重分配，不是历史经济规模图。",
      accent: "navy",
      narrative: beat(
        "两地模型",
        "可视化约束",
        "concept",
        "concept",
        20,
        "为什么选择会改变总量？",
        "200个劳动日",
        "概念模型"
      )
    }),
    page({
      index: 21,
      slideKey: "l1-opportunity-cost-activity",
      section: "极端比较优势模型",
      title: "90秒计算：谁应该多做什么？",
      kicker: "课堂练习",
      layout: "activity",
      lead: "仍使用第15页的生产率，不增加任何新条件。",
      prompt: "若系统至少需要70匹丝，怎样分配两地劳动日，才能保留尽可能多的粮？",
      steps: [
        "写出两地每匹丝的机会成本",
        "先把丝的生产任务交给机会成本较低的一方",
        "核对总丝不少于70匹",
        "计算剩余粮食并与150石基准比较"
      ],
      teachingCue:
        "计时90秒，两人一组提交计算过程；答案应得到江南70匹丝与总粮160石。",
      assistantCue:
        "若被问答案，可逐步引导至江南70日丝、30日粮，湖广100日粮；不跳过机会成本解释。",
      accent: "amber",
      narrative: beat(
        "课堂",
        "模型应用",
        "decision",
        "concept",
        21,
        "怎样在满足丝需求后保留更多粮？",
        "90秒",
        "概念模型"
      )
    }),
    page({
      index: 22,
      slideKey: "l1-trade-model-boundary",
      section: "极端比较优势模型",
      title: "比较优势解释交换，不替帝国辩护",
      kicker: "模型的边界",
      layout: "statement",
      lead: "机会成本能解释分工为何可能增加总产量，却不能证明现实交易自愿、公平或无暴力。",
      columns: [
        {
          heading: "模型能解释",
          body: "有限资源下的专业化方向、潜在总量收益与交换区间。",
          note: "回答“为何可能交换”。"
        },
        {
          heading: "模型不能替代",
          body: "对垄断、殖民、战争、强制劳动、收益分配和生态代价的判断。",
          note: "现实需要制度与历史证据。"
        }
      ],
      prompt: "总量增加与每个人受益，是同一个命题吗？",
      teachingCue:
        "明确区分效率与分配，把伦理与权力问题留在模型之外继续分析。",
      assistantCue:
        "不得用比较优势为殖民贸易正当化，也不得声称贸易收益会自动均等分配。",
      sourceIds: ["wto-comparative", "uk-slave-trade"],
      accent: "coral",
      narrative: beat(
        "模型与历史之间",
        "划定边界",
        "consequence",
        "concept",
        22,
        "效率提升与公平分配之间还缺什么？",
        "概念回看"
      )
    }),
    page({
      index: 23,
      slideKey: "l1-regional-division-timeline",
      section: "江南—湖广—海港",
      title: "晚明出现趋势，18世纪形成网络",
      kicker: "从模型返回历史",
      layout: "sequence",
      lead: "江南经济作物与手工业深化、长江中游粮食外运，是跨时期逐步形成的区域分工。",
      steps: [
        "晚明：江南商品经济与专业化生产趋势增强",
        "明清之际：市镇、商人和水运把局部市场连接起来",
        "18世纪：湖广粮食经汉口与长江向下游流动更具规模",
        "同一时期：英国对华直接贸易与年度船队逐渐稳定"
      ],
      teachingCue:
        "用两条平行时间线避免把晚明、1727广州采购和18世纪成熟粮运压成同一年。",
      assistantCue:
        "必须表述为历史综合链；不声称一批晚明江苏丝绸可连续追踪到英国。",
      sourceIds: ["sass-yangtze-division", "bl-eic-china-trade"],
      accent: "amber",
      narrative: beat(
        "长江中下游—广州—伦敦",
        "历史综合",
        "evidence",
        "documented",
        23,
        "模型中的分工怎样在真实空间中被运输支撑？",
        "晚明至18世纪",
        "史料"
      )
    }),
    page({
      index: 24,
      slideKey: "l1-jiangnan-specialization",
      section: "江南—湖广—海港",
      title: "江南：桑、蚕、丝与专业市镇",
      kicker: "专业化落到土地与家庭",
      layout: "image",
      lead: "蚕桑、缫丝、织造与市镇交易相互强化，使部分地区把更多劳动和土地投向高价值生产。",
      image: IMAGES.jiangnanSericulture,
      imageAlt: "江南水乡蚕桑生产与市镇水运的教学复原图",
      imagePosition: "center",
      bullets: [
        "桑地提供蚕桑原料",
        "家庭与作坊承担多道工序",
        "河港和市镇汇集产品、订单与信息",
        "专业化依赖外部粮食与稳定运输"
      ],
      teachingCue:
        "让学生从画面指出土地、劳动、市镇和水路四种生产条件。",
      assistantCue:
        "不得写成江南全民改桑；只能说明部分地区和家庭专业化程度提高。",
      sourceIds: ["sass-yangtze-division"],
      accent: "teal",
      narrative: beat(
        "江南",
        "区域专业化",
        "evidence",
        "documented",
        24,
        "高价值生产为何会改变土地与劳动用途？",
        "晚明至清代",
        "史料"
      )
    }),
    page({
      index: 25,
      slideKey: "l1-silk-production-chain",
      section: "江南—湖广—海港",
      title: "一匹丝绸经过多少双手？",
      kicker: "生产链不是一间工厂",
      layout: "image",
      lead: "从桑叶到成品，价值在连续工序、专业技能和商贸协调中逐步形成。",
      image: IMAGES.silkWorkshop,
      imageAlt: "育蚕缫丝织造刺绣连续工序的教学复原图",
      imagePosition: "center",
      steps: [
        "植桑与采叶",
        "育蚕与结茧",
        "缫丝与整理",
        "织造与染整",
        "刺绣、检验与商贸"
      ],
      teachingCue:
        "沿工序追问每次交接需要的信息、质量标准和时间协调。",
      assistantCue:
        "图为综合教学复原，不代表单一作坊同时完成全部工序。",
      sourceIds: ["sass-yangtze-division"],
      accent: "amber",
      narrative: beat(
        "江南",
        "生产链展开",
        "concept",
        "documented",
        25,
        "分工增加了多少接口？",
        "晚明至清代",
        "史料"
      )
    }),
    page({
      index: 26,
      slideKey: "l1-cash-crop-transition",
      section: "江南—湖广—海港",
      title: "为什么稻田会让给经济作物？",
      kicker: "土地也在比较收益",
      layout: "comparison",
      lead: "当丝绸需求、技能与市场网络提高蚕桑收益，部分土地和劳动会从自给粮食转向经济作物。",
      columns: [
        {
          heading: "继续种粮",
          body: "本地粮食更安全，运输和市场依赖较低。",
          note: "收益相对稳定。"
        },
        {
          heading: "转向蚕桑",
          body: "单位土地可能获得更高货币收入，但要承担价格、技术和粮源风险。",
          note: "需要外部市场持续存在。"
        }
      ],
      bullets: [
        "选择来自相对收益而非单一命令",
        "地区内部不会整齐划一",
        "专业化越深，对粮食流入与运输可靠性越敏感"
      ],
      teachingCue:
        "讨论收益与风险，不使用“全民改桑”或把所有农户写成同一种选择。",
      assistantCue:
        "只描述部分地区的专业化趋势；土地转换受需求、生态、制度和家庭决策共同影响。",
      sourceIds: ["sass-yangtze-division"],
      accent: "amber",
      narrative: beat(
        "江南",
        "土地配置",
        "decision",
        "documented",
        26,
        "更高收益会带来哪些新依赖？",
        "晚明至清代",
        "史料"
      )
    }),
    page({
      index: 27,
      slideKey: "l1-grain-origin-question",
      section: "江南—湖广—海港",
      title: "专业化的另一面：粮从哪里来？",
      kicker: "丝绸链条背后的粮食问题",
      layout: "question",
      lead: "本地把更多资源投向高价值生产后，日常粮食需求并不会消失。",
      prompt: "要让江南专业化持续，哪一种能力与织造技术同样重要？",
      steps: [
        "有稳定余粮的生产区",
        "能汇集和分拨粮食的市场节点",
        "低成本的大批量内河运输",
        "可预期的季节与价格信息"
      ],
      teachingCue:
        "让学生从供应链反推专业化的前提，答案落到区域协作而非单地自足。",
      assistantCue:
        "江南粮食并非只来自湖广；本讲突出长江中游输入这一重要历史关系，不作唯一来源断言。",
      sourceIds: ["sass-yangtze-division"],
      accent: "navy",
      narrative: beat(
        "江南",
        "粮食约束",
        "decision",
        "documented",
        27,
        "高价值生产如何获得稳定粮源？",
        "18世纪",
        "史料"
      )
    }),
    page({
      index: 28,
      slideKey: "l1-dongting-hankou-grain",
      section: "江南—湖广—海港",
      title: "洞庭湖—汉口：粮食汇流",
      kicker: "长江中游形成供给节点",
      layout: "image",
      lead: "洞庭湖区及周边粮食经支流、湖泊与集镇汇入汉口，再进入长江干线市场。",
      image: IMAGES.dongtingGrainBarges,
      imageAlt: "洞庭湖区粮船汇集并装运粮食的教学复原图",
      imagePosition: "center",
      bullets: [
        "湖区和支流把分散余粮汇集起来",
        "汉口承担交易、仓储与转运",
        "粮船把区域产量转化为跨区域供给",
        "水位、季节和市场信息影响运输节奏"
      ],
      teachingCue:
        "按“产地—汇集—交易—转运”读图，不把汉口只讲成地名。",
      assistantCue:
        "本页是历史综合复原；不声称画面对应某次真实粮运事件。",
      sourceIds: ["sass-yangtze-division"],
      accent: "teal",
      narrative: beat(
        "洞庭湖—汉口",
        "粮食汇集",
        "evidence",
        "documented",
        28,
        "分散余粮怎样变成稳定货流？",
        "18世纪",
        "史料"
      )
    }),
    page({
      index: 29,
      slideKey: "l1-yangtze-inland-trade",
      section: "江南—湖广—海港",
      title: "沿长江向东：内河航运撑起分工",
      kicker: "距离不再等于阻断",
      layout: "image",
      lead: "粮食从湖广经汉口沿长江向下游流动，江南高价值生产因此能扩大而不必完全自给。",
      diagram: "jiangnan-huguang-trade",
      bullets: [
        "湖广：粮食生产与集散",
        "汉口：交易、仓储与转运节点",
        "长江：承担大批量、长距离移动",
        "江南：以外来粮食支撑更深专业化"
      ],
      teachingCue:
        "让学生沿箭头说完整因果链：没有低成本水运，比较优势无法跨越距离。",
      assistantCue:
        "线路是区域分工示意，不代表粮食只沿单一路径或江南粮源全部来自湖广。",
      sourceIds: ["sass-yangtze-division"],
      accent: "teal",
      narrative: beat(
        "湖广—汉口—江南",
        "内河运输",
        "consequence",
        "documented",
        29,
        "水运怎样扩大比较优势的地理范围？",
        "18世纪",
        "路线示意"
      )
    }),
    page({
      index: 30,
      slideKey: "l1-historical-composite-chain",
      section: "江南—湖广—海港",
      title: "历史综合链：粮食—丝绸—海港—英国",
      kicker: "四段证据，不是一批货物的追踪纪录",
      layout: "summary",
      lead: "区域分工、内河粮运、中国丝织生产与英国对华贸易共同构成一条可解释的历史综合链。",
      diagram: "historical-trade-chain",
      columns: [
        {
          heading: "湖广粮食",
          body: "经汉口与长江进入下游市场。",
          note: "区域分工史料"
        },
        {
          heading: "江南丝织",
          body: "专业化生产依赖外部粮食与市场。",
          note: "区域经济史料"
        },
        {
          heading: "中国海港",
          body: "把内陆商品连接到远洋贸易。",
          note: "机制与路线复原"
        },
        {
          heading: "英国市场",
          body: "公司船队采购中国丝织品并组织销售。",
          note: "英国贸易档案"
        }
      ],
      teachingCue:
        "逐段指出证据类型，明确这是一条解释链，不是一只可从洞庭追踪到伦敦的箱子。",
      assistantCue:
        "严禁声称某批明代江苏刺绣已被完整追踪至英国；各段证据时期和对象不同。",
      sourceIds: ["sass-yangtze-division", "bl-canton-1727"],
      accent: "navy",
      narrative: beat(
        "湖广—江南—中国海港—伦敦",
        "综合链形成",
        "transition",
        "documented",
        30,
        "什么力量把四段分工连接成跨洲网络？",
        "晚明至18世纪",
        "路线示意"
      )
    }),
    page({
      index: 31,
      slideKey: "l1-water-distance",
      section: "英国如何放大贸易",
      title: "水运让分工跨越更长距离",
      kicker: "运输成本决定市场半径",
      layout: "sequence",
      lead: "比较优势只创造潜在交换；只有运输成本低于分工收益，货流才会真正发生。",
      steps: [
        "浮力承担货物重量，单位载荷所需支撑结构较低",
        "船舶一次移动大批量货物，摊薄船员与航行固定成本",
        "河流与海洋提供连续通道，减少逐段换装",
        "稳定航线让仓储、船期和市场形成重复连接"
      ],
      prompt: "如果每一石粮的运费都高于地区价差，专业化还会发生吗？",
      teachingCue:
        "把内河粮运与跨洋丝绸运输并置，说明距离成本是分工能否兑现的门槛。",
      assistantCue:
        "水运便宜是相对机制判断；两端集疏运、换装、时间和风险成本仍存在。",
      sourceIds: ["sass-yangtze-division", "mot-water-logistics"],
      accent: "teal",
      narrative: beat(
        "长江与海洋",
        "运输机制",
        "concept",
        "concept",
        31,
        "比较优势能跨越多远？",
        "历史机制"
      )
    }),
    page({
      index: 32,
      slideKey: "l1-network-position",
      section: "英国如何放大贸易",
      title: "英国选择的不是一种货物，而是网络位置",
      kicker: "从商品优势到组织优势",
      layout: "image",
      lead: "船队可以换货物，港口可以换市场；更持久的能力是持续组织航线、信用、信息与保护。",
      image: IMAGES.oceanConvoy,
      imageAlt: "远洋商船与护航帆船共同航行的教学复原图",
      imagePosition: "center",
      columns: [
        {
          heading: "商品会变化",
          body: "丝绸、茶叶、棉布、瓷器与工业品在不同时期更替。"
        },
        {
          heading: "网络可积累",
          body: "港口、商人、账簿、信用、船队与国家能力可以反复使用。"
        }
      ],
      teachingCue:
        "用“货物可换、网络可积累”作为后续五页的总领句。",
      assistantCue:
        "不得把英国网络能力浪漫化；其扩张同时依赖垄断、战争与殖民强制。",
      sourceIds: ["bl-eic-china-trade", "uk-naval-trade"],
      accent: "navy",
      narrative: beat(
        "远洋航线",
        "网络组织",
        "transition",
        "documented",
        32,
        "哪些能力可以跨越不同商品周期？",
        "17—18世纪",
        "史料"
      )
    }),
    page({
      index: 33,
      slideKey: "l1-port-books",
      section: "英国如何放大贸易",
      title: "港口账簿：网络首先必须可记录",
      kicker: "货流成为数据",
      layout: "image",
      lead: "船名、货物、数量、来源与去向被持续记录，贸易才可能被征税、结算、保险与治理。",
      image: IMAGES.britishPortBooks,
      imageAlt: "英国港口账簿与货物查验的教学复原图",
      imagePosition: "center",
      bullets: [
        "记录让分散交易变得可见",
        "标准字段支持核验与追责",
        "长期账簿沉淀市场与风险信息",
        "港口由岸线转变为制度接口"
      ],
      teachingCue:
        "从现代系统字段反推历史账簿价值，但不把历史记录等同于实时数字平台。",
      assistantCue:
        "英国Port Books记录范围和保存状况并不完整；本页说明制度功能，不宣称数据全覆盖。",
      sourceIds: ["uk-port-books"],
      accent: "amber",
      narrative: beat(
        "英国港口",
        "记录货流",
        "evidence",
        "documented",
        33,
        "看不见的货流如何被管理？",
        "1565—1799年",
        "史料"
      )
    }),
    page({
      index: 34,
      slideKey: "l1-finance",
      section: "英国如何放大贸易",
      title: "信用与股份：未来货流变成今天的资本",
      kicker: "时间被金融重新组织",
      layout: "image",
      lead: "远航耗时漫长、风险集中；股份、信贷、保险与票据把一次航行的成本和风险分散到更大网络。",
      image: IMAGES.londonFinance,
      imageAlt: "伦敦商人围绕航运账簿和信用交易的教学复原图",
      imagePosition: "center",
      bullets: [
        "先筹资，后造船、采购与远航",
        "把风险分散给多个投资者与承保者",
        "用信用衔接采购、在途与销售周期",
        "成功航次反过来扩大下一轮资本"
      ],
      teachingCue:
        "画出“未来货流—今日资本—下一轮航次”闭环，避免变成金融名词罗列。",
      assistantCue:
        "金融是放大贸易的机制之一，不等同于低风险；早期公司和市场仍有巨大失败与投机风险。",
      sourceIds: ["boe-london"],
      accent: "navy",
      narrative: beat(
        "伦敦",
        "组织资本",
        "consequence",
        "documented",
        34,
        "一趟尚未返航的货物，如何支持今天的投入？",
        "17—18世纪",
        "史料"
      )
    }),
    page({
      index: 35,
      slideKey: "l1-navy-state",
      section: "英国如何放大贸易",
      title: "舰队与国家：保护、竞争与战争",
      kicker: "商业航线从来不在真空中",
      layout: "comparison",
      lead: "国家权力既提供护航、规则与港口秩序，也通过战争和竞争重塑航线与市场。",
      image: IMAGES.navalTradeTension,
      imageAlt: "18世纪商船护航与远方海上冲突并存的教学复原图",
      imagePosition: "center",
      columns: [
        {
          heading: "保护与秩序",
          body: "护航、反海盗、港口执法和海事规则降低部分交易风险。",
          note: "提高可预期性。"
        },
        {
          heading: "竞争与战争",
          body: "封锁、私掠、海战与殖民争夺把商业网络变成国家冲突空间。",
          note: "风险与暴力同步扩大。"
        }
      ],
      prompt: "国家能力降低了谁的风险，又把成本转移给了谁？",
      teachingCue:
        "同时呈现公共品与暴力两面，不将护航画面讲成单向英雄叙事。",
      assistantCue:
        "海军作用必须同时包括保护、竞争和战争；不得将国家暴力从贸易扩张中剥离。",
      sourceIds: ["uk-naval-trade"],
      accent: "coral",
      narrative: beat(
        "远洋航线",
        "国家介入",
        "concept",
        "documented",
        35,
        "商业安全与国家暴力为何同时出现？",
        "17—18世纪",
        "史料"
      )
    }),
    page({
      index: 36,
      slideKey: "l1-company-empire",
      section: "英国如何放大贸易",
      title: "公司帝国：垄断与强制进入贸易链",
      kicker: "影响力的代价",
      layout: "statement",
      lead: "特许公司不仅撮合自愿交换，也凭借垄断、政治权力与军事力量改变谁能交易、以何种条件交易。",
      bullets: [
        "特许排除竞争者并集中商业权力",
        "殖民统治改变土地、税收与生产关系",
        "强制劳动与奴隶贸易造成持续伤害",
        "贸易总量增长不能冲销权利与分配问题"
      ],
      prompt: "一种高效网络，是否可能同时是不公正的网络？",
      teachingCue:
        "把比较优势模型和真实帝国权力重新区分，要求学生回答效率与正当性是两条评价轴。",
      assistantCue:
        "必须明确殖民暴力和强制贸易，不得用连接、效率或现代化叙事淡化伤害。",
      sourceIds: ["uk-eic-charter", "uk-slave-trade"],
      accent: "coral",
      narrative: beat(
        "殖民贸易网络",
        "权力扩张",
        "consequence",
        "documented",
        36,
        "效率、权力与公平如何同时评价？",
        "17—19世纪",
        "史料"
      )
    }),
    page({
      index: 37,
      slideKey: "l1-industry-port-loop",
      section: "英国如何放大贸易",
      title: "工业革命是放大器，不是唯一起点",
      kicker: "生产与贸易相互强化",
      layout: "sequence",
      lead: "海外市场、港口与资本并未自动制造工业革命，但工业化又进一步扩大产量、船舶能力与全球货流。",
      image: IMAGES.industrialPortSteam,
      imageAlt: "蒸汽时代港口、铁路、仓库与工业区相互连接的教学复原图",
      imagePosition: "center",
      steps: [
        "既有商业网络连接原料、市场与资本",
        "工业化提高部分商品的生产率与规模",
        "蒸汽动力和造船技术降低运输约束",
        "更大货流反过来推动港口、金融与国家能力"
      ],
      prompt: "这是单向因果，还是相互强化的循环？",
      teachingCue:
        "强调多因素互动，不把海上贸易写成工业革命的唯一原因，也不把工业革命写成无前史突变。",
      assistantCue:
        "只能称相互强化；英国工业革命原因复杂，包括能源、技术、制度、劳动力和市场等。",
      sourceIds: ["rmg-steam", "uk-georgian"],
      accent: "teal",
      narrative: beat(
        "英国港口与工业区",
        "工业放大",
        "consequence",
        "documented",
        37,
        "贸易网络和工业化怎样彼此放大？",
        "18—19世纪",
        "史料"
      )
    }),
    page({
      index: 38,
      slideKey: "l1-population-not-limit",
      section: "英国如何放大贸易",
      title: "答案：人口不是影响力的上限",
      kicker: "回到1700年的赌局",
      layout: "summary",
      lead: "英格兰没有靠单一优势胜出，而是把海运、港口、商业、金融、国家能力、殖民强制与工业化组合成可扩张系统。",
      columns: [
        {
          heading: "组织货流",
          body: "连接远方产地、消费市场与重复航线。"
        },
        {
          heading: "组织资本",
          body: "用信用、股份与保险跨越漫长周转。"
        },
        {
          heading: "组织权力",
          body: "国家与公司共同保护、垄断并强制扩张。"
        },
        {
          heading: "组织生产",
          body: "工业化把网络市场转化为更大供给能力。"
        }
      ],
      prompt: "法国仍是强国；真正变化的是英国把有限国内规模放大为跨洲网络的能力。",
      teachingCue:
        "重新投票并要求学生用至少三项机制解释，不接受“岛国所以必然强大”的单因答案。",
      assistantCue:
        "结论必须是多因素系统能力；法国不是失败者，海上贸易也不是英国崛起的唯一原因。",
      sourceIds: [
        "population-europe-1700",
        "bl-eic-china-trade",
        "boe-london",
        "uk-slave-trade",
        "rmg-steam"
      ],
      accent: "navy",
      narrative: beat(
        "英吉利海峡—全球网络",
        "历史收束",
        "consequence",
        "concept",
        38,
        "有限人口如何被系统能力放大？",
        "1700年以后"
      )
    }),
    page({
      index: 39,
      slideKey: "l1-modern-mirror",
      section: "现代镜像与港口结论",
      title: "2023上海：同一个问题，换了一艘船",
      kicker: "从帆船回到集装箱时代",
      layout: "cover",
      lead: "OOCL Spain等待离港：今天的影响力，仍取决于能否低成本、稳定地组织跨洲货流。",
      image: IMAGES.shanghaiDawn,
      imageAlt: "清晨大型集装箱船在上海港等待离港的教学复原图",
      imagePosition: "center",
      bullets: [
        "货物变了，分工与交换仍然存在",
        "船舶变大，单位距离成本继续下降",
        "网络更复杂，港口接口反而更加关键"
      ],
      teachingCue:
        "用画面完成400年转场，把历史机制映射到现代巨轮而不是另起新课。",
      assistantCue:
        "图为教学复原；OOCL Spain参数与LL3港序来自官方历史资料。",
      sourceIds: ["oocl-spain-release", "oocl-spain-vessel"],
      accent: "blue",
      narrative: beat(
        "上海",
        "现代镜像",
        "transition",
        "documented",
        39,
        "现代海运如何进一步压低距离成本？",
        "2023年3月",
        "官方资料"
      )
    }),
    page({
      index: 40,
      slideKey: "l1-scale-economies",
      section: "现代镜像与港口结论",
      title: "24,188 TEU：批量如何降低单位成本",
      kicker: "船舶尺度改变成本结构",
      layout: "stat",
      lead: "设计箱位不是实际装载量，却显示一艘船可以把巨量货物放进同一航次。",
      image: IMAGES.megashipScale,
      imageAlt: "超大型集装箱船尺度与集装箱容量的教学复原图",
      imagePosition: "center",
      stat: {
        value: "24,188 TEU",
        label: "OOCL Spain设计箱位",
        detail: "船长399.99米、型宽61.3米；实际装载受货量、配载与安全约束。"
      },
      bullets: [
        "船员、航行与设备成本被更多箱位分摊",
        "大批量需要稳定货源与较高装载率",
        "规模经济在海上形成，必须在港口兑现"
      ],
      teachingCue:
        "把设计箱位与实际装载分开，要求学生说出大船低成本成立的条件。",
      assistantCue:
        "24,188 TEU是设计容量，不得表述为每个航次实际满载数量。",
      sourceIds: ["oocl-spain-vessel", "itf-mega-ships"],
      accent: "navy",
      narrative: beat(
        "上海港",
        "船舶规模",
        "evidence",
        "documented",
        40,
        "更大的船为什么不自动等于更低的全程成本？",
        "2023年",
        "官方资料"
      )
    }),
    page({
      index: 41,
      slideKey: "l1-water-cost-mechanisms",
      section: "现代镜像与港口结论",
      title: "水运为什么便宜",
      kicker: "五个机制共同作用",
      layout: "sequence",
      lead: "水运不是“没有成本”，而是把每吨货物跨越一公里所需的资源压得很低。",
      image: IMAGES.waterCostCutaway,
      imageAlt: "现代集装箱船水上与水下船体、螺旋桨及港口接口的教学复原图",
      imagePosition: "center",
      columns: [
        {
          heading: "浮力承载",
          body: "水体承担重量，船舶可承载巨大货量。"
        },
        {
          heading: "低速航行",
          body: "IMO示例：航速下降10%，推进功率需求约下降27%，整航程燃料节约约19%。"
        },
        {
          heading: "批量运输",
          body: "一次移动大量货物，形成密度经济。"
        },
        {
          heading: "固定成本分摊",
          body: "船员、设备和航行成本分散到更多吨位或箱位。"
        },
        {
          heading: "标准化网络",
          body: "集装箱、班期与港口接口减少重复处理。"
        }
      ],
      prompt: "低单位海运成本，需要货量、装载率和港口效率满足什么条件？",
      teachingCue:
        "把五种机制连成因果链，不把“水免费”当解释。",
      assistantCue:
        "慢也是节能机制之一，但会增加周转时间；低海上成本不等于低门到门成本。",
      sourceIds: ["imo-speed-management", "itf-mega-ships"],
      accent: "teal",
      narrative: beat(
        "远洋航行",
        "成本机制",
        "concept",
        "concept",
        41,
        "为什么海运能把距离变得如此便宜？",
        "现代海运"
      )
    }),
    page({
      index: 42,
      slideKey: "l1-four-modes",
      section: "现代镜像与港口结论",
      title: "17.25%与55.65%，以及1∶2∶6",
      kicker: "两个尺度看水运成本",
      layout: "stat",
      lead: "较小的货运量占比承担了更大的周转量，说明水运尤其擅长搬运大批量货物跨越长距离。",
      stat: {
        value: "17.25% → 55.65%",
        label: "水运货运量占比 → 货物周转量占比",
        detail: "货物周转量同时计入重量与运输距离。"
      },
      bullets: [
        "全国口径：水运以17.25%货运量完成55.65%货物周转量",
        "区域测算：重庆—上海集装箱单位运价约为水路∶铁路∶公路＝1∶2∶6",
        "两组数据口径不同，却共同显示水运对大批量、长距离货流的成本优势"
      ],
      teachingCue:
        "先解释货运量与周转量差别，再读区域运价比；明确两组数字不能直接相除。",
      assistantCue:
        "1∶2∶6是特定区域测算，不是全国统一报价；17.25%与55.65%按交通运输部资料口径回答。",
      sourceIds: ["mot-water-logistics", "yunnan-multimodal"],
      accent: "teal",
      narrative: beat(
        "中国水运网络",
        "规模证据",
        "evidence",
        "documented",
        42,
        "货运量占比不高，为何周转量占比过半？",
        "现代统计",
        "官方资料"
      )
    }),
    page({
      index: 43,
      slideKey: "l1-maritime-share",
      section: "现代镜像与港口结论",
      title: "超过80%货量，约70%价值",
      kicker: "全球贸易的运输底座",
      layout: "stat",
      lead: "海运承担全球国际贸易中绝大多数货物重量，也承载约七成贸易价值。",
      stat: {
        value: ">80% / ≈70%",
        label: "国际贸易货量 / 贸易价值",
        detail: "重量与价值是两个口径：重货更依赖海运，高价值急件可能选择其他方式。"
      },
      bullets: [
        "货量口径回答“搬了多少重量”",
        "价值口径回答“承载多少贸易价值”",
        "海运不是所有货物的唯一选择，却是全球分工的主体通道"
      ],
      teachingCue:
        "要求学生先说口径再引用数字，避免把八成写成贸易价值。",
      assistantCue:
        "必须使用超过80%货量、约70%价值的区分，不得混用。",
      sourceIds: ["unctad-maritime-share"],
      accent: "blue",
      narrative: beat(
        "全球海运网络",
        "全球规模",
        "evidence",
        "documented",
        43,
        "如此多货物为何愿意接受更慢的运输？",
        "现代国际贸易",
        "官方资料"
      )
    }),
    page({
      index: 44,
      slideKey: "l1-time-has-price",
      section: "现代镜像与港口结论",
      title: "慢但稳定，可以写进生产计划",
      kicker: "平均时间与时间波动",
      layout: "case",
      lead: "可预测的慢主要增加在途库存；不可预测的波动才更容易造成缺料、安全库存与停线。",
      table: {
        headers: ["教学路线", "平均提前期", "波动", "计划含义"],
        rows: [
          ["A", "30天", "±1天", "可提前排产，所需缓冲较小"],
          ["B", "18天", "±8天", "均值更快，但到货窗口更难承诺"]
        ]
      },
      bullets: [
        "稳定平均时长可通过提前下单和生产排班吸收",
        "更长周转仍占用库存、资金并增加暴露时间",
        "需求可预测、货物耐储且非紧急时更适合海运"
      ],
      prompt: "若工厂最怕停线，A与B哪条路线更容易进入月度生产计划？",
      teachingCue:
        "先让学生选路线，再区分平均提前期和波动；不得把稳定地慢说成零成本。",
      assistantCue:
        "30±1与18±8全部是教学情境，不代表真实航线；结论只适用于可预测、耐储、非紧急货物。",
      accent: "amber",
      narrative: beat(
        "供应链计划室",
        "可靠性决策",
        "decision",
        "scenario",
        44,
        "工厂更怕平均时间长，还是到货时间不可预测？",
        "两条教学路线",
        "教学情境"
      )
    }),
    page({
      index: 45,
      slideKey: "l1-port-interface",
      section: "现代镜像与港口结论",
      title: "港口：全链条降本的兑现接口",
      kicker: "海上规模经济必须在岸上落地",
      layout: "summary",
      lead: "大船只降低海上单位成本；港口决定货物能否低等待、低差错地进入腹地与下一段运输。",
      diagram: "port-interface",
      bullets: [
        "聚集足够货量",
        "衔接船期与泊位",
        "完成换装与监管",
        "连接腹地运输",
        "同步责任与信息"
      ],
      prompt: "哪一个接口失效，会让海上节省的成本最快被等待重新吃掉？",
      teachingCue:
        "沿实体流与信息流讲五个接口，用等待、错配和换装说明全程成本。",
      assistantCue:
        "港口是规模经济兑现接口，不等于所有港口都能自动降低成本；拥堵会抵消海上节省。",
      sourceIds: ["itf-mega-ships", "worldbank-port"],
      accent: "teal",
      narrative: beat(
        "港口接口",
        "全链条兑现",
        "consequence",
        "concept",
        45,
        "海上低成本如何穿过港口进入供应链？",
        "现代港口"
      )
    }),
    page({
      index: 46,
      slideKey: "l1-departure-cliffhanger",
      section: "现代镜像与港口结论",
      title: "离港决策：低成本如何变成可重复能力？",
      kicker: "第一讲 · 最后一项判断",
      layout: "cover",
      lead: "海运把公里变便宜；港口、班期与信息让这份便宜能够一次次兑现。",
      image: IMAGES.departureNight,
      imageAlt: "大型集装箱船夜间离开港口的教学复原图",
      imagePosition: "center",
      table: {
        headers: ["启航检查", "判断问题"],
        rows: [
          ["货流", "是否有足够、稳定的货源支撑装载？"],
          ["船期", "平均时长与波动能否写入生产计划？"],
          ["港口", "泊位、堆场、换装和腹地接口是否匹配？"],
          ["应急", "延误发生时是否有缓冲与替代路径？"]
        ]
      },
      prompt: "船可以离港了。下一问：它为什么必须走这条路？",
      teachingCue:
        "让学生用四项检查表做最终Go/No-go判断，以路线选择自然进入第二讲。",
      assistantCue:
        "启航判断为课程总结，不代表OOCL Spain真实运营审批或实时状态。",
      sourceIds: ["oocl-spain-release", "itf-mega-ships"],
      accent: "blue",
      narrative: beat(
        "上海",
        "批准离港",
        "transition",
        "scenario",
        46,
        "同样低成本的船，为什么必须选择特定航线？",
        "第一讲结束",
        "教学情境"
      )
    })
  ];
