import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const film=path.resolve('apps/teacher-web/public/course-assets/international-mathematics/film');
for(let lesson=1;lesson<=16;lesson++){const num=String(lesson).padStart(2,'0'),source=path.join(film,`lesson-${num}-intro.mp4`),temp=path.join(film,`lesson-${num}-mixed.tmp.mp4`),speech=path.join(film,`lesson-${num}-intro.wav`),sfx=path.join(film,'transition-sound-design.wav');const result=spawnSync('ffmpeg',['-y','-v','error','-i',source,'-i',speech,'-i',sfx,'-filter_complex','[1:a][2:a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mix]','-map','0:v','-map','[mix]','-c:v','copy','-c:a','aac','-b:a','160k','-t','90','-movflags','+faststart',temp],{stdio:'inherit',windowsHide:true});if(result.status!==0)throw Error(`Audio mix failed ${num}`);fs.copyFileSync(temp,source);fs.unlinkSync(temp);console.log(`Final mix ${num}`);}
