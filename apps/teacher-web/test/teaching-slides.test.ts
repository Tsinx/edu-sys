import assert from "node:assert/strict";
import test from "node:test";
import {
  getPortManagementSlideByKey,
  getPortManagementSlide,
  PORT_MANAGEMENT_DECK_VERSION,
  PORT_MANAGEMENT_SLIDES
} from "@edu/course-content";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_LOGICAL_HEIGHT,
  SLIDE_LOGICAL_WIDTH,
  type SlideFrame
} from "@edu/contracts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AUTHORED_TEACHING_SLIDE_KEYS,
  PILOT_AUTHORED_TEACHING_SLIDE_KEYS
} from "../src/features/classroom/AuthoredTeachingSlides.js";
import { SlideStage } from "../src/features/classroom/TeachingSlides.js";

function renderSlide(index: number): string {
  const slide = getPortManagementSlide(index);
  const frame: SlideFrame = {
    deckId: "port-management",
    versionId: PORT_MANAGEMENT_DECK_VERSION,
    slideId: slide.slideKey,
    index: slide.index,
    total: PORT_MANAGEMENT_SLIDES.length,
    logicalWidth: SLIDE_LOGICAL_WIDTH,
    logicalHeight: SLIDE_LOGICAL_HEIGHT,
    aspectRatio: SLIDE_ASPECT_RATIO,
    title: slide.title,
    lessonNumber: slide.lesson,
    lessonTitle: slide.lessonTitle,
    section: slide.section,
    summary: slide.lead ?? slide.title
  };
  return renderToStaticMarkup(createElement(SlideStage, { frame }));
}

test("shared slide markup never exposes teacher-only metadata", () => {
  for (const slide of PORT_MANAGEMENT_SLIDES) {
    const markup = renderSlide(slide.index);
    assert.doesNotMatch(markup, /data-teaching-cue/u);
    assert.doesNotMatch(markup, /data-evidence-status/u);
    assert.doesNotMatch(markup, /data-slide-(?:key|composition)/u);
    assert.doesNotMatch(markup, /未决：/u);
    assert.equal(
      markup.includes(slide.teachingCue),
      false,
      `${slide.slideKey} exposed its teaching cue`
    );
    if (slide.assistantCue) {
      assert.equal(
        markup.includes(slide.assistantCue),
        false,
        `${slide.slideKey} exposed its assistant cue`
      );
    }
    if (slide.narrative.openQuestion) {
      assert.equal(
        markup.includes(slide.narrative.openQuestion),
        false,
        `${slide.slideKey} exposed its open question`
      );
    }
  }
});

test("student context strip renders only public time-and-place labels", () => {
  const history = renderSlide(2);
  assert.match(history, /1700：如果只能押一个国家/u);
  assert.match(history, /英吉利海峡/u);
  assert.match(history, /约1700年/u);
  assert.match(history, /史料/u);
  assert.doesNotMatch(history, /校正问题|证据链|课程组手工编排/u);

  const route = renderSlide(11);
  assert.match(route, /路线示意/u);
  assert.doesNotMatch(route, /事实边界|非实时信息/u);

  const scenario = renderSlide(45);
  assert.match(scenario, /教学情境/u);
  assert.match(scenario, /慢但稳定，可以写进生产计划/u);
  assert.doesNotMatch(scenario, /目标不是猜新闻/u);
});

test("source footer describes evidence without exposing production tooling", () => {
  const sourcedImage = renderSlide(5);
  assert.match(sourcedImage, /来源：/u);
  assert.match(sourcedImage, /教学复原图/u);
  assert.doesNotMatch(sourcedImage, /OpenAI ImageGen/u);

  const unsourcedConcept = renderSlide(14);
  assert.doesNotMatch(unsourcedConcept, /课程组手工编排/u);
});

