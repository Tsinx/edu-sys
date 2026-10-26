/** Exact grain counts and a deterministic, teacher-controlled 90-second story. */
export const WHEAT_STORY_DURATION_MS = 90_000;
export const WHEAT_STORY_SOURCE = 'https://mathworld.wolfram.com/WheatandChessboardProblem.html';
export const WHEAT_STORY_MARKS = [
 {label:'The promise',atMs:0},
 {label:'Start doubling',atMs:8_000},
 {label:'The first row',atMs:18_500},
 {label:'Half the board',atMs:54_875},
 {label:'The second half',atMs:56_000},
 {label:'The bill',atMs:76_000},
 {label:'The question',atMs:86_000}
] as const;
const sections = [
 {from:1,to:8,start:8_000,end:20_000},
 {from:9,to:16,start:20_000,end:38_000},
 {from:17,to:32,start:38_000,end:56_000},
 {from:33,to:64,start:56_000,end:76_000}
] as const;
const clampTime = (value:number) => Number.isFinite(value)?Math.max(0,Math.min(WHEAT_STORY_DURATION_MS,value)):0;
export function wheatSquareAt(timeMs:number):number {
 const t=clampTime(timeMs);
 if(t<8_000)return 1;
 for(const s of sections)if(t<s.end)return Math.min(s.to,s.from+Math.floor((t-s.start)/(s.end-s.start)*(s.to-s.from+1)));
 return 64;
}
export function wheatTimeForSquare(square:number):number {
 const n=Math.max(1,Math.min(64,Math.round(square)||1));
 const s=sections.find(s=>n>=s.from&&n<=s.to)!;
 return s.start+(n-s.from)/(s.to-s.from+1)*(s.end-s.start)+1;
}
export function wheatCounts(square:number) {
 if(!Number.isInteger(square)||square<1||square>64)throw new RangeError('Square must be an integer from 1 to 64.');
 const onSquare=1n<<BigInt(square-1),total=(1n<<BigInt(square))-1n;
 return {square,onSquare,total,onSquareText:onSquare.toLocaleString('en-US'),totalText:total.toLocaleString('en-US')};
}
export function wheatStoryBeat(timeMs:number) {
 const t=clampTime(timeMs);
 if(t<8_000)return {title:'THE PROMISE',lines:['A king offers a reward.','The inventor asks for one grain,','then twice as many on each next square.']};
 if(t<20_000)return {title:'ONE. TWO. FOUR. EIGHT.',lines:['Each square doubles the previous one.','The first few amounts look small.','Would you accept this promise?']};
 if(t<38_000)return {title:'THE REQUEST GROWS',lines:['The rule stays the same: multiply by 2.','The extra amount does not stay the same.','The king begins to count again.']};
 if(t<56_000)return {title:wheatSquareAt(t)===32?'HALF THE BOARD':'TOWARDS HALFWAY',lines:['Square 32 marks half the board.','From square 32, 32 doublings remain.','Does halfway mean half the total?']};
 if(t<76_000)return {title:'THE SECOND HALF',lines:['The next square exceeds everything','on all the earlier squares combined.','A small start can hide a huge promise.']};
 if(t<86_000)return {title:'THE BILL',lines:['The king has promised the whole board.','One square and the running total','are different quantities.']};
 return {title:'YOUR TURN',lines:['Why is the last square 2⁶³, not 2⁶⁴?','Which grows faster: add 1 or multiply by 2?','Can real resources double forever?']};
}
