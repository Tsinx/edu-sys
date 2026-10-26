import {useId} from 'react';
import {wheatCounts,wheatSquareAt,wheatStoryBeat,wheatTimeForSquare} from '@edu/course-content/international-mathematics';

const C={ink:'#18232c',blue:'#2357d8',yellow:'#f5d349',coral:'#ee653f',green:'#14877b',paper:'#fffdf7'};
const groups=(number:string)=>{
 const parts=number.split(',');
 return parts.length>5?[parts.slice(0,4).join(',')+',',parts.slice(4).join(',')]:[number];
};
function Grain({x,y,scale=1,angle=-25}:{x:number;y:number;scale?:number;angle?:number}) {
 return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
  <ellipse rx="4.5" ry="9" fill={C.yellow} stroke="#8d5a16" strokeWidth="1.3"/>
  <path d="M0 -6V6" stroke="#b17d25" strokeWidth="1"/>
 </g>;
}
function Count({value,x,y}:{value:string;x:number;y:number}) {
 return <text x={x} y={y} fill={C.ink} fontSize={value.length>12?43:65} fontWeight="800" letterSpacing="-1.6" style={{fontVariantNumeric:'tabular-nums'}}>
  {groups(value).map((line,i)=><tspan key={i} x={x} dy={i?47:0}>{line}</tspan>)}
 </text>;
}

