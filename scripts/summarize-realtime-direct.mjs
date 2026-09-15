import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.EDU_VOICE_BENCHMARK_OUTPUT || 'output/realtime-direct-qa');
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const report = await read(resolve(output, 'benchmark.json'));
const probe = await read(resolve(output, 'probe.json'));
const historical = await read(resolve('output/realtime-voice-qa/benchmark.json'));
const fixtures = await read(resolve('output/realtime-voice-qa/fixtures.json'));
const median = values => {
  const a = [...values].sort((a,b) => a-b), n = a.length;
  return n ? n % 2 ? a[(n-1)/2] : (a[n/2-1]+a[n/2])/2 : null;
};
const p95 = values => [...values].sort((a,b) => a-b)[Math.ceil(values.length*.95)-1] ?? null;
function summarize(rows) {
  const good = rows.filter(r => !r.error && Number.isFinite(r.firstAudioMs));
  return {attempted:rows.length,successful:good.length,medianMs:median(good.map(r=>r.firstAudioMs)),p95Ms:p95(good.map(r=>r.firstAudioMs))};
}
const rows = report.results.filter(r => r.path === 'realtime-direct' || r.path === 'realtime');
assert.equal(rows.length, 30, 'Ten questions, three repetitions required');
for (const fixture of fixtures) for (let round=0;round<3;round++) {
  assert.equal(rows.filter(r => r.fixture === fixture.name && r.round === round).length, 1);
}
for (const row of rows.filter(r=>!r.error)) {
  assert.equal(row.timing?.responseCount, 1, 'Ordinary questions must have one model response');
  assert.equal(row.timing?.toolDecisionMs, undefined);
  assert.equal(row.controls?.length ?? (row.control ? 1 : 0), 0);
  assert.ok(row.dialogue && Number.isFinite(row.firstAudioMs));
}
const controls = probe.results.filter(r=>r.fixture.startsWith('control-'));
assert.equal(controls.length, 2);
for (const row of controls) {
  assert.ok(!row.error && row.dialogue && row.firstAudioMs > 0);
  const receipts = row.controls ?? [row.control];
  assert.equal(receipts.length, 1); assert.equal(receipts[0].status, 'applied');
  assert.equal(receipts[0].results.length, 1); assert.equal(receipts[0].results[0].type, 'slides.next');
  assert.equal(row.timing.responseCount, 2);
}
const direct = summarize(rows);
const twoStage = summarize(historical.results.filter(r=>r.path==='realtime'));
const existing = summarize(historical.results.filter(r=>r.path==='existing'));
const result = {
  measuredAt:report.measuredAt,metric:report.metric,existing,twoStage,direct,
  cold:summarize(rows.filter(r=>r.connection==='cold')),warm:summarize(rows.filter(r=>r.connection==='warm')),
  firstTextServerMedianMs:median(rows.filter(r=>!r.error).map(r=>r.timing?.firstTextMs).filter(Number.isFinite)),
  reductionFromTwoStagePercent:direct.medianMs && twoStage.medianMs ? 100*(1-direct.medianMs/twoStage.medianMs) : null,
  controls:controls.map(r=>({fixture:r.fixture,firstAudioMs:r.firstAudioMs,toolDecisionMs:r.timing.toolDecisionMs,dialogue:r.dialogue})),
  baselineSource:'../realtime-voice-qa/benchmark.json'
};
await writeFile(resolve(output, 'summary.json'), JSON.stringify(result, null, 2));
const seconds = ms => ms === null ? '—' : `${(ms/1000).toFixed(2)} 秒`;
const tableRow = (name, s) => `| ${name} | ${s.successful} / ${s.attempted} | ${seconds(s.medianMs)} | ${seconds(s.p95Ms)} |`;
await writeFile(resolve(output, 'report.md'), `# 取消静默判断后的实时语音实测

测量开始：${report.measuredAt}。同一组十条缓存录音，每条重复三次，约100ms分块送入真实千问模型。

| 路径 | 成功 / 尝试 | 首音中位数 | 首音 P95 |
| --- | ---: | ---: | ---: |
${tableRow('原有 ASR → Qwen Plus → TTS（历史样本）',existing)}
${tableRow('实时语音，两阶段静默判断（历史样本）',twoStage)}
${tableRow('实时语音，直接响应（本次）',direct)}

与历史两阶段样本相比，本次首音中位数缩短 ${result.reductionFromTwoStagePercent?.toFixed(1) ?? '—'}%。首段字幕到达服务端的中位数为 ${seconds(result.firstTextServerMedianMs)}，这不是浏览器首音指标。

| 本次连接 | 成功 / 尝试 | 首音中位数 | 首音 P95 |
| --- | ---: | ---: | ---: |
${tableRow('每组首次连接',result.cold)}
${tableRow('同组复用连接',result.warm)}

连接在录音前准备，首音指标不含准备时间。首次连接只有三条，不能据此估计稳定尾部延迟。

## 实际操作验证

${result.controls.map(r=>`- ${r.fixture}：首音 ${seconds(r.firstAudioMs)}，完整工具参数校验 ${seconds(r.toolDecisionMs)}，翻页执行一次；口播：“${r.dialogue.replace(/\n/g,' ')}”`).join('\n')}

## 口径与边界

- 首音为提交到浏览器安排播放的首个非静音 PCM 样本，含初始静音与约30ms调度余量。未测扬声器的声学发声，也不含教师录音时间。
- 本次用本地 HTTPS 验证页和课堂相同的 WebSocket 客户端、PCM 播放器，真实调用 qwen-audio-3.0-realtime-plus / longanqian；输入为历史合成录音。没有重新验证用户设备的麦克风授权。
- 旧路径及两阶段数据保留自同日本地顺序试验；本次浏览器和测量时间不同，并非同时随机交错的性能基准。网络、模型负载与回答长度会影响结果，提速比例不作为保证。
- 一次开发验证因修改类型检查配置触发页面热重载而中断，未保存完整计时；结束该独立测试课堂后重新完成本组30次测量。中断说明见 [记录](interrupted-run.json)，不作为零延迟或云端成功样本。
- 普通问答成功轮次均只生成一次响应。工具参数没有作为字幕或音频返回。操作确认首音不能代表操作完成或新页讲解开始。
- API 82项、前端104项测试通过，类型检查、生产构建与 git diff --check 通过。新增开发验证页单独纳入前端类型检查，不进入生产构建。
- [逐轮测量](benchmark.json)、[操作探针](probe.json)、[汇总](summary.json)。历史原始数据位于 ../realtime-voice-qa/benchmark.json，保持原样。
`);
console.log(JSON.stringify(result));
