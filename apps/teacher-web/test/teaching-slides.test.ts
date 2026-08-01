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
  assert.equal(PILOT_AUTHORED_TEACHING_SLIDE_KEYS.length, 60);
  for (const slideKey of PILOT_AUTHORED_TEACHING_SLIDE_KEYS) {
    const slide = getPortManagementSlideByKey(slideKey);
    assert.ok(slide, `missing authored slide ${slideKey}`);
    const markup = renderSlide(slide.index);
    assert.match(markup, /data-slide-composition=/u);
    assert.doesNotMatch(
      markup,
      /course-slide__(?:columns|stat|steps|table|bullets)/u,
      `${slideKey} fell back to a standard web-card primitive`
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
    "l1-france-england-scale": ["英格兰", "法国", "英吉利海峡"],
    "l1-china-direct-trade": ["1600", "约1680", "1715后", "网络记忆"],
    "l1-canton-1727-manifest": ["10,200", "织造丝绸", "多品类采购", "结算"],
    "l1-value-density": ["低货值密度", "高货值密度", "货值 ÷ 重量", "风险也越集中"],
    "l1-london-redistribution": ["查验", "拍卖", "消费", "再出口"],
    "l1-absolute-vs-comparative": ["绝对优势", "比较优势", "100", "时间不能同时花两次"],
    "l1-jiangnan-huguang-model": ["100 个劳动日", "江南型", "湖广型", "绝对优势"],
    "l1-half-time-output": ["50", "60匹丝", "150石粮", "200"],
    "l1-opportunity-cost-table": ["1匹丝", "2石粮", "5石粮", "比较的是放弃量"],
    "l1-reallocation-output": ["60", "150", "70", "160", "10匹丝", "10石粮"],
    "l1-opportunity-cost-activity": ["≥ 70匹丝", "江南型", "湖广型", "劳动日分配"],
    "l1-regional-division-timeline": ["晚明", "明清之际", "18世纪", "长江区域", "远洋网络"],
    "l1-cash-crop-transition": ["继续种粮", "转向蚕桑", "相对收益", "粮源安全", "市场收入"],
    "l1-water-distance": ["分工收益", "运输成本", "湖广", "江南", "海港"],
    "l1-navy-state": ["保护与秩序", "竞争与战争", "国家能力降低了谁的风险"],
    "l1-industry-port-loop": ["既有网络", "工业化", "蒸汽与造船", "更大货流"],
    "l1-water-cost-mechanisms": ["浮力承载", "低速航行", "批量运输", "固定成本分摊", "标准化网络"],
    "l1-four-modes": ["17.25%", "55.65%", "水路", "铁路", "公路", "区域测算"],
    "l1-port-interface": ["聚集足够货量", "换装与监管", "衔接船期与泊位", "连接腹地运输", "同步责任与信息"],
    "l2-explain-every-choice": ["走廊", "咽喉", "节点", "腹地"],
    "l2-port-rotation": ["84", "东亚货源港群", "比雷埃夫斯", "服务回路"],
    "l2-cargo-consolidation": ["制造基地形成货源", "多个挂港持续集货", "远洋段兑现规模经济"],
    "l2-feeder-mainline": ["支线", "干线", "衔接窗口", "两张时刻表"],
    "l2-hub-vs-gateway": ["枢纽港", "门户港", "海向网络", "陆向网络"],
    "l2-transshipment": ["卸下干线箱", "中转堆场", "舱位与装船计划", "重新匹配"],
    "l2-indian-ocean": ["马六甲", "印度洋", "苏伊士", "航行计划具有连续性"],
    "l2-why-chokepoint": ["航线在此收敛", "替代路线", "形成排队", "向后传播"],
    "l2-canal-service-system": ["抵达与申报", "等待编队", "引航与交通组织", "受控通过"],
    "l2-capacity-order-safety": ["物理容量", "运行秩序", "安全边界", "信息质量"],
    "l2-disruption-brief": ["教学情境", "预计等待时间", "靠泊窗口", "安全库存"],
    "l2-option-wait": ["可能收益", "主要代价", "适用条件", "恢复窗口"],
    "l2-option-network": ["做法", "优势", "风险", "紧急箱优先改接"],
    "l2-decision-table": ["等待", "绕行", "调整网络", "可靠性", "客户服务"],
    "l2-guoyuan-role": ["果园港", "长江水运", "铁路班列", "国际班轮网络"],
    "l2-yangtze-corridor": ["重庆", "武汉", "上海", "航道是通行条件", "港口是组织节点"],
    "l2-three-gorges": ["改变", "仍受约束", "船闸", "能力仍有限"],
    "l2-inland-hidden-costs": ["远洋截关", "等待", "衔接", "信息", "波动"],
    "l3-four-port-tasks": ["上海", "新加坡", "比雷埃夫斯", "鹿特丹", "任务随节点改变"],
    "l3-no-taxonomy-first": ["船岸转换", "临港生产", "物流组织", "网络协同", "能力组合"],
    "l3-first-generation": ["船岸接口", "货物安全", "基本仓储", "港界内作业", "物理起点"],
    "l3-second-generation": ["保留", "增加", "新风险", "临港生产", "产业耦合"],
    "l3-third-generation": ["连接客户订单", "组织仓储与配送", "协调多式联运", "共享货物状态", "组织流程"],
    "l3-fourth-generation": ["港口", "航运", "铁路", "海关", "规则 · 数据 · 信任", "共同体"],
    "l3-generation-lens": ["海陆转换", "产业增值", "物流组织", "网络协同与治理"],
    "l3-shanghai-gateway": ["CNSHA", "远洋干线", "制造腹地", "海向", "陆向"],
    "l3-singapore-hub": ["SGSIN", "连接", "转运", "服务", "可接续性"],
    "l3-piraeus-call": ["希腊本地进出口", "支线服务", "84天港序"],
    "l3-rotterdam-industry": ["NLRTM", "北海航运", "欧洲内陆网络", "产业", "治理"],
    "l3-multiple-roles": ["门户", "转运", "工业", "城市", "角色可以叠加"],
    "l3-no-ranking": ["上海", "新加坡", "比雷埃夫斯", "鹿特丹", "任务条件"],
    "l3-coastal-river-inland": ["沿海港", "河港", "内河枢纽", "空间位置"],
    "l3-gateway-transshipment": ["同一只箱子", "门户逻辑", "转运逻辑", "工厂 / 市场", "下一艘船"],
    "l3-industrial-city-port": ["工业港", "城市港", "共享岸线", "外部成本"],
    "l3-diagnosis-vessel": ["泊位冲突", "计划靠泊", "作业率", "判断边界"],
    "l3-diagnosis-yard": ["缓冲区失速", "堆场拥堵", "可能原因", "所需证据", "系统联系"],
    "l3-diagnosis-hinterland": ["闸口", "峰值拥堵", "预约", "道路", "铁路班次"],
    "l3-diagnosis-information": ["到港", "卸船", "堆存", "放行", "提箱", "缺失事件"],
    "l3-priority-investment": ["枚优先投资令牌", "增加岸桥或泊位能力", "扩建或优化堆场", "建设共同信息机制"]
  };

  for (const slideKey of PILOT_AUTHORED_TEACHING_SLIDE_KEYS) {
    const slide = getPortManagementSlideByKey(slideKey);
    assert.ok(slide);
    const markup = renderSlide(slide.index);
    for (const copy of expectedCopy[slideKey]) {
      assert.match(markup, new RegExp(copy, "u"), `${slideKey} omitted ${copy}`);
    }
  }
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
    assert.match(
      markup,
      /data-slide-composition=/u,
      `${slide.slideKey} lacks an authored composition`
    );
    assert.doesNotMatch(
      markup,
      /course-slide__(?:columns|stat|steps|table|bullets)/u,
      `${slide.slideKey} fell back to a web-card primitive`
    );
  }
});
