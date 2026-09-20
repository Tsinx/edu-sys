import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {PORT_LESSON_SIX_SLIDES as pages,PORT_LESSON_SIX_SOURCES as sources} from '../packages/course-content/src/port-lesson-six.js';
import {LESSON_SIX_AUDIO,getLessonSixFilm,lessonSixFilmDuration,lessonSixShotDuration,LESSON_SIX_FILM_SCRIPTS} from '../packages/course-content/src/port-lesson-six-film.js';
const root=fileURLToPath(new URL('../',import.meta.url));
let text='# 第六讲电影播片：分镜、字幕与固定旁白\n\n12个空间页；保留全讲48页、90分钟。旁白沿用项目默认中文授课音色；本地24kHz单声道WAV，无运行时语音服务依赖。课堂输出增益3倍，默认音量85%；全部源文件峰值×3低于1，无新增削波。\n\n点击播放才发声；暂停/拖动进度同时暂停或定位声音，拖动地球进入探索；继续时先用620毫秒回到镜头。教师默认有声，投影默认静音，跟随学生可自行开启旁白。播完停片，不自动翻页。\n\n“远洋网络”为教学概念端点，并非实际挂靠港；陆向和水运线均为教学联系示意。第29页默认叠加选择；第33页默认连贯对照，保留原上海/宁波舟山单独查看选项。第38页答案有独立分镜与音频，必须主动揭示后再播放；收起解析立即停止答案音频并返回问题片段。\n\n';
for(const n of Object.keys(LESSON_SIX_FILM_SCRIPTS).map(Number)){
 const page=pages[n-1]!,film=getLessonSixFilm(n,n===33?2:n===29?1:0)!,source=sources[page.source];
 text+=`## 第${n}页 · ${page.title}\n\n播片 ${Math.round(lessonSixFilmDuration(film)/1000)} 秒。来源：[${source.label}](${source.url})。${source.boundary}\n\n教师操作：播放建立场景；在节点或通道镜头暂停观察；需要改变角度时拖动探索，继续播放会回到当前分镜。${n===38?'本页先等待作答，不自动揭示答案。':'播片结束后根据画面进行解释或讨论。'}\n\n`;
 let start=0;for(const s of film.shots){const duration=lessonSixShotDuration(s),a=LESSON_SIX_AUDIO[s.id]!;text+=`### ${s.title} · ${(start/1000).toFixed(1)}—${((start+duration)/1000).toFixed(1)}秒\n\n字幕与旁白：${s.narration}\n\n镜头：纬度${s.focus.latitude}，经度${s.focus.longitude}，距离${s.focus.distance}；公开节点：${s.nodes.join('、')||'无'}；联系：${s.routes.join('；')||'无'}。\n\n音频：[${s.id}](../../apps/teacher-web/public${a.src})；实际声音${(a.durationMs/1000).toFixed(2)}秒；声音在分镜开始后0.2秒进入。\n\n`;start+=duration;}
}
text+='## 第38页揭示解析后的独立播片\n\n';for(const s of getLessonSixFilm(38,0,true)!.shots)text+=`- **${s.title}**：${s.narration}\n`;
text+='\n## 音频来源与检查边界\n\n音色：项目当前默认授课音色（voiceProfile=default）；模型与音色指纹见音频清单。56段旁白的正文、时长、SHA-256与资源路径记录在lesson-six-film-audio.json。波形和ASR转写属于客观核对；当前工具不支持音频感知，不能将其标为全部主观试听通过。用户已在本次会话实际试听第26页完整样音并确认“音色、语速和读音合适”；其他11页尚未取得人工逐段试听确认。\n';
await writeFile(root+'docs/course/port-management-lesson-six-film.md',text);
for(const [file,heading,body] of [
 ['teacher','教师播片操作更新','空间页改用全画幅分镜、字幕及固定旁白。逐页镜头、口播与时间点见[分镜讲稿](port-management-lesson-six-film.md)。下文原有空间页的教学问题保留，操作步骤以分镜讲稿为准。'],
 ['design','电影播片教学设计更新','第25、26、27、29、31—38页改用逐页分镜；播放约7—8分钟，计入原有90分钟授课时段。每段结束停片讨论；探索和一键跟上保留。详见[分镜与声音设计](port-management-lesson-six-film.md)。'],
 ['sources','电影播片来源补充','空间事实沿用下列来源。新增旁白为本课程逐句编写、既有TTS默认音色合成，非采访或真实港口录音；路线始终为教学联系示意。音频元数据、校验值和逐句出处见[分镜台账](port-management-lesson-six-film.md)。']
] as const){const p=root+`docs/course/port-management-lesson-six-${file}.md`;let original=await readFile(p,'utf8');original=original.replace(new RegExp(`\n## ${heading}[\\s\\S]*?\n---\n`),'');const end=original.indexOf('\n');original=original.slice(0,end+1)+`\n## ${heading}\n\n${body}\n\n---\n`+original.slice(end+1);await writeFile(p,original);}
// One complete review sample, with the same holds and output gain as classroom playback.
const film=getLessonSixFilm(26)!,parts:Buffer[]=[];for(const s of film.shots){const a=LESSON_SIX_AUDIO[s.id]!,wav=await readFile(root+'apps/teacher-web/public'+a.src),pcm=Buffer.from(wav.subarray(44));for(let i=0;i<pcm.length;i+=2)pcm.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(pcm.readInt16LE(i)*2.55))),i);parts.push(Buffer.alloc(9600),pcm,Buffer.alloc(Math.max(0,Math.round((lessonSixShotDuration(s)-a.durationMs-200)*24))*2));}
const pcm=Buffer.concat(parts),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);await writeFile(root+'output/port-lesson-six-film/lesson-26-review.wav',Buffer.concat([header,pcm]));
console.log('Updated film script, teaching design, sources and complete narration sample');
