import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ECONOMIC_MATHEMATICS_INTERACTIONS,
  ECONOMIC_MATHEMATICS_SLIDES,
  getEconomicMathematicsInteractionDefinition
} from "@edu/course-content/economic-mathematics";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import katex from "katex";
import {
  buildEconomicMathematicsComparisonPreset,
  buildEconomicMathematicsControlPatch,
  calculateLabMetrics,
  ECONOMIC_MATHEMATICS_REGISTERED_VISUALS,
  EconomicMathematicsTeachingSlides,
  isEconomicMathematicsControlDisabled
} from "../src/features/economic-mathematics/EconomicMathematicsTeachingSlides";

function renderInteractionProjection(
  interactionId: keyof typeof ECONOMIC_MATHEMATICS_INTERACTIONS,
  overrides: Readonly<Record<string, string | number | boolean>> = {}
) {
  const spec = ECONOMIC_MATHEMATICS_SLIDES.find((slide) => slide.interactionId === interactionId);
  assert.ok(spec, interactionId);
  const definition = getEconomicMathematicsInteractionDefinition(spec);
  assert.ok(definition, interactionId);
  return renderToStaticMarkup(
    <EconomicMathematicsTeachingSlides
      interaction={{
        deckId: "deck-economic-mathematics-2026",
        slideId: spec.slideKey,
        revision: 1,
        values: { ...definition.defaults, ...overrides }
      }}
      readOnly
      spec={spec}
    />
  );
}

function renderInteractionSlide(
  slideKey: string,
  overrides: Readonly<Record<string, string | number | boolean>> = {},
  readOnly = true
) {
  const spec = ECONOMIC_MATHEMATICS_SLIDES.find((slide) => slide.slideKey === slideKey);
  assert.ok(spec, slideKey);
  const definition = getEconomicMathematicsInteractionDefinition(spec);
  assert.ok(definition, slideKey);
  return renderToStaticMarkup(
    <EconomicMathematicsTeachingSlides
      interaction={{
        deckId: "deck-economic-mathematics-2026",
        slideId: spec.slideKey,
        revision: 1,
        values: { ...definition.defaults, ...overrides }
      }}
      readOnly={readOnly}
      spec={spec}
    />
  );
}

test("economic mathematics student markup excludes author fields and interactive controls", () => {
  const spec = ECONOMIC_MATHEMATICS_SLIDES.find(
    (slide) => slide.interactionId === "price-profit-lab"
  );
  assert.ok(spec);
  const definition = getEconomicMathematicsInteractionDefinition(spec);
  assert.ok(definition);
  const html = renderToStaticMarkup(
    <EconomicMathematicsTeachingSlides
      interaction={{
        deckId: "deck-economic-mathematics-2026",
        slideId: spec.slideKey,
        revision: 1,
        values: definition.defaults
      }}
      readOnly
      spec={spec}
    />
  );

  for (const forbidden of [
    "teachingCue",
    "assistantCue",
    "openQuestion",
    "storyBeat",
    "voyageStage",
    spec.teachingCue,
    spec.assistantCue
  ]) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
  assert.equal(html.includes("data-slide-key"), false);
  assert.equal(html.includes("data-slide-composition"), false);
  assert.equal(html.includes('type="range"'), false);
  assert.equal(html.includes("模型内最优价"), false);
  assert.match(html, /价格—利润联动台/);
  assert.match(html, /当前参数和计算结果/);
  assert.equal(html.includes("<button"), false);
  assert.equal(html.includes("<input"), false);
});

test("economic mathematics teacher markup exposes presets, timer, reveal and reset", () => {
  const spec = ECONOMIC_MATHEMATICS_SLIDES.find(
    (slide) => slide.interactionId === "riemann-sum-lab"
  );
  assert.ok(spec);
  const definition = getEconomicMathematicsInteractionDefinition(spec);
  assert.ok(definition);
  const html = renderToStaticMarkup(
    <EconomicMathematicsTeachingSlides
      interaction={{
        deckId: "deck-economic-mathematics-2026",
        slideId: spec.slideKey,
        revision: 1,
        values: definition.defaults
      }}
      readOnly={false}
      spec={spec}
    />
  );

  assert.match(html, /基准预设/);
  assert.match(html, /对比预设/);
  assert.match(html, /分步揭示结论/);
  assert.match(html, /课堂计时/);
  assert.match(html, /重置本页实验/);
});

