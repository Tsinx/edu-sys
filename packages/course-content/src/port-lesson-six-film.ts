import audioData from './lesson-six-film-audio.json' with {type:'json'};
import type {LessonSixCamera} from './port-lesson-six.js';

export interface LessonSixFilmState {clipId:string;status:'paused'|'playing';elapsedMs:number;startedAt:number|null;runId:string}
export interface LessonSixShot {id:string;title:string;caption:string;narration:string;focus:LessonSixCamera;nodes:readonly string[];routes:readonly string[];minMs:number}
export interface LessonSixFilm {id:string;shots:readonly LessonSixShot[]}
export interface LessonSixAudio {src:string;durationMs:number;sha256:string;textSha256:string;voiceProfile:string;model:string}
export const LESSON_SIX_AUDIO=audioData as Record<string,LessonSixAudio>;
const national=[31,113.5,2.12] as const,delta=[31,118,1.72] as const;
const shot=(id:string,title:string,narration:string,focus:readonly[number,number,number],nodes:string[],routes:string[]=[],minMs=8000,caption=narration):LessonSixShot=>({id,title,caption,narration,focus:{latitude:focus[0],longitude:focus[1],distance:focus[2]},nodes,routes,minMs});
const scripts:Record<number,LessonSixShot[]>={
25:[
 shot('25-a','港口面向哪里？','先把视线放到中国。海岸上的港口连接远洋，内陆的工厂与市场，也通过运输网络与它发生联系。',[29,112,3.45],[]),
 shot('25-b','货物在港口交接','沿海的上海和内陆的重庆，都承担货物交接。港口的位置是起点，我们还要追问货物从哪里来。',national,['shanghai','chongqing']),
 shot('25-c','联系深入内陆','沿长江展开，武汉、南京与上下游节点连接起来。货源和市场并不只集中在码头旁边。',national,['chongqing','wuhan','nanjing','shanghai'],['chongqing--wuhan--nanjing--shanghai']),
 shot('25-d','腹地：运输联系形成的区域','由港口服务的货源与市场，通过运输联系形成腹地。腹地是联系范围，并不是港口拥有的一块行政辖区。',national,['chongqing','wuhan','nanjing','shanghai'],['chongqing--wuhan--nanjing--shanghai'])],
26:[
 shot('26-a','从地球，看向中国沿海','从全球转向中国沿海。接下来，用五大区域港口群框架，认识不同方向上的海陆门户。',[28,113,3.6],[],[],6500),
 shot('26-b','环渤海港口群','先看北方的环渤海地区。大连、天津和青岛，是认识这一港口群的代表节点。',[38,119,1.85],['dalian','tianjin','qingdao'],[],6500),
 shot('26-c','长三角港口群','镜头向南来到长三角。上海与宁波舟山相邻，分别通过多种运输方式联系内陆。',[31,120,1.72],['shanghai','ningbo'],[],6500),
 shot('26-d','东南沿海港口群','继续沿海岸南下。福州与厦门，帮助我们定位东南沿海港口群。',[26,119,1.8],['fuzhou','xiamen'],[],6000),
 shot('26-e','珠三角港口群','再向南，广州与深圳连接珠三角的生产和市场，也接入更广的运输网络。',[23,113.5,1.8],['guangzhou','shenzhen'],[],6000),
 shot('26-f','西南沿海港口群','转向西南沿海，定位湛江和北部湾。这一方向提供了联系西南地区的沿海门户。',[22,109.5,1.9],['zhanjiang','qinzhou'],[],6500),
 shot('26-g','五大区域，多个门户','拉回全国。这个二零零六年的布局框架帮助我们认识位置，不表示腹地独占，也不是最新项目清单。',national,['dalian','tianjin','qingdao','shanghai','ningbo','fuzhou','xiamen','guangzhou','shenzhen','zhanjiang','qinzhou'],[],7000)],
27:[
 shot('27-a','先看海港附近','从上海港开始。港口附近的工厂、仓库和市场，可以通过公路完成集货与配送。',[31.2,121,1.58],['shanghai']),
 shot('27-b','邻近联系：集货与配送','镜头向内陆移动。邻近区域提供直接联系，但不能用一个固定半径，划定所有货物的腹地。',delta,['shanghai','nanjing']),
 shot('27-c','干线运输，把联系带远','沿江看向武汉和重庆。铁路与内河干线能够连接更远的内陆节点，再由当地运输完成集散。',national,['shanghai','nanjing','wuhan','chongqing','hefei'],['shanghai--nanjing--wuhan--chongqing','hefei--shanghai']),
 shot('27-d','干线与末端共同连接','近处的接驳和远处的干线，处在同一运输网络中。判断腹地，需要同时看通道条件与实际服务。',national,['shanghai','nanjing','wuhan','chongqing','hefei'],['shanghai--nanjing--wuhan--chongqing','hefei--shanghai'])],
29:[
 shot('29-a','同一个货源地','把货源地固定在合肥地区。起点不变，货物可以比较不同沿海门户提供的运输服务。',delta,['hefei']),
 shot('29-b','一个联系方向：上海','先观察通向上海的联系。这里只展示可以比较的方向，不把一条示意线当成可直接订购的产品。',delta,['hefei','shanghai'],['hefei--shanghai']),
 shot('29-c','另一个联系方向：宁波舟山','再加入宁波舟山。同一个内陆地区可能联系多个港口，因此腹地可以重叠。',delta,['hefei','shanghai','ningbo'],['hefei--shanghai','hefei--ningbo']),
 shot('29-d','比较哪些条件？','两种联系已经摆在一起。请比较接驳费用、班次和等待，再考虑货物的时效要求与服务可靠性。',delta,['hefei','shanghai','ningbo'],['hefei--shanghai','hefei--ningbo'])],
31:[
 shot('31-a','上海：长江口门户','先定位上海。长江口的区位，使它成为观察内河货流怎样接上海运的重要门户。',[31,121,1.62],['shanghai']),
 shot('31-b','沿江展开，连接内陆','镜头沿江向西。南京、武汉等节点，把不同区域的货流接入通向沿海的运输联系。',[31,117.5,1.82],['shanghai','nanjing','wuhan'],['wuhan--nanjing--shanghai']),
 shot('31-c','合肥案例：内河通道接入','再看合肥地区。公开的派河航线资料，提供了通过内河通道联系上海港的案例。',delta,['shanghai','nanjing','wuhan','hefei'],['wuhan--nanjing--shanghai','hefei--nanjing']),
 shot('31-d','内河货流，接入海运','这些联系说明腹地怎样通过运输组织延伸。图中节点和线路是教学示意，不代表当前班期或某票货物的实际路径。',[31,119,1.87],['shanghai','nanjing','wuhan','hefei'],['wuhan--nanjing--shanghai','hefei--nanjing'])],
32:[
 shot('32-a','宁波舟山：沿海门户','镜头转向浙江沿海的宁波舟山港。认识港口之后，再向内陆寻找与它连接的货源节点。',[29.8,122,1.62],['ningbo']),
 shot('32-b','义乌：内陆货源节点','义乌是观察内陆集货联系的一个节点。货物先组织起来，再通过干线运输接入海港。',[30,120,1.65],['ningbo','yiwu'],['yiwu--ningbo']),
 shot('32-c','平舆案例：海铁联运','继续向内陆看，河南平舆的公开案例展示了外贸产品的海铁联运联系。金色线表示陆向联系。',[32,118,1.82],['ningbo','yiwu','pingyu'],['yiwu--ningbo','pingyu--ningbo']),
 shot('32-d','港站衔接，比距离更具体','内陆港站、铁路和海港共同完成衔接。联系可以延伸很远，但不能由历史报道推定今天仍有相同班次。',[31,118.5,1.88],['ningbo','yiwu','pingyu'],['yiwu--ningbo','pingyu--ningbo'])],
33:[
 shot('33-a','两座相邻的沿海门户','上海与宁波舟山距离相近。我们比较两组公开案例，观察它们怎样把内陆货源接到海港。',delta,['shanghai','ningbo']),
 shot('33-b','上海案例：沿江与支流水网','先看上海案例。沿江节点与合肥地区的内河联系，展示了水网衔接海运的组织方式。',[31,117.5,1.82],['shanghai','nanjing','wuhan','hefei'],['wuhan--nanjing--shanghai','hefei--nanjing']),
 shot('33-c','宁波舟山案例：港站与铁路','转向宁波舟山案例。义乌与平舆等内陆节点，通过港站与铁路联系沿海门户。',[31,118.5,1.82],['ningbo','yiwu','pingyu'],['yiwu--ningbo','pingyu--ningbo']),
 shot('33-d','案例有侧重，方式不排他','把两组联系放回同一幅图。两港都具有多种集疏运方式，不能把案例侧重说成只能走水路或只能走铁路。',[31,118,1.95],['shanghai','ningbo','nanjing','wuhan','hefei','yiwu','pingyu'],['wuhan--nanjing--shanghai','hefei--nanjing','yiwu--ningbo','pingyu--ningbo'])],
34:[
 shot('34-a','重庆果园港：内陆交接节点','把镜头推进重庆果园港。它位于长江沿线，是观察水运、铁路与公路怎样在内陆衔接的节点。',[29.6,106.8,1.62],['chongqing']),
 shot('34-b','水富方向：内河水运','先看水富方向的水运联系。青蓝线表示内河运输，抵达果园港后，货物还可以接续其他运输环节。',[29.5,106,1.68],['chongqing','shuifu'],['shuifu--chongqing']),
 shot('34-c','西南、西北：陆向联系','再向西南和西北展开。以成都、西安方向定位内陆联系，金色线表示陆向组织，不是沿线的真实行车轨迹。',[31,106.5,1.84],['chongqing','shuifu','chengdu','xian'],['shuifu--chongqing','chengdu--chongqing','xian--chongqing']),
 shot('34-d','水、铁、公在这里接续','果园港的作用在于连接运输方式与货源。内河船、铁路和公路可以在这里接续，远洋船并不因此驶入重庆。',[30.5,107,1.9],['chongqing','shuifu','chengdu','xian'],['shuifu--chongqing','chengdu--chongqing','xian--chongqing'])],
35:[
 shot('35-a','从内陆节点出发','跟随一个教学运输单元，从重庆果园港出发。这是一条说明衔接关系的示意链，不对应某票真实货物。',[29.6,106.8,1.65],['chongqing']),
 shot('35-b','沿江运输，经过内陆节点','沿长江向东，经过武汉、南京方向的节点。运输安排仍要考虑适航条件、组织衔接和后续窗口。',[30.8,114,1.9],['chongqing','wuhan','nanjing'],['chongqing--wuhan--nanjing--shanghai']),
 shot('35-c','上海：换装与接续','抵达上海，并不意味着全程完成。内河运输要与适合的海运服务接续，港口组织换装与交接。',[31.2,121,1.67],['nanjing','shanghai'],['chongqing--wuhan--nanjing--shanghai']),
 shot('35-d','接入更广的海运网络','镜头拉远，海港把内陆运输链接入远洋网络。判断效率，要看全程交付，不能只看某一处是否更快。',[28,122,3.5],['chongqing','wuhan','nanjing','shanghai','ocean'],['chongqing--wuhan--nanjing--shanghai','shanghai--ocean'])],
36:[
 shot('36-a','天津港：渤海门户','向北定位天津港。它位于渤海湾，是理解北方货源与海运联系的重要门户。',[39,117.7,1.68],['tianjin']),
 shot('36-b','京津冀：邻近生产与消费','先看邻近区域。京津冀的生产与消费，通过公路、铁路等运输方式与港口联系。',[39.6,116.5,1.72],['tianjin','beijing'],['beijing--tianjin']),
 shot('36-c','向三北地区延伸','再向内陆展开，以呼和浩特方向定位延伸联系。铁路和内陆节点让腹地越过港口附近的区域。',[40,114,1.9],['tianjin','beijing','hohhot'],['beijing--tianjin','hohhot--tianjin']),
 shot('36-d','门户联系，需要按货类判断','天津港的门户定位不能化成一条独占边界。不同货类、服务和运输条件，会形成不同的实际联系范围。',[39,115,2.02],['tianjin','beijing','hohhot'],['beijing--tianjin','hohhot--tianjin'],11000)],
37:[
 shot('37-a','青岛港：山东沿海门户','镜头来到山东沿海，定位青岛港。接下来观察它与沿黄地区之间的陆向联系。',[36,120.2,1.68],['qingdao']),
 shot('37-b','向太原方向展开','先向太原方向看。内陆货源通过陆向运输联系海港，港口服务可以越过邻近地区。',[37,116,1.83],['qingdao','taiyuan'],['taiyuan--qingdao']),
 shot('37-c','向西安方向延伸','再向西安方向延伸。公开资料支持青岛与沿黄地区的联系，但这些线不是当前列车的实际运行轨迹。',[36,114,1.98],['qingdao','taiyuan','xian'],['taiyuan--qingdao','xian--qingdao']),
 shot('37-d','沿黄联系，不等于沿黄河航运','沿黄描述区域联系，不表示集装箱沿黄河航行到青岛。请区分区域名称、具体通道和实际运输方式。',[36,115,2.08],['qingdao','taiyuan','xian'],['taiyuan--qingdao','xian--qingdao'])],
38:[
 shot('38-a','用位置，找出运输联系','回到全国，观察即将出现的编号。请用一个港口名称，加上一种联系通道，说明你的判断。',national,[],[],7500),
 shot('38-b','① 位于长江上游的节点','观察编号一的位置。哪个港口节点位于长江上游？它可以怎样连接内河与陆向运输？',[30.5,108,2.02],['chongqing'],[],8000),
 shot('38-c','② 联系沿黄陆向货源的门户','再观察编号二。哪个沿海门户联系沿黄地区的陆向货源？解释时，请区分区域与运输方式。',[36,117,2.02],['qingdao'],[],8000),
 shot('38-d','③ 两个相邻门户','最后观察编号三标记的相邻门户。它们分别有哪些代表接续案例？请先作答，再核对解析。',national,['chongqing','qingdao','shanghai','ningbo'],[],9500)]
};
const answer=[
 shot('38-answer-a','① 重庆果园港','编号一是重庆果园港。它位于长江沿线，通过内河水运和铁路、公路联系内陆货源。',[30.5,107,1.85],['chongqing','shuifu','chengdu'],['shuifu--chongqing','chengdu--chongqing']),
 shot('38-answer-b','② 青岛港','编号二是青岛港。沿黄地区的代表案例强调陆向联系，不能理解成集装箱沿黄河航行到港。',[36,115,2.02],['qingdao','taiyuan','xian'],['taiyuan--qingdao','xian--qingdao']),
 shot('38-answer-c','③ 上海与宁波舟山','编号三是上海港与宁波舟山港。可以比较沿江内河与海铁联运案例，但两港的运输方式都不止一种。',delta,['shanghai','ningbo','hefei','yiwu'],['hefei--shanghai','yiwu--ningbo']),
 shot('38-answer-d','位置、区域、通道、货流','核对答案时，把港口位置、联系区域、运输通道和代表货流连起来。腹地描述运输联系，不代表行政归属。',national,['chongqing','qingdao','shanghai','ningbo'])];
