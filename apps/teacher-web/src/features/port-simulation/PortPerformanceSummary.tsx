import type { PortSubmissionResult } from "@edu/port-simulation-core";

export function PortPerformanceSummary({ value }: { value: NonNullable<PortSubmissionResult["performance"]> }) {
  return <div className="port-performance" aria-label="操作质量与效率证据">
    <p><strong>完成度与效率分别评价</strong> · 只比较相同起点、配置与任务的记录；尚未完成时的低成本不能作为高效率结论。</p>
    <p>仿真耗时 {(value.elapsed / 60).toFixed(1)} 分钟 · 本段运营成本 {value.cost.toFixed(1)} 教学点 · 运输距离 {value.distance.toFixed(1)} · 翻箱 {value.rehandles} 次</p>
    <p>违反前置条件 {value.incorrect} 次 · 资料补正重报 {value.corrections} 次 · 各项最近提交时刻跨度 {(value.submissionSpan / 60).toFixed(1)} 分钟</p>
    <small>提交跨度用于复盘并行安排，补正会更新时刻；这些证据不直接合成为未经校准的效率分。</small>
  </div>;
}
