import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const sharp=require('sharp');
const root='output/port-lbl-qa';
const pdf=process.argv.includes('--pdf');
for(let group=0;group<6;group++){
  const tiles=[];
  for(let offset=0;offset<18;offset++){
    const page=group*18+offset+1;if(page>106)break;
    const label=page<=52?`II / ${page}`:`III / ${page-52}`;
    const file=pdf?`${root}/pdf-render/lesson${page<=52?2:3}-${String(page<=52?page:page-52).padStart(2,'0')}.png`:`${root}/page-${String(page).padStart(3,'0')}.png`;
    const shot=await sharp(file).resize(480,300).toBuffer();
    const caption=Buffer.from(`<svg width="480" height="28"><rect width="480" height="28" fill="#273b48"/><text x="14" y="20" fill="white" font-family="Arial" font-size="18">${label}</text></svg>`);
    const left=(offset%3)*490,top=Math.floor(offset/3)*338;
    tiles.push({input:shot,left,top},{input:caption,left,top:top+300});
  }
  await sharp({create:{width:1470,height:2028,channels:3,background:'#e8e7e1'}}).composite(tiles).png().toFile(`${root}/${pdf?'pdf-':''}contact-${group+1}.png`);
}
console.log('Six contact sheets written.');
