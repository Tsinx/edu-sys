// Uses the configured teacher TTS endpoint to generate synthetic QA speech.
import { writeFile, mkdir } from 'node:fs/promises';
await mkdir('.runtime/kws', {recursive:true});
const phrases = {
  wakeXiaomai:'小麦老师。',
  wakeXiaomaiStrong:'小麦老师，请解释港口的作用，非常感谢。',
  wakeXiaomaiShort:'小麦老师，请翻到下一页，谢谢。',
  shortThanks:'谢谢。',
  thanksContinue:'谢谢，我再补充一点，请解释港口的作用。',
  thanksEveryone:'谢谢大家，我们继续看下一页的港口资料。',
  thanksNegative:'这个变化令人非常感慨。我们接着看港口的交通作用。谢谢大家。',
  xiaomaiRepeat:'请小麦老师解释这个问题，小麦老师，请再举一个例子。',
  continueSpeaking:'我再补充一点，请解释港口的作用。',
  cancel:'助教取消。',
  negative:'同学们，我们来看港口的定义。今天先观察这张图片，再讨论交通运输的变化。'
};
for (const [name,text] of Object.entries(phrases)) {
 const response=await fetch('http://127.0.0.1:4300/api/teacher/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error(String(response.status));
 const events=(await response.text()).split('\n').filter(line=>line.startsWith('data:')).map(line=>JSON.parse(line.slice(5)));
 const pcm=Buffer.concat(events.filter(x=>x.audioBase64).map(x=>Buffer.from(x.audioBase64,'base64')));
 if(!pcm.length)throw new Error('No audio');
 const wav=Buffer.alloc(44+pcm.length);wav.write('RIFF');wav.writeUInt32LE(36+pcm.length,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(24000,24);wav.writeUInt32LE(48000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);
 await writeFile(`.runtime/kws/${name}.wav`,wav);console.log(name,pcm.length);
}