/** Illustration only: no teacher controls or private teaching metadata in the canvas. */
export function WheatChessboardStory({positionMs=0}:{positionMs?:number}) {
 const id=useId(),n=wheatSquareAt(positionMs),counts=wheatCounts(n),beat=wheatStoryBeat(positionMs);
 const worried=n>=17,shocked=n>=33;
 const pulse=Math.max(0,Math.min(1,1-(positionMs-wheatTimeForSquare(n))/550));
 const active=1+Math.sin(pulse*Math.PI)*.09;
 return <svg className="im-wheat-story" viewBox="0 0 1480 620" role="img" aria-labelledby={`${id}-title ${id}-description`}>
  <title id={`${id}-title`}>{`The king, the chessboard and the wheat: square ${n} of 64`}</title>
  <desc id={`${id}-description`}>{counts.onSquareText} grains on square {n}; {counts.totalText} grains in total through this square. Every next square doubles. A traditional legend; piles are symbolic and counts are exact.</desc>
  <defs><pattern id={`${id}-seeds`} width="26" height="32" patternUnits="userSpaceOnUse"><ellipse cx="11" cy="15" rx="4" ry="9" fill={C.yellow} transform="rotate(-30 11 15)"/></pattern></defs>
  <rect x="0" y="0" width="1480" height="620" rx="24" fill={C.paper}/>
  {/* A paper-cut palace and an increasingly alarmed king. */}
  <path d="M6 565V170L68 122V565M232 565V170L294 122V565" fill="#dfe8fd"/>
  <path d="M1 166L36 111L72 166M222 166L258 111L296 166" fill={C.blue}/>
  <rect x="18" y="38" width="263" height="90" rx="20" fill={shocked?C.coral:C.blue}/>
  <path d="M170 126L187 155L204 126" fill={shocked?C.coral:C.blue}/>
  <text x="149" y="75" textAnchor="middle" fill="white" fontSize="24" fontWeight="700">{shocked?'HOW much?!':worried?'Still doubling?':'A little wheat?'}</text>
  <text x="149" y="105" textAnchor="middle" fill="white" fontSize="21">{shocked?'Count that again.':worried?'Only halfway?':'Of course!'}</text>
  <g transform={`translate(146 365) rotate(${shocked?-4:worried?2:0})`}>
   <rect x="-96" y="-25" width="192" height="196" rx="22" fill={C.coral}/>
   <path d="M-77 145L-60 7L0 56L60 7L77 145" fill={C.blue}/>
   <path d="M-74 16L-34 -22L0 49L34 -22L74 16L47 42L0 65L-47 42Z" fill="#fff4ce"/>
   <ellipse cx="0" cy="-74" rx="61" ry="72" fill="#e7b78d"/>
   <path d="M-59 -113L-73 -173L-30 -151L-1 -192L29 -151L72 -173L59 -111Z" fill={C.yellow} stroke={C.ink} strokeWidth="4"/>
   <circle cx="0" cy="-151" r="7" fill={C.coral}/>
   <path d="M-53 -76Q-40 -2 0 18Q40 -2 53 -76L33 -48L0 -31L-34 -48Z" fill="#fffdf7"/>
   <ellipse cx="-22" cy="-79" rx={shocked?8:6} ry={shocked?11:7} fill={C.ink}/>
   <ellipse cx="22" cy="-79" rx={shocked?8:6} ry={shocked?11:7} fill={C.ink}/>
   <path d={worried?'M-35 -100L-12 -107M12 -107L35 -100':'M-34 -99L-12 -99M12 -99L34 -99'} stroke={C.ink} strokeWidth="5" strokeLinecap="round"/>
   {shocked?<ellipse cx="0" cy="-37" rx="12" ry="17" fill={C.ink}/>:<path d={worried?'M-14 -32Q0 -45 14 -32':'M-16 -43Q0 -24 16 -43'} fill="none" stroke={C.ink} strokeWidth="4"/>}
  </g>
  {shocked&&<path d="M280 521L218 469L165 488L112 440L51 480L0 465V586H295Z" fill={`url(#${id}-seeds)`}/>}
  <text x="149" y="592" textAnchor="middle" fontSize="19" fontWeight="700" fill={C.blue}>A TRADITIONAL LEGEND</text>
  {/* All 64 squares remain visible. The first five show literal grain counts. */}
  <g transform="translate(319 23)">
   <rect x="-8" y="-8" width="592" height="592" rx="9" fill={C.ink}/>
   {Array.from({length:64},(_,i)=>{
    const square=i+1,cx=(i%8)*72,cy=Math.floor(i/8)*72,filled=square<=n,isActive=square===n,dark=(i%8+Math.floor(i/8))%2===1;
    return <g key={square} transform={`translate(${cx} ${cy})`}>
     <rect width="72" height="72" fill={filled?(dark?'#b6c9f8':'#e5edff'):(dark?'#e6dfcf':'#f7f1e3')}/>
     {isActive&&<rect x="3" y="3" width="66" height="66" fill={C.yellow} stroke={C.coral} strokeWidth="5"/>}
     <text x="7" y="16" fontSize="12" fill={C.ink} fontWeight={isActive?'800':'400'}>{square}</text>
     {filled&&(square<=5?Array.from({length:2**(square-1)},(_,j)=>{
      const columns=Math.min(4,2**(square-1)),rows=Math.ceil(2**(square-1)/columns);
      return <Grain key={j} x={36+(j%columns-(columns-1)/2)*11} y={37+(Math.floor(j/columns)-(rows-1)/2)*10} scale={.57}/>;
     }):<g><path d={`M12 52Q25 ${46-square*.32} 36 ${43-square*.37}Q48 ${46-square*.32} 60 52Z`} fill="#d9a328"/><text x="36" y="66" textAnchor="middle" fontSize="14" fontWeight="700" fill={C.ink}>2<tspan baselineShift="super" fontSize="10">{square-1}</tspan></text></g>)}
    </g>;
   })}
  </g>
  {positionMs>=8000&&positionMs<76000&&Array.from({length:5},(_,i)=>{
   const p=(positionMs/1050+i*.19)%1,u=1-p,endX=355+((n-1)%8)*72,endY=59+Math.floor((n-1)/8)*72;
   return <Grain key={i} x={u*u*250+2*u*p*430+p*p*endX} y={u*u*350+2*u*p*70+p*p*endY} scale={.85} angle={-50+p*130}/>;
  })}
  <g transform={`translate(1155 166) scale(${active}) translate(-1155 -166)`}>
   <text x="940" y="36" fill={C.blue} fontSize="19" fontWeight="800" letterSpacing="2">{beat.title}</text>
   <text x="940" y="87" fill={C.ink} fontSize="33" fontWeight="700">Square {n} <tspan fill="#5b6470" fontSize="22">of 64</tspan></text>
   <Count value={counts.onSquareText} x={940} y={154}/>
   <text x="941" y="233" fontSize="22" fill={C.blue}>grains on this square · 2<tspan baselineShift="super" fontSize="15">{n-1}</tspan></text>
  </g>
  <rect x="924" y="264" width="539" height="177" rx="18" fill="#edf2e6"/>
  <text x="942" y="297" fontSize="18" fontWeight="800" fill={C.green}>RUNNING TOTAL · SQUARES 1–{n}</text>
  <Count value={counts.totalText} x={941} y={352}/>
  <text x="941" y="423" fontSize="20" fill={C.green}>grains altogether · 2<tspan baselineShift="super" fontSize="14">{n}</tspan><tspan> − 1</tspan></text>
  {beat.lines.map((line,i)=><text key={i} x="940" y={485+i*31} fontSize="21" fill={C.ink}>{line}</text>)}
  <text x="940" y="601" fontSize="17" fill="#5b6470">Piles are symbolic. Counts are exact.</text>
 </svg>;
}
