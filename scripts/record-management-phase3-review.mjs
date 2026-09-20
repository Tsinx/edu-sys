// Record only explicitly reviewed ranges. This script never infers review from file existence.
import fs from 'node:fs';
import crypto from 'node:crypto';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const imageRange=process.argv.find(x=>x.startsWith('--images='))?.slice(9);
if(imageRange){
 const [first,last]=imageRange.split('-').map(Number);
 if(!first||!last||first>last)throw Error('Use an explicitly reviewed inclusive image range.');
 for(let i=first;i<=last;i++){
  const file=`docs/management/images-phase3/mg-${i}.json`,r=JSON.parse(fs.readFileSync(file,'utf8'));
  if(hash(r.original)!==r.originalSha256||hash(r.adopted)!==r.webSha256)throw Error(`Asset changed: ${r.id}`);
  r.status='adopted';r.review={status:'reviewed',reviewedAt:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}),scope:'individual visual inspection of generated image or numbered contact sheet',checks:['composition supports stated teaching scene','no fabricated statistical evidence or corporate attribution','no unintended readable text','no obvious distracting anatomical or material defects'],originalSha256:r.originalSha256,webSha256:r.webSha256};write(file,r);
 }
 console.log(`Recorded visual image review ${first}–${last}.`);
}