test("interactive projections preserve the four authoritative model anchors", () => {
  const priceDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["price-profit-lab"];
  const segmentA = calculateLabMetrics(priceDefinition, {
    ...priceDefinition.defaults,
    price: 70,
    segment: "A",
    revealStep: true
  });
  assert.deepEqual(segmentA.metrics.slice(0, 3), [
    "销量 500 杯/日",
    "收入 35000 元/日",
    "成本 12000 元/日"
  ]);
  assert.equal(segmentA.metrics[3], "利润 23000 元/日");
  assert.equal(segmentA.metrics.some((metric) => metric.includes("弹性")), false);
  assert.doesNotMatch(segmentA.reveal, /最优价/u);

  const elasticityDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["elasticity-profit-lab"];
  const elasticity = calculateLabMetrics(elasticityDefinition, {
    ...elasticityDefinition.defaults,
    price: 50,
    segment: "A"
  });
  assert.match(elasticity.metrics[3] ?? "", /^正值弹性 0\.71$/);

  const riemannDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["riemann-sum-lab"];
  const riemann = calculateLabMetrics(riemannDefinition, {
    ...riemannDefinition.defaults,
    partitions: "8",
    sample: "midpoint",
    revealStep: true
  });
  assert.deepEqual(riemann.metrics, [
    "近似累计 1218.0 杯",
    "精确累计 1216.0 杯",
    "误差 2.0 杯"
  ]);

  const surfaceDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["marketing-surface-lab"];
  const surface = calculateLabMetrics(surfaceDefinition, {
    ...surfaceDefinition.defaults,
    price: 50,
    advertising: 25,
    revealStep: true
  });
  assert.match(surface.headline, /= 920\.0/);

  const budgetDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["budget-constraint-lab"];
  const budget = calculateLabMetrics(budgetDefinition, {
    ...budgetDefinition.defaults,
    budget: "100",
    channelX: 64,
    revealOptimum: true,
    revealStep: true
  });
  assert.match(budget.headline, /x=64 · y=36/);
  assert.match(budget.metrics[0] ?? "", /500\.00/);
  assert.match(budget.reveal, /64 \/ 36/);
});

test("all 13 interaction ids dispatch to model-specific authoritative SVG projections", () => {
  const expectedLayers: Readonly<Record<keyof typeof ECONOMIC_MATHEMATICS_INTERACTIONS, readonly string[]>> = {
    "price-profit-lab": ["profit-parabola"],
    "sequence-limit-lab": ["tolerance-band"],
    "continuity-threshold-lab": ["threshold-jump"],
    "secant-tangent-lab": ["secant", "tangent"],
    "linearization-error-lab": ["linear-estimate", "linearization-error"],
    "elasticity-profit-lab": ["profit-parabola", "revenue-parabola"],
    "riemann-sum-lab": ["riemann-rectangles"],
    "accumulation-limit-lab": ["accumulated-area"],
    "consumer-surplus-lab": ["revenue-rectangle", "consumer-surplus-triangle"],
    "marketing-surface-lab": ["response-contours"],
    "tangent-plane-lab": ["tangent-plane-prediction", "tangent-plane-error"],
    "unconstrained-optimum-lab": ["profit-contours", "gradient-vector"],
    "budget-constraint-lab": ["budget-line"]
  };

  for (const [interactionId, layers] of Object.entries(expectedLayers)) {
    const html = renderInteractionProjection(interactionId as keyof typeof ECONOMIC_MATHEMATICS_INTERACTIONS);
    if (interactionId === "price-profit-lab") {
      assert.match(html, /l02-profit-plot/, interactionId);
      assert.match(html, /客群A价格利润曲线/, interactionId);
      assert.match(html, /预测销量/, interactionId);
      assert.doesNotMatch(html, /\b(?:NaN|Infinity)\b/u, interactionId);
      continue;
    }
    assert.match(html, new RegExp(`data-projection="${interactionId}"`), interactionId);
    for (const layer of layers) {
      assert.match(html, new RegExp(`data-layer="${layer}"`), `${interactionId}: ${layer}`);
    }
    assert.equal(html.includes("M88 405C180 388 214 302"), false, interactionId);
    assert.doesNotMatch(html, /\b(?:NaN|Infinity)\b/u, interactionId);
    assert.equal(html.includes('d=""'), false, `${interactionId}: empty path`);
  }
});