test("every visible slide counter uses lesson-local numbering", () => {
  const formalCover = renderSlide(1);
  assert.match(formalCover, /港口管理概论/u);
  assert.match(formalCover, /李行之/u);
  assert.match(formalCover, /重庆交通大学/u);
  assert.doesNotMatch(formalCover, /\/119/u);

  const lessonStarts = [
    [2, "02 / 47", "2/47"],
    [48, "01 / 36", "1/36"],
    [84, "01 / 36", "1/36"]
  ] as const;
  for (const [index, coverCounter, footerCounter] of lessonStarts) {
    const markup = renderSlide(index);
    assert.match(markup, new RegExp(coverCounter.replace("/", "\\/"), "u"));
    assert.match(markup, new RegExp(`港口管理概论 · ${footerCounter.replace("/", "\\/")}`, "u"));
    assert.doesNotMatch(markup, /\/119/u);
  }

  assert.match(renderSlide(47), /港口管理概论 · 47\/47/u);
  for (const index of [83, 119]) {
    const markup = renderSlide(index);
    assert.match(markup, /港口管理概论 · 36\/36/u);
    assert.doesNotMatch(markup, /\/119/u);
  }
});

test("the manually refined slides use authored compositions instead of web-card templates", () => {
  assert.equal(PILOT_AUTHORED_TEACHING_SLIDE_KEYS.length, 119);
  for (const slideKey of PILOT_AUTHORED_TEACHING_SLIDE_KEYS) {
    const slide = getPortManagementSlideByKey(slideKey);
    assert.ok(slide, `missing authored slide ${slideKey}`);
    const markup = renderSlide(slide.index);
    assert.match(markup, /class="[^"]*\bauthored-slide\b/u);
    assert.doesNotMatch(markup, /data-slide-composition=/u);
    assert.doesNotMatch(
      markup,
      /course-slide__(?:columns|stat|steps|table|bullets)/u,
      `${slideKey} fell back to a standard web-card primitive`
    );
    assert.doesNotMatch(
      markup,
      /class="[^"]*\beditorial-slide\b/u,
      `${slideKey} fell back to a generic editorial template`
    );
    assert.doesNotMatch(
      markup,
      /data-slide-composition="editorial-/u,
      `${slideKey} exposed a generic editorial composition`
    );
    assert.equal(markup.includes(slide.title), true);
  }

});

