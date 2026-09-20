import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='output/port-lesson-six-film',json=async n=>JSON.parse(await readFile(`${out}/${n}.json`,'utf8'));
const browser=await json('browser'),finalBrowser=await json('browser-films'),runtime=await json('regression'),interaction=await json('interactions'),audio=await json('audio-audit');
assert.equal(browser.results.length,472);assert.ok(finalBrowser.results.length>=110);assert.equal(runtime.pages.length,12);
for(const r of [browser,finalBrowser,runtime,interaction])assert.deepEqual(r.errors,[]);
assert.equal(audio.rows.length,56);assert.ok(audio.rows.every(r=>r.hashValid&&r.clippedSamples===0&&r.peak*3<1));assert.ok(audio.durations.every(r=>r.durationMs>=35000&&r.durationMs<=(r.page===26?60000:55000)));
for(const [file,pass] of [['web-tests',127],['api-tests-final',89],['final-unit',7]]){const s=await readFile(`output/port-lesson-six-film-${file}.log`,'utf8');assert.match(s,new RegExp(`ℹ pass ${pass}`));assert.match(s,/ℹ fail 0/);}
assert.match(await readFile('output/port-lesson-six-film-build-final.log','utf8'),/built in/);assert.equal((await readFile('output/port-lesson-six-film-scoped-diff-check.log','utf8')).trim(),'');
const manifest=JSON.parse(await readFile('packages/course-content/src/lesson-six-film-audio.json','utf8'));
for(const a of Object.values(manifest)){assert.equal(createHash('sha256').update(await readFile('apps/teacher-web/dist'+a.src)).digest('hex'),a.sha256);}
const globalDiff=(await readFile('output/port-lesson-six-film-diff-check.log','utf8')).trim(),stamp=new Date().toISOString();
const section=`
## 电影式分镜与固定旁白改造验收

记录时间：${stamp}。本节对应当前12页电影式播片；下文保留早期课件和地球仪验收，空间页呈现与播放方式以本节为准。

- 第25、26、27、29、31—38页改为全画幅地球仪、连续镜头、逐镜字幕和预生成旁白。主片合计${(audio.durations.reduce((s,r)=>s+r.durationMs,0)/60000).toFixed(2)}分钟，计入原90分钟。第26页约58秒，其余约35—42秒。播完停在本页，48页及原有标识不变。
- 56段24kHz单声道本地WAV已生成并进入生产构建；保留文本哈希、文件哈希、模型和默认音色指纹。[分镜讲稿](port-management-lesson-six-film.md)列出逐镜字幕、口播、资源和时间点；[音频清单](../../packages/course-content/src/lesson-six-film-audio.json)可逐项复核。
- 用户已实际试听第26页完整样音，确认“音色、语速和读音合适”。其他11页尚无人工逐段试听确认。全部56段完成波形、SHA-256与ASR转写核对；转写差异主要为数字写法、同音字，另有“再观察/下观察”等待人工听辨项。ASR核对不替代主观试听。
- 港口、内陆节点与通道逐镜展开，水运青蓝、陆向砂金。“远洋网络”为概念端点；所有联系线为教学示意，不表示实际航迹、即时班次或独占腹地。第38页问题与答案使用独立片段，答案需揭示后主动播放。

| 检查 | 当前结果与证据 |
| --- | --- |
| 48页三模式、双宽度与选项/解析 | [472个状态通过](../../output/port-lesson-six-film/browser.json)；桌面1600×1100、窄屏390×844 |
| 标签调整后的12页复查 | [${finalBrowser.results.length}个状态通过](../../output/port-lesson-six-film/browser-films.json)，含教师/投影/学生阅读与起中终点 |
| 12页实际音频播放 | [逐页起点、中间定位发声、终点停留通过](../../output/port-lesson-six-film/regression.json) |
| 教师与学生课堂 | [跟随、声音自主开启、自由浏览隔离、刷新通过](../../output/port-lesson-six-film/interactions.json) |
| 播放、暂停、拖动、重播、探索返回 | 同一时钟协调镜头、线条、字幕和音频；上述交互检查通过，无叠加发声 |
| 声画与跟随计时 | 该次本地测试音频调度估算偏差${interaction.initialAudioSkewMs}ms；一键恢复相机${interaction.followRestoreMs}ms；不是扬声器到耳朵的声学测量或跨设备保证 |
| 权限与公开内容 | 课程上下文及API测试检查教师身份、片段/选项匹配、旧页拒绝、隐藏解析和未来字幕保护 |
| 失败场景 | 音频404提示并可静音继续；禁用WebGL及减少动态模式保留平面分镜、字幕和旁白；未点击前无自动发声 |
| 第一讲回归 | 原英法比较分镜可启动、暂停、继续、推进；未改现场LAM旁白逻辑 |
| 测试 | Web127/127、API89/89，最终第6讲7/7；学生文案审计包含在渲染测试中 |
| 类型及构建 | [最终pnpm build通过](../../output/port-lesson-six-film-build-final.log)，含全项目类型检查；56个构建音频与源文件哈希一致 |
| 差异格式 | [本次相关文件通过](../../output/port-lesson-six-film-scoped-diff-check.log)；全工作区${globalDiff?'发现并行文件格式问题，见下文':'通过'} |

全讲截图：[1—12](../../output/port-lesson-six-film/contact-1.png)、[13—24](../../output/port-lesson-six-film/contact-2.png)、[25—36](../../output/port-lesson-six-film/contact-3.png)、[37—48](../../output/port-lesson-six-film/contact-4.png)。重点：[全国定位](../../output/port-lesson-six-film/slide-26.png)、[相邻门户](../../output/port-lesson-six-film/slide-33.png)、[水海接续](../../output/port-lesson-six-film/slide-35.png)、[窄屏学生](../../output/port-lesson-six-film/classroom-student-390.png)、[平面备选](../../output/port-lesson-six-film/fallback-webgl.png)。

运行环境为本机Playwright Chromium、ANGLE D3D11。默认SwiftShader双窗口冷加载曾超时，改用本机Intel显卡完成运行验收。API并行测试曾出现既有Rhubarb CLI未返回嘴型数据；未修改该模块，随后串行完整89项通过。[初次记录](../../output/port-lesson-six-film-api-tests.log)与[最终记录](../../output/port-lesson-six-film-api-tests-final.log)均保留。

${globalDiff?`全工作区差异检查当前输出：

