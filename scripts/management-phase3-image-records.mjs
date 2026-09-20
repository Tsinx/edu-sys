import fs from 'node:fs';
import briefs from '../docs/management/image-briefs-phase3.mjs';
fs.mkdirSync('docs/management/images-phase3',{recursive:true});
for(const brief of briefs){
 const file=`docs/management/images-phase3/${brief.id}.json`;
 if(fs.existsSync(file))continue;
 fs.writeFileSync(file,JSON.stringify({...brief,label:'艺术示意',status:'pending-generation'},null,2)+'\n');
}
console.log(JSON.stringify({briefs:briefs.length}));