test("authored compositions retain the teaching evidence needed on screen", () => {
  const expectedCopy: Record<
    (typeof PILOT_AUTHORED_TEACHING_SLIDE_KEYS)[number],
    readonly string[]
  > = {
    "l1-course-cover": [
      "PORT MANAGEMENT",
      "港口管理概论",
      "第一讲 · 英国如何把贸易变成影响力？",
      "李行之",
      "重庆交通大学",
      "从一件丝织品，到全球航运网络"
    ],
    "l1-1700-wager": ["英格兰", "法国", "人口较少", "欧洲强国"],
    "l1-population-gap": [
      "约500万",
      "约2000万",
      "×4",
      "人口提供能力"
    ],
    "l1-france-england-scale": ["英格兰", "法国", "英吉利海峡"],
    "l1-silk-in-london": [
      "伦敦不产丝绸",
      "可记录、可融资、可储存",
      "持续流通"
    ],
    "l1-output-vs-influence": [
      "有限人口",
      "全球影响力",
      "连接更多产地与市场",
      "稳定履约",
      "金融与国家能力"
    ],
    "l1-eic-charter": ["1600", "王室特许", "筹资", "签约", "船队", "持续经营", "权力代价"],
    "l1-china-direct-trade": ["1600", "约1680", "1715后", "网络记忆"],
    "l1-canton-1727-manifest": ["10,200", "织造丝绸", "多品类采购", "结算"],
    "l1-value-density": ["低货值密度", "高货值密度", "货值 ÷ 重量", "风险也越集中"],
    "l1-canton-london-route": ["广州", "马六甲", "印度洋", "好望角", "伦敦", "不代表单船逐日轨迹"],
    "l1-london-redistribution": ["查验", "拍卖", "消费", "再出口"],
    "l1-connects-not-makes": ["产地", "港口", "船舶", "账簿", "资本", "市场", "连接", "再次调用"],
    "l1-double-absolute-advantage": ["都更快", "\\?=", "全部自己做", "100个劳动日"],
    "l1-absolute-vs-comparative": ["绝对优势", "比较优势", "100", "时间不能同时花两次"],
    "l1-jiangnan-huguang-model": ["100 个劳动日", "江南型", "湖广型", "绝对优势"],
    "l1-half-time-output": ["50", "60匹丝", "150石粮", "200"],
    "l1-opportunity-cost-table": ["1匹丝", "2石粮", "5石粮", "比较的是放弃量"],
    "l1-reallocation-output": ["60", "150", "70", "160", "10匹丝", "10石粮"],
    "l1-exchange-range": ["江南型机会成本", "2 ＜ P ＜ 5", "湖广型机会成本", "双方可能留在交易中", "分配公平"],
    "l1-production-possibility-frontier": ["200", "60，150", "70，160", "沿边界移动", "消费组合"],
    "l1-opportunity-cost-activity": ["≥ 70匹丝", "江南型", "湖广型", "劳动日分配"],
    "l1-trade-model-boundary": ["MODEL", "正当化", "模型能解释", "模型不能替代", "每个人受益"],
    "l1-regional-division-timeline": ["晚明", "明清之际", "18世纪", "长江区域", "远洋网络"],
    "l1-jiangnan-specialization": ["桑地", "家庭与作坊", "河港和市镇", "外部粮食", "土地 × 家庭 × 市镇 × 水路"],
    "l1-silk-production-chain": ["植桑与采叶", "育蚕与结茧", "缫丝与整理", "织造与染整", "刺绣、检验与商贸", "质量、数量与时间信息"],
    "l1-cash-crop-transition": ["继续种粮", "转向蚕桑", "相对收益", "粮源安全", "市场收入"],
    "l1-grain-origin-question": ["丝绸生产", "粮食消失", "稳定余粮", "市场节点", "内河运输", "季节与价格信息"],
    "l1-dongting-hankou-grain": ["分散余粮", "汉口", "跨区域供给", "水位、季节和市场信息"],
    "l1-yangtze-inland-trade": ["洞庭湖区", "汉口", "江南", "海港", "大批量、长距离", "不表示唯一粮源"],
    "l1-historical-composite-chain": ["湖广粮食", "江南丝织", "中国海港", "英国市场", "四段证据", "同一批货物"],
    "l1-water-distance": ["分工收益", "运输成本", "湖广", "江南", "海港"],
    "l1-network-position": ["商品会变化", "会换", "网络可积累", "会留下", "港口 · 商人 · 账簿 · 信用 · 船队 · 保护"],
    "l1-port-books": ["船名", "货物", "数量", "来源", "去向", "记录让分散交易变得可见", "制度接口"],
    "l1-finance": ["今天", "筹资投入", "股份 · 信贷 · 保险 · 票据", "未来", "货流与销售", "下一轮资本"],
    "l1-navy-state": ["保护与秩序", "竞争与战争", "国家能力降低了谁的风险"],
    "l1-company-empire": ["高效网络", "正当网络", "特许排除竞争者", "殖民统治", "强制劳动与奴隶贸易", "权利与分配"],
    "l1-industry-port-loop": ["既有网络", "工业化", "蒸汽与造船", "更大货流"],
    "l1-population-not-limit": ["有限国内规模", "可扩张网络", "跨洲影响力", "组织货流", "组织资本", "组织权力", "组织生产", "法国仍是强国"],
    "l1-modern-mirror": ["帆船时代", "2023", "集装箱时代", "货物变了", "船舶变大", "港口接口反而更加关键"],
    "l1-scale-economies": ["24,188 TEU", "设计箱位", "实际装载量", "稳定货源", "较高装载率", "必须在港口兑现"],
    "l1-water-cost-mechanisms": ["浮力承载", "低速航行", "批量运输", "固定成本分摊", "标准化网络"],
    "l1-four-modes": ["17.25%", "55.65%", "水路", "铁路", "公路", "区域测算"],
    "l1-maritime-share": ["国际贸易货量", "&gt;80%", "国际贸易价值", "≈70%", "搬了多少重量", "承载多少贸易价值", "主体通道"],
    "l1-time-has-price": ["路线 A", "30天", "±1天", "路线 B", "18天", "±8天", "月度生产计划"],
    "l1-port-interface": ["聚集足够货量", "换装与监管", "衔接船期与泊位", "连接腹地运输", "同步责任与信息"],
    "l1-departure-cliffhanger": ["货流", "稳定的货源", "船期", "写入生产计划", "港口", "腹地接口", "应急", "替代路径", "它为什么必须走这条路"],
    "l2-cover": ["市场", "港口", "通道", "时间承诺", "可以反复兑现的选择"],
    "l2-log-restored": ["上海", "厦门", "南沙", "香港", "盐田", "盖梅", "新加坡", "非实时 AIS"],
    "l2-explain-every-choice": ["走廊", "咽喉", "节点", "腹地"],
    "l2-port-rotation": ["84", "东亚货源港群", "比雷埃夫斯", "服务回路"],
    "l2-corridor-not-line": ["腹地与节点", "市场与班期", "多条具体航线", "长期维持"],
    "l2-cargo-consolidation": ["制造基地形成货源", "多个挂港持续集货", "远洋段兑现规模经济"],
    "l2-feeder-mainline": ["支线", "干线", "衔接窗口", "两张时刻表"],
    "l2-hub-vs-gateway": ["枢纽港", "门户港", "海向网络", "陆向网络"],
    "l2-singapore": ["SGSIN", "多航线交汇", "高频转运连接", "港航与海事服务集聚", "可接续性"],
    "l2-transshipment": ["卸下干线箱", "中转堆场", "舱位与装船计划", "重新匹配"],
    "l2-liner-network": ["航线层", "节点层", "腹地层", "供货 → 聚散 → 循环", "港序只记录船靠过哪里"],
    "l2-route-classifications": ["同一海运网络", "按市场", "按货类", "按尺度", "研究对象", "分类口径", "唯一固定标准"],
    "l2-malacca": ["高密度交通", "有限水域", "马六甲", "影响扩散到更大网络", "远大于地图上最窄"],
    "l2-indian-ocean": ["马六甲", "印度洋", "苏伊士", "航行计划具有连续性"],
    "l2-suez": ["压缩航程", "集中依赖", "同一服务系统", "网络事件"],
    "l2-why-chokepoint": ["航线在此收敛", "替代路线", "形成排队", "向后传播"],
    "l2-canal-service-system": ["抵达与申报", "等待编队", "引航与交通组织", "受控通过"],
    "l2-capacity-order-safety": ["物理容量", "运行秩序", "安全边界", "信息质量"],
    "l2-risk-propagation": ["通道等待", "船期偏移", "后续泊位冲突", "箱子错过中转", "库存与交付承压", "影响范围持续扩大"],
    "l2-chokepoint-chain": ["局部容量", "等待形成", "网络连接", "冲击扩散", "信息与替代性", "恢复分化", "港口窗口 · 中转关系 · 腹地库存"],
    "l2-reconstructed-route": ["官方港序", "上海 · 厦门 · 南沙 · 香港 · 盐田 · 盖梅 · 新加坡", "比雷埃夫斯 · 汉堡 · 鹿特丹 · 泽布吕赫 · 瓦伦西亚", "84 天", "路线示意 · 非实时 AIS"],
    "l2-disruption-brief": ["教学情境", "预计等待时间", "靠泊窗口", "安全库存"],
    "l2-option-wait": ["可能收益", "主要代价", "适用条件", "恢复窗口"],
    "l2-option-cape": ["摆脱单一通道等待", "更长航程与更高资源占用", "航程 · 燃料 · 时间 · 船队周转", "免费避险"],
    "l2-option-network": ["做法", "优势", "风险", "紧急箱优先改接"],
    "l2-decision-table": ["等待", "绕行", "调整网络", "可靠性", "客户服务"],
    "l2-container-origin": ["教学集装箱", "海船航次", "上海 → 欧洲", "OOCL Spain 没有驶入重庆", "重庆 → 上海 → 欧洲", "从货源被组织的地方开始"],
    "l2-guoyuan-role": ["果园港", "长江水运", "铁路班列", "国际班轮网络"],
    "l2-container-chain": ["重庆工厂", "果园港集结", "长江水运", "上海港换装", "加入亚欧班轮", "责任交接", "移动的主语始终是教学集装箱"],
    "l2-yangtze-corridor": ["重庆", "武汉", "上海", "航道是通行条件", "港口是组织节点"],
    "l2-three-gorges": ["改变", "仍受约束", "船闸", "能力仍有限"],
    "l2-national-inland-network": ["四纵", "四横", "两网", "果园港", "长江通道", "上海港", "不是工程或导航图"],
    "l2-inland-hidden-costs": ["远洋截关", "等待", "衔接", "信息", "波动"],
    "l2-whole-chain": ["重庆货源", "果园港", "长江", "上海", "亚洲挂港", "海峡与运河", "欧洲港口", "同一交付承诺", "哪一段是走廊"],
    "l2-resilience": ["受阻", "预见", "吸收", "适应", "恢复", "看见、缓冲、调整并重新同步", "共享可信状态"],
    "l2-europe-cliffhanger": ["路线回答", "船怎样抵达", "港口回答", "怎样服务 · 创造何种价值", "同一艘船，为什么在不同港口创造不同价值", "36 / 36"],
    "l3-cover": ["靠泊", "交付完成", "组织整条链", "海陆系统能否继续运转", "01 / 36"],
    "l3-berthing-not-completion": ["靠泊", "卸下", "暂存", "转运", "放行", "进入腹地", "只是起点", "岸桥很快", "箱子很快离港"],
    "l3-four-port-tasks": ["上海", "新加坡", "比雷埃夫斯", "鹿特丹", "任务随节点改变"],
    "l3-value-beyond-quay": ["船边", "海侧作业", "港内流转", "陆侧连接", "信息与治理", "腹地与治理"],
    "l3-no-taxonomy-first": ["船岸转换", "临港生产", "物流组织", "网络协同", "能力组合"],
    "l3-breakbulk-scene": ["ACT", "01", "船舱", "吊具与人力", "码头前沿", "只完成过岸"],
    "l3-first-generation": ["船岸接口", "货物安全", "基本仓储", "港界内作业", "物理起点"],
    "l3-industrial-scene": ["ACT 02", "海侧输入", "矿石 · 原油 · 粮食", "PORT", "PLANT", "产业输出"],
    "l3-second-generation": ["保留", "增加", "新风险", "临港生产", "产业耦合"],
    "l3-logistics-scene": ["CONTAINER", "拆拼箱", "仓储分拨", "运输衔接", "客户与信息"],
    "l3-third-generation": ["连接客户订单", "组织仓储与配送", "协调多式联运", "共享货物状态", "组织流程"],
    "l3-community-scene": ["同一条货流", "港口", "航运", "海关", "铁路", "公路", "城市", "产业"],
    "l3-fourth-generation": ["港口", "航运", "铁路", "海关", "规则 · 数据 · 信任", "共同体"],
    "l3-generation-lens": ["海陆转换", "产业增值", "物流组织", "网络协同与治理"],
    "l3-automation-question": ["设备能力", "自动化", "网络能力", "第四代港口", "设备层", "组织层", "治理层"],
    "l3-four-port-map": ["CNSHA", "上海", "SGSIN", "新加坡", "GRPIR", "比雷埃夫斯", "NLRTM", "鹿特丹", "同船比较"],
    "l3-shanghai-gateway": ["CNSHA", "远洋干线", "制造腹地", "海向", "陆向"],
    "l3-singapore-hub": ["SGSIN", "连接", "转运", "服务", "可接续性"],
    "l3-piraeus-call": ["希腊本地进出口", "支线服务", "84天港序"],
    "l3-rotterdam-industry": ["NLRTM", "北海航运", "欧洲内陆网络", "产业", "治理"],
    "l3-multiple-roles": ["门户", "转运", "工业", "城市", "角色可以叠加"],
    "l3-no-ranking": ["上海", "新加坡", "比雷埃夫斯", "鹿特丹", "任务条件"],
    "l3-china-port-types": ["沿海港", "河口港", "河港", "空间关系", "网络关系", "不是行政级别"],
    "l3-coastal-river-inland": ["沿海港", "河港", "内河枢纽", "空间位置"],
    "l3-gateway-transshipment": ["同一只箱子", "门户逻辑", "转运逻辑", "工厂 / 市场", "下一艘船"],
    "l3-industrial-city-port": ["工业港", "城市港", "共享岸线", "外部成本"],
    "l3-guoyuan-identities": ["长江上游内河港", "水铁公多式联运节点", "服务重庆及周边产业货流", "多重身份"],
    "l3-hinterland-view": ["不在港口里面", "腹地提供货源与需求", "集疏运决定可达范围", "节点效率决定连接质量", "信息决定协同速度"],
    "l3-diagnosis-brief": ["SYSTEM ALERT", "船舶等待", "堆场占用", "闸口拥堵", "单证延迟", "只允许先解决一项"],
    "l3-diagnosis-vessel": ["泊位冲突", "计划靠泊", "作业率", "判断边界"],
    "l3-diagnosis-yard": ["缓冲区失速", "堆场拥堵", "可能原因", "所需证据", "系统联系"],
    "l3-diagnosis-hinterland": ["闸口", "峰值拥堵", "预约", "道路", "铁路班次"],
    "l3-diagnosis-information": ["到港", "卸船", "堆存", "放行", "提箱", "缺失事件"],
    "l3-priority-investment": ["枚优先投资令牌", "增加岸桥或泊位能力", "扩建或优化堆场", "建设共同信息机制"],
    "l3-whole-voyage-answer": ["货物", "航线", "咽喉", "港口", "腹地", "协同治理", "海陆系统交换价值的接口"],
    "l3-next-lesson": ["NEXT", "04", "泊位计划", "岸桥分配", "堆场组织", "集卡调度"]
  };

  for (const slideKey of PILOT_AUTHORED_TEACHING_SLIDE_KEYS) {
    const slide = getPortManagementSlideByKey(slideKey);
    assert.ok(slide);
    const markup = renderSlide(slide.index);
    for (const copy of expectedCopy[slideKey]) {
      assert.match(markup, new RegExp(copy, "u"), `${slideKey} omitted ${copy}`);
    }
  }

  const exchangeRange = renderSlide(20);
  assert.doesNotMatch(exchangeRange, /重庆基地|欧洲基地/u);
});

test("all 119 pages have an explicit authored composition", () => {
  assert.equal(AUTHORED_TEACHING_SLIDE_KEYS.length, 119);
  assert.equal(new Set(AUTHORED_TEACHING_SLIDE_KEYS).size, 119);
  assert.deepEqual(
    new Set(AUTHORED_TEACHING_SLIDE_KEYS),
    new Set(PORT_MANAGEMENT_SLIDES.map((slide) => slide.slideKey))
  );

  for (const slide of PORT_MANAGEMENT_SLIDES) {
    const markup = renderSlide(slide.index);
    assert.doesNotMatch(
      markup,
      /data-slide-composition=/u,
      `${slide.slideKey} exposed its authored composition identifier`
    );
    assert.match(markup, /class="[^"]*\bauthored-slide\b/u);
    assert.doesNotMatch(
      markup,
      /course-slide__(?:columns|stat|steps|table|bullets)/u,
      `${slide.slideKey} fell back to a web-card primitive`
    );
  }
});