test("reveal gates, locked axes and decimal budget allocations remain authoritative", () => {
  const marketingDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["marketing-surface-lab"];
  assert.equal(isEconomicMathematicsControlDisabled(marketingDefinition, { ...marketingDefinition.defaults, lockedAxis: "price" }, "price"), true);
  assert.equal(isEconomicMathematicsControlDisabled(marketingDefinition, { ...marketingDefinition.defaults, lockedAxis: "price" }, "advertising"), false);
  assert.equal(isEconomicMathematicsControlDisabled(marketingDefinition, { ...marketingDefinition.defaults, lockedAxis: "advertising" }, "advertising"), true);

  const hiddenDerivative = calculateLabMetrics(marketingDefinition, {
    ...marketingDefinition.defaults,
    advertising: 64,
    revealStep: false
  });
  assert.equal(hiddenDerivative.metrics.includes("∂Q/∂a = 1.50"), false);
  assert.equal(hiddenDerivative.metrics.includes("∂Q/∂a 待揭示"), true);
  const revealedDerivative = calculateLabMetrics(marketingDefinition, {
    ...marketingDefinition.defaults,
    advertising: 64,
    revealStep: true
  });
  assert.equal(revealedDerivative.metrics.includes("∂Q/∂a = 1.50 件/千元"), true);

  const hiddenElasticityPeaks = renderInteractionProjection("elasticity-profit-lab", { revealOptimum: false });
  assert.match(hiddenElasticityPeaks, /data-layer="revenue-parabola"/);
  assert.equal(hiddenElasticityPeaks.includes("data-layer=\"profit-optimum\""), false);
  const revealedElasticityPeaks = renderInteractionProjection("elasticity-profit-lab", { revealOptimum: true });
  assert.match(revealedElasticityPeaks, /data-layer="profit-optimum"/);
  assert.match(revealedElasticityPeaks, /收入峰 p=60/);

  const budgetDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["budget-constraint-lab"];
  const decimalBudget = calculateLabMetrics(budgetDefinition, {
    ...budgetDefinition.defaults,
    budget: "80",
    channelX: 51.2,
    revealOptimum: true
  });
  assert.match(decimalBudget.headline, /x=51\.2 · y=28\.8/);
  assert.match(decimalBudget.reveal, /51\.2 \/ 28\.8/);
});