export const LESSON_SIX_FILM_SCRIPTS=scripts;
export const LESSON_SIX_FILM_ANSWERS=answer;
export function getLessonSixFilm(n:number,option=0,revealed=false):LessonSixFilm|undefined{
 if(!scripts[n])return undefined;
 if(n===38&&revealed)return{id:'l6-film-38-answer',shots:answer};
 if(n===33&&option<2)return{id:`l6-film-33-${option}`,shots:scripts[option===0?31:32]!};
 if(n===29&&option===0)return{id:'l6-film-29-single',shots:[scripts[29]![0]!,scripts[29]![1]!,shot('29-single-c','还需要哪些信息？','目前只显示一个联系方向。要比较其他门户，还需要接驳费用、服务班次和货物时效等条件。',delta,['hefei','shanghai'],['hefei--shanghai'],16000)]};
 return{id:`l6-film-${n}`,shots:scripts[n]!};
}
export function lessonSixShotDuration(s:LessonSixShot){return Math.max(s.minMs,(LESSON_SIX_AUDIO[s.id]?.durationMs??s.minMs-700)+700);}
export function lessonSixFilmDuration(f:LessonSixFilm){return f.shots.reduce((sum,s)=>sum+lessonSixShotDuration(s),0);}
export function lessonSixFilmElapsed(f:LessonSixFilm,state:LessonSixFilmState,now=Date.now()){return Math.min(lessonSixFilmDuration(f),Math.max(0,state.elapsedMs+(state.status==='playing'&&state.startedAt!==null?Math.max(0,now-state.startedAt):0)));}
export function lessonSixFilmFrame(f:LessonSixFilm,elapsedMs:number){let start=0;for(let i=0;i<f.shots.length;i++){const s=f.shots[i]!,duration=lessonSixShotDuration(s);if(elapsedMs<start+duration||i===f.shots.length-1)return{shot:s,index:i,start,duration,localMs:Math.max(0,Math.min(duration,elapsedMs-start))};start+=duration;}throw new Error('Empty film');}
export function lessonSixFilmCamera(f:LessonSixFilm,elapsedMs:number):LessonSixCamera{const frame=lessonSixFilmFrame(f,elapsedMs),to=frame.shot.focus,from=f.shots[Math.max(0,frame.index-1)]!.focus,t=Math.min(1,frame.localMs/1800),u=t*t*(3-2*t);return{latitude:from.latitude+(to.latitude-from.latitude)*u,longitude:from.longitude+(to.longitude-from.longitude)*u,distance:from.distance+(to.distance-from.distance)*u};}