${globalDiff}

并行管理学文件未由本任务改动。`:'全工作区git diff --check通过。'}

尚未执行其余11页人工逐段试听、真实90分钟授课、校园多终端负载、真实手机与其他浏览器内核验收。390px为视口模拟。未制作MP4/PPT，未部署、提交或推送。

复查脚本：port-lesson-six-film-browser.mjs（全讲/--films-only）、port-lesson-six-film-interactions.mjs（4316隔离API）、port-lesson-six-film-regression.mjs、port-lesson-six-film-audio-audit.mts。验收文件哈希见[manifest.json](../../output/port-lesson-six-film/manifest.json)。

---
`;
const qa='docs/course/port-management-lesson-six-qa.md';let old=await readFile(qa,'utf8');old=old.replace(/\n## 电影式分镜与固定旁白改造验收[\s\S]*?\n---\n/,'');const at=old.indexOf('\n');await writeFile(qa,old.slice(0,at+1)+section+old.slice(at+1));
const files=[...['port-lesson-six.ts','port-lesson-six-film.ts','lesson-six-film-audio.json','index.ts'].map(n=>'packages/course-content/src/'+n),'packages/contracts/src/index.ts',...['store.ts','seed.ts','assistant/prompts.ts'].map(n=>'apps/platform-api/src/'+n),'apps/platform-api/test/port-lesson-six.test.ts','apps/teacher-web/src/features/globe/InteractiveEarthGlobe.tsx','apps/teacher-web/src/features/classroom/StudentClassroom.tsx','apps/teacher-web/src/port-lesson-six-preview.tsx',...['port-lesson-six.test.tsx','port-lesson-six-film.test.tsx'].map(n=>'apps/teacher-web/test/'+n),...(await readdir('apps/teacher-web/src/features/port-lesson-six')).map(n=>'apps/teacher-web/src/features/port-lesson-six/'+n),...['teacher','design','sources','film','qa'].map(n=>`docs/course/port-management-lesson-six-${n}.md`),...Object.values(manifest).map(a=>'apps/teacher-web/public'+a.src),...(await readdir('scripts')).filter(n=>n.startsWith('port-lesson-six-film-')).map(n=>'scripts/'+n),...(await readdir(out)).filter(n=>/^(browser(-films)?|interactions|regression|audio-audit)\.json$|^(slide-|contact-|classroom-|fallback-|lesson-one-regression).*\.png$/.test(n)).map(n=>out+'/'+n),...['web-tests','api-tests-final','final-unit','build-final','scoped-diff-check','diff-check'].map(n=>`output/port-lesson-six-film-${n}.log`)];
const entries=await Promise.all(files.map(async path=>{const b=await readFile(path);return{path,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}));
await writeFile(out+'/manifest.json',JSON.stringify({generatedAt:stamp,scope:'Local cinematic lesson-six acceptance snapshot; concurrent changes retained',humanListening:{page26:'User confirmed voice, pace and pronunciation',otherPages:'Pending'},browserStates:browser.results.length,finalFilmStates:finalBrowser.results.length,files:entries},null,2));console.log('PASS film acceptance and '+entries.length+' file hashes');