test("slide-specific sections, shadow curve and safe presets match their lesson claims", () => {
  const priceSection = renderInteractionSlide("em-l27-17-lab-price-nudge");
  assert.match(priceSection, /data-layer="price-section"/);
  assert.match(priceSection, /data-layer="section-tangent"/);
  const advertisingSection = renderInteractionSlide("em-l27-18-lab-ad-nudge");
  assert.match(advertisingSection, /data-layer="advertising-section"/);
  assert.match(advertisingSection, /广告截面/);
  const parallelPriceSections = renderInteractionSlide("em-l27-20-lab-same-price");
  assert.match(parallelPriceSections, /data-layer="price-section-family"/);
  assert.match(parallelPriceSections, /三条斜率均为 −8 件\/元/);
  assert.equal(parallelPriceSections.includes('data-layer="advertising-section"'), false);

  const shadowCurve = renderInteractionSlide("em-l32-31-lab-shadow-curve");
  assert.match(shadowCurve, /data-layer="shadow-price-curve"/);
  assert.equal(shadowCurve.includes('data-layer="budget-line"'), false);

  const marketingTools = renderInteractionSlide("em-l27-19-lab-ad-levels", {}, false);
  assert.match(marketingTools, /a=4/);
  assert.match(marketingTools, /a=25/);
  assert.match(marketingTools, /a=100/);
  const lockedAdvertisingTools = renderInteractionSlide("em-l26-21-lab-price-move", {}, false);
  assert.equal(
    lockedAdvertisingTools.includes('aria-label="模型关键预设"'),
    false,
    "a locked advertising axis cannot be changed through a hidden preset path"
  );

  const budgetDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["budget-constraint-lab"];
  const wraparoundDefinition = {
    ...budgetDefinition,
    defaults: { ...budgetDefinition.defaults, budget: "120", channelX: 76.8 }
  };
  const comparison = buildEconomicMathematicsComparisonPreset(wraparoundDefinition);
  assert.equal(comparison.budget, "25");
  assert.ok(Number(comparison.channelX) <= 25);

  const continuityDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["continuity-threshold-lab"];
  assert.deepEqual(buildEconomicMathematicsControlPatch(continuityDefinition, "orderAmount", 98.99), {
    orderAmount: 98.99,
    approach: "left"
  });
  assert.deepEqual(buildEconomicMathematicsControlPatch(continuityDefinition, "approach", "right"), {
    approach: "right",
    orderAmount: 99.01
  });
});

test("interactive readouts retain scenario-specific units and public optimum state", () => {
  const sequenceDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["sequence-limit-lab"];
  const sequence = calculateLabMetrics(sequenceDefinition, { ...sequenceDefinition.defaults, n: 0 });
  assert.match(sequence.headline, /60\.00%/);
  assert.match(sequence.metrics[0] ?? "", /20\.00 个百分点/);

  const linearDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["linearization-error-lab"];
  const linear = calculateLabMetrics(linearDefinition, { ...linearDefinition.defaults, deltaPrice: 1 });
  assert.ok(linear.metrics.every((metric) => /元$/u.test(metric)));

  const secantDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["secant-tangent-lab"];
  const secant = calculateLabMetrics(secantDefinition, secantDefinition.defaults);
  assert.match(secant.metrics[0] ?? "", /（元\/日）\/（元\/杯）$/u);
  assert.match(secant.metrics[1] ?? "", /（元\/日）\/（元\/杯）$/u);

  const tangentDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["tangent-plane-lab"];
  const tangent = calculateLabMetrics(tangentDefinition, tangentDefinition.defaults);
  assert.match(tangent.headline, /件/);
  assert.ok(tangent.metrics.every((metric) => /件$/u.test(metric)));

  const optimumDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["unconstrained-optimum-lab"];
  const publicOptimum = calculateLabMetrics(
    optimumDefinition,
    { ...optimumDefinition.defaults, x: 20, y: 15, revealClassification: false },
    { slideKey: "em-l30-23-lab-optimum" }
  );
  assert.match(publicOptimum.headline, /525\.0 万元/);
  assert.equal(publicOptimum.metrics.includes("先找到驻点，再决定类型"), false);

  const budgetDefinition = ECONOMIC_MATHEMATICS_INTERACTIONS["budget-constraint-lab"];
  const budget = calculateLabMetrics(budgetDefinition, budgetDefinition.defaults);
  assert.match(budget.metrics[0] ?? "", /响应单位/);
  assert.match(budget.metrics[1] ?? "", /响应单位\/千元/);
});

test("every authored composition id selects a registered visual without entering student DOM", () => {
  const registered = new Set<string>(ECONOMIC_MATHEMATICS_REGISTERED_VISUALS);
  const compositionIds = new Set<string>();
  for (const spec of ECONOMIC_MATHEMATICS_SLIDES) {
    assert.equal(registered.has(spec.visual), true, `${spec.compositionId}: ${spec.visual}`);
    assert.equal(compositionIds.has(spec.compositionId), false, spec.compositionId);
    compositionIds.add(spec.compositionId);
  }
  assert.equal(compositionIds.size, 1460);
});

