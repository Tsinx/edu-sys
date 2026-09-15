import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// Historical two-stage report only. Keep its old evidence separate from the
// direct-response measurements in output/realtime-direct-qa/.
const output=resolve('output/realtime-voice-qa');
const report=JSON.parse(await readFile(resolve(output,'benchmark.json'),'utf8'));
const median=values=>{const a=[...values].sort((x,y)=>x-y),n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;};
const p95=values=>[...values].sort((x,y)=>x-y)[Math.ceil(values.length*.95)-1];
function summary(rows){const good=rows.filter(r=>!r.error&&Number.isFinite(r.firstAudioMs));return {attempted:rows.length,successful:good.length,medianMs:good.length?median(good.map(r=>r.firstAudioMs)):null,p95Ms:good.length?p95(good.map(r=>r.firstAudioMs)):null};}
const old=report.results.filter(r=>r.path==='existing'),fresh=report.results.filter(r=>r.path==='realtime');
assert.equal(old.length,30,'Need 30 existing-path observations');assert.equal(fresh.length,30,'Need 30 realtime observations');
const existing=summary(old),realtime=summary(fresh),cold=summary(fresh.filter(r=>r.connection==='cold')),warm=summary(fresh.filter(r=>r.connection==='warm'));
const improvement=existing.medianMs&&realtime.medianMs?100*(1-realtime.medianMs/existing.medianMs):null;
const route=fresh.filter(r=>!r.error&&Number.isFinite(r.timing?.routeMs)).map(r=>r.timing.routeMs);
assert.ok(route.length > 0, 'This summarizer only accepts historical two-stage routing measurements');
const browser=JSON.parse(await readFile(resolve(output,'browser-report.json'),'utf8'));
const kws=JSON.parse(await readFile(resolve(output,'kws-report.json'),'utf8'));
const probe=JSON.parse(await readFile(resolve(output,'probe.json'),'utf8'));
assert.ok(!browser.failure&&!kws.failure);assert.deepEqual(browser.errors,[]);assert.deepEqual(kws.errors,[]);
const pure=probe.results.find(r=>r.fixture==='control-1'),combined=probe.results.find(r=>r.fixture==='control-2');
assert.equal(pure.control.status,'applied');assert.equal(pure.control.results.length,1);
assert.equal(pure.events.filter(e=>e==='audio.delta').length,0);assert.equal(pure.dialogue,'');
assert.equal(combined.control.status,'applied');assert.equal(combined.control.results.length,1);
assert.ok(combined.events.includes('audio.delta')&&combined.dialogue);
const verification={browserChecks:browser.checks,keywordChecks:kws.checks,pureControlAudioEvents:0,combinedControlResult:combined.control.results};
const seconds=value=>value===null?'—':(value/1000).toFixed(2)+' 秒';
const result={measuredAt:report.measuredAt,existing,realtime,cold,warm,medianReductionPercent:improvement,routeMedianMs:route.length?median(route):null,metric:report.metric,verification};
await writeFile(resolve(output,'summary.json'),JSON.stringify(result,null,2));
const text=`# 课堂双语音路径实测

完成时间：${report.measuredAt}。十条相同的港口概念测试录音，每条重复三次；音频由既有 TTS 合成，输入文件保存在本目录。

| 路径 | 成功 / 尝试 | 首音中位数 | 首音 P95 |
| --- | ---: | ---: | ---: |
| 现有 ASR → Qwen Plus → TTS | ${existing.successful} / ${existing.attempted} | ${seconds(existing.medianMs)} | ${seconds(existing.p95Ms)} |
| Qwen-Audio 实时语音 | ${realtime.successful} / ${realtime.attempted} | ${seconds(realtime.medianMs)} | ${seconds(realtime.p95Ms)} |

本组样本的首音等待中位数缩短 **${improvement?.toFixed(1) ?? '—'}%**。实时路径的静默指令判断中位数为 ${seconds(result.routeMedianMs)}，已计入首音等待。

## 连接状态

| 实时路径 | 成功 / 尝试 | 首音中位数 | 首音 P95 |
| --- | ---: | ---: | ---: |
| 每组首次连接 | ${cold.successful} / ${cold.attempted} | ${seconds(cold.medianMs)} | ${seconds(cold.p95Ms)} |
| 复用连接 | ${warm.successful} / ${warm.attempted} | ${seconds(warm.medianMs)} | ${seconds(warm.p95Ms)} |

首次连接组只有三条，不能据此估计稳定的尾部延迟。上游连接在录音前预热，所以此表仍统计提交后的首音；原始 prepareMs 是连接准备及分帧调度的近似耗时，不能当作纯握手耗时。旧路径每轮使用 HTTP 请求。

## 测量边界

- 计时从结束提交开始，到浏览器安排播放的首个非静音 PCM 样本为止；未测量扬声器实际发声，不包含教师说话时间。
- 旧路径等待完整 ASR 和回答，再请求带 Rhubarb 嘴型分析的 TTS；新路径包括静默判断及流式语音回答。浏览器使用同一 PCM 播放队列进行计时。
- 这是本地 HTTPS 开发环境的探索性顺序对比，期间有开发验证活动，并非隔离、随机交错的性能基准。旧路径三十条完整结果保留自初次运行，最终实时路径在修正路由与历史注入后重测。模型、网络、文本长度和账号负载都可能影响结果。
- 首轮实现存在跳过工具调用的问题，失败证据保存在 benchmark-initial.json 与 benchmark-routing-v2.json。最终统计只使用当前实现的实时复测；所有失败均计入成功率，不作为零延迟。
- 本次使用 qwen-audio-3.0-realtime-plus / longanqian。原路径和原音色继续保留，默认不切换。

## 功能验证

- 实际 Chromium 麦克风按键、同源 HTTPS WebSocket、流式字幕及播放通过；切回旧路径后可重新连接，未重放旧录音。
- 页面在生成结束后被外部翻动时，待播语音在两秒内停止。
- 真实本地 KWS 验证通过：唤醒前零上传、结束词恰好提交一次、取消不提交、关闭后释放全部麦克风轨道。
- 纯翻页动作执行一次、零音频；翻页并讲解执行一次，回答描述新页面的英法人口证据。
- API 78 项、前端 101 项测试通过；另行完成实时上下文回归、类型检查、生产构建和 git diff --check。

## 证据

- [逐轮数据](benchmark.json)、[汇总 JSON](summary.json)、[输入录音说明](fixtures.json)
- [真实问答与操作探针](probe.json)、[实际按键与界面验证](browser-report.json)、[真实本地关键词检测](kws-report.json)
- [桌面截图](classroom-desktop.png)、[窄屏截图](classroom-narrow.png)
- [API 测试](api-tests.log)、[实时与上下文回归](realtime-tests.log)、[前端测试](web-tests.log)、[构建日志](build.log)
`;
await writeFile(resolve(output,'report.md'),text);console.log(JSON.stringify(result));