test("all economic mathematics public formulas parse and public copy stays student-facing", () => {
  const authoringLanguage = [
    "让学生",
    "告诉学生",
    "请学生",
    "引导学生",
    "先拆掉",
    "今天不先",
    "不背口号",
    "教师提示",
    "备课说明"
  ];
  for (const slide of ECONOMIC_MATHEMATICS_SLIDES) {
    const publicCopy = [
      slide.kicker,
      slide.title,
      slide.lead,
      ...(slide.body ?? []),
      ...(slide.data ?? []),
      slide.prompt,
      slide.formula,
      slide.formulaLabel,
      slide.sourceNote
    ]
      .filter(Boolean)
      .join("\n");
    for (const forbidden of authoringLanguage) {
      assert.equal(
        publicCopy.includes(forbidden),
        false,
        `${slide.slideKey}: ${forbidden}`
      );
    }
    if (slide.formula && !/[\u3400-\u9fff]/u.test(slide.formula)) {
      assert.doesNotThrow(
        () =>
          katex.renderToString(slide.formula!, {
            displayMode: true,
            throwOnError: true,
            strict: "ignore",
            trust: false
          }),
        slide.slideKey
      );
    }
  }
});

test("tangent-plane prediction hats render as valid KaTeX", () => {
  for (const slideKey of [
    "em-l28-11-predicted-level",
    "em-l28-34-solution-one",
    "em-l28-36-solution-two"
  ]) {
    const spec = ECONOMIC_MATHEMATICS_SLIDES.find((slide) => slide.slideKey === slideKey);
    assert.ok(spec, slideKey);
    const html = renderToStaticMarkup(
      <EconomicMathematicsTeachingSlides interaction={null} readOnly spec={spec} />
    );
    assert.equal(html.includes("katex-error"), false, slideKey);
    assert.match(html, /\\widehat\{Q\}/, slideKey);
  }
});

test("the first four lessons use 181 explicitly registered art-directed pages", () => {
  const expectedTotals = new Map([[1, 44], [2, 47], [3, 45], [4, 45]]);
  const pageMarkers = new Set<string>();
  const imageAssets = new Set<string>();

  for (const [lesson, total] of expectedTotals) {
    const lessonSlides = ECONOMIC_MATHEMATICS_SLIDES.filter((slide) => slide.lesson === lesson);
    assert.equal(lessonSlides.length, total, `lesson ${lesson}`);
    for (const spec of lessonSlides) {
      const definition = getEconomicMathematicsInteractionDefinition(spec);
      const html = renderToStaticMarkup(
        <EconomicMathematicsTeachingSlides
          interaction={definition ? {
            deckId: "deck-economic-mathematics-2026",
            slideId: spec.slideKey,
            revision: 1,
            values: definition.defaults
          } : null}
          readOnly
          spec={spec}
        />
      );
      const local = String(spec.localIndex).padStart(2, "0");
      const marker = lesson === 1
        ? `l1-art--s${local}`
        : lesson === 2
          ? `l02-slide--s${local}`
          : lesson === 3
            ? `l03-s${local}`
            : `l4-art--s${local}`;
      assert.match(html, new RegExp(`class="[^"]*${marker}`), spec.slideKey);
      assert.equal(pageMarkers.has(`${lesson}:${marker}`), false, spec.slideKey);
      pageMarkers.add(`${lesson}:${marker}`);
      assert.equal(html.includes("econmath-copy"), false, spec.slideKey);
      assert.equal(html.includes("econmath-comparison__columns"), false, spec.slideKey);
      assert.equal(html.includes("katex-error"), false, spec.slideKey);
      for (const match of html.matchAll(/\/course-assets\/economic-mathematics\/art\/[^"']+\.webp/gu)) {
        imageAssets.add(match[0]);
      }
    }
  }

  assert.equal(pageMarkers.size, 181);
  assert.deepEqual([...imageAssets].sort(), [
    "/course-assets/economic-mathematics/art/l01-function-receipt.webp",
    "/course-assets/economic-mathematics/art/l01-market-observation.webp",
    "/course-assets/economic-mathematics/art/l01-variable-flow.webp",
    "/course-assets/economic-mathematics/art/l02-pricing-counter.webp",
    "/course-assets/economic-mathematics/art/l02-profit-ledger.webp",
    "/course-assets/economic-mathematics/art/l02-two-segments.webp",
    "/course-assets/economic-mathematics/art/l03-exposure-rhythm.webp",
    "/course-assets/economic-mathematics/art/l03-plateau-citylights.webp",
    "/course-assets/economic-mathematics/art/l03-sequence-notebook.webp",
    "/course-assets/economic-mathematics/art/l04-limit-algebra.webp",
    "/course-assets/economic-mathematics/art/l04-missing-point.webp",
    "/course-assets/economic-mathematics/art/l04-two-sided-approach.webp"
  ]);
});

test("the first four lessons avoid high-area pink ambient washes", () => {
  const lessonStyles = [
    "lesson-01-art.css",
    "lesson-02-art.css",
    "lesson-03-art.css",
    "lesson-04-art.css"
  ].map((fileName) => [fileName, readFileSync(
    new URL(`../src/features/economic-mathematics/art-directed/${fileName}`, import.meta.url),
    "utf8"
  )] as const);
  const styles = lessonStyles.map(([, style]) => style).join("\n");
  const lessonOneStyles = lessonStyles.find(([fileName]) => fileName === "lesson-01-art.css")?.[1] ?? "";

  assert.doesNotMatch(styles, /255 117 178|244 103 145|l02-slide--rose/u);
  assert.match(styles, /l02-slide--linen/u);
  assert.match(lessonOneStyles, /\.l1-art--s01 \{ --l1-accent: #d08a2f; \}/u);
  assert.match(lessonOneStyles, /filter: saturate\(\.78\) contrast\(1\.03\) sepia\(\.04\)/u);
  assert.match(lessonOneStyles, /rgba\(7,30,36,\.99\)/u);
});

test("all 1460 economic mathematics slides render as isolated student markup", () => {
  assert.equal(ECONOMIC_MATHEMATICS_SLIDES.length, 1460);
  const consoleMessages: string[] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => consoleMessages.push(args.map(String).join(" "));
  console.error = (...args: unknown[]) => consoleMessages.push(args.map(String).join(" "));
  try {
    for (const spec of ECONOMIC_MATHEMATICS_SLIDES) {
      const definition = getEconomicMathematicsInteractionDefinition(spec);
      const html = renderToStaticMarkup(
        <EconomicMathematicsTeachingSlides
          interaction={definition ? {
            deckId: "deck-economic-mathematics-2026",
            slideId: spec.slideKey,
            revision: 1,
            values: definition.defaults
          } : null}
          readOnly
          spec={spec}
        />
      );

      assert.ok(html.length > 500, `${spec.slideKey}: empty render`);
      assert.match(html, /ECONOMIC MATHEMATICS|经济数学/, spec.slideKey);
      assert.equal(html.includes("data-slide-key"), false, spec.slideKey);
      assert.equal(html.includes("data-slide-composition"), false, spec.slideKey);
      assert.equal(html.includes(spec.compositionId), false, `${spec.slideKey}: compositionId`);
      assert.equal(html.includes('type="range"'), false, spec.slideKey);
      assert.equal(html.includes(spec.teachingCue), false, `${spec.slideKey}: teachingCue`);
      assert.equal(html.includes(spec.assistantCue), false, `${spec.slideKey}: assistantCue`);
      assert.equal(html.includes("katex-error"), false, `${spec.slideKey}: katex-error`);
    }
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
  assert.deepEqual(consoleMessages, []);
});
