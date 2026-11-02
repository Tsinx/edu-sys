export interface ApplicationQuestion {type:'single'|'written';stem:string;options?:readonly string[];answer:string;explanation:string;points:number;minutes:number;scoring?:readonly string[]}
export interface ApplicationActivity {id:string;lesson:12|13;number:number;title:string;minutes:number;questions:readonly ApplicationQuestion[]}
const q=(stem:string,options:readonly string[],answer:string,explanation:string):ApplicationQuestion=>({type:'single',stem,options,answer,explanation,points:5,minutes:.75});
const w=(stem:string,answer:string,explanation:string,scoring:readonly string[],minutes:number):ApplicationQuestion=>({type:'written',stem,answer,explanation,scoring,minutes,points:10});
export const LHOPITAL_IN_CLASS:ApplicationActivity={id:'l12-applications-20261030-quiz',lesson:12,number:1,title:'第十二讲·洛必达综合练习（10分钟）',minutes:10,questions:[
 q('x→0时，(e^(3x)−1)/(2x)的极限为：',['0','3/2','2/3','1'],'B','原式是0/0型，分母导数2非零；导数商为3e^(3x)/2，趋3/2。'),
 q('x→+∞时，(ln x)²/x的极限为：',['0','1','+∞','不存在'],'A','原式为∞/∞型；一次洛必达得到2ln x/x，再用一次得到2/x→0。每次均在x>1核对条件。'),
 q('x→0时，(2+x)/(1+x)的极限为：',['1，因为分子分母导数都是1','0','2，直接用连续性','不存在'],'C','原式趋2/1，不是0/0或∞/∞型，分别求导所得1不是原式极限。'),
 q('x→0时，(eˣ−1−x)/x²的极限为：',['0','1','+∞','1/2'],'D','第一次转为(eˣ−1)/(2x)，仍为0/0型；第二次为eˣ/2→1/2。'),
 q('x→0⁺时，x ln x的极限为：',['−∞','0','1','+∞'],'B','先精确改写为ln x/(1/x)，是−∞/+∞型；导数商为−x→0。负值趋0不表示原式为正。'),
 q('x→0⁺时，(1+x)^(1/x)的极限为：',['1','0','e','+∞'],'C','设原式为y>0，先求ln y=ln(1+x)/x→1，再返回y→e。不能把对数层的1当原答案。'),
 q('x→0时，|x|/x的双侧极限为：',['1','−1','0','不存在'],'D','右侧恒为1，左侧恒为−1。各自可以计算，不能合成同一个双侧极限。'),
 q('f、g在去心范围可导且g、g′非零，仅知f′/g′没有极限，能否断定f/g没有极限？',['不能，还需研究原商','能，这是法则的逆命题','能，只要原式是0/0型','原商必趋0'],'A','这是充分条件未满足，不能反向否定原商。f=x+x²sin(1/x)、g=x时，原商趋1，导数商却振荡。'),
 w('计算x→0时[1/x−1/(eˣ−1)]的极限。写出合成一个商的步骤，并在每次使用洛必达前核对当前形式。','合成(eˣ−1−x)/[x(eˣ−1)]，为0/0型。第一次导数商为(eˣ−1)/(eˣ−1+xeˣ)，仍为0/0型；第二次为eˣ/[(2+x)eˣ]→1/2，逐层回代得原极限1/2。','附近eˣ−1与x同号，x(eˣ−1)非零；其导数eˣ−1+xeˣ在足够小去心范围与x同号。第二轮分母导数(2+x)eˣ在附近非零。也可先用已经求得的两个0/0型极限分解核验。',['正确通分且保留x≠0（3分）。','逐次核对0/0与可导、非零分母导数（3分）。','第二轮计算及回代得到1/2（4分）。'],2),
 w('一位同学对x→0时(eˣ−1−2x)/x²连续使用两次洛必达，得到1/2。指出错误步骤，并给出左右极限。','第一次得到(eˣ−2)/(2x)，分子趋−1，分母趋0，已不是0/0型；第二次不合法。原式乘x后趋−1，所以右极限−∞、左极限+∞，双侧极限不存在。','第一次转而研究的导数商并没有双侧极限，不能假定第一步已给出结论。直接用[(eˣ−1)/x−2]/x可明确两侧符号。',['指出第二次不满足适用形式（3分）。','用原式乘x或精确改写核验（3分）。','左右极限与双侧结论完整（4分）。'],2)
]};
// The eight choices use six minutes; the two written items use four minutes.
const g=(number:number,topic:string,questions:readonly ApplicationQuestion[]):ApplicationActivity=>({id:'l13-shape-choice-20261030-'+number,lesson:13,number,title:'第十三讲·个人练习'+String(number).padStart(2,'0')+'：'+topic,minutes:2,questions});
export const SHAPE_CHOICE_ACTIVITIES:readonly ApplicationActivity[]=[
 g(1,'局部极值的条件',[
  q('只知f在内点a可导且f′(a)=0，能得到什么？',['a必为极大值点','a必为极小值点','a是驻点，极值类型还需判断','a一定不是极值点'],'C','驻点 stationary point只表示导数为0。x²、−x²、x³在0处依次给出极小、极大、非极值。'),
  q('哪一个例子说明“极值点必须满足f′=0”遗漏了可导条件？',['x²在0','|x|在0','x³在0','eˣ在0'],'B','|x|在内点0取得严格最小值，却不可导。费马必要条件要求内点且可导。')]),
 g(2,'二阶判别与最值范围',[
  q('f′(a)=f″(a)=0时，哪句总正确？',['a不是极值点','a必为极小值点','a必为拐点','二阶判别不给结论，应换其他依据'],'D','x⁴、−x⁴与x³在0处满足同样两个零条件，极值结论却不同。'),
  q('f在闭区间[a,b]连续，内部可导。寻找全局最大值时，完整的候选包括：',['内部驻点与两端点','只有内部驻点','只有两端点','所有f″=0的点'],'A','连续保证最值取得；内部取得的最值若可导，须满足费马条件；端点不能因不满足内部驻点条件而漏掉。')]),
 g(3,'弦线定义与命名',[
  q('本讲按凸函数convex命名。区间内任意两点的弦都在图像上方或与之重合，说明：',['函数concave，弦在下方','函数convex，满足弦线不等式≤','函数必单调增加','函数必处处严格二阶导数为正'],'B','凸函数的定义为f((1−λ)x+λy)≤(1−λ)f(x)+λf(y)。这描述弯曲，不规定函数增减，也不要求二阶导数存在。'),
  q('一次函数f(x)=2x+1在长度大于0的区间上，按非严格定义属于：',['只凸不凹','只凹不凸','同时凸与凹','既不凸也不凹'],'C','加权点处函数值与加权函数值相等，所以同时满足≤与≥；一次函数的弦线与图像重合。')]),
 g(4,'严格性与拐点边界',[
  q('关于f(x)=x⁴，哪句正确？',['0是拐点，因为f″(0)=0','f″(0)=0，所以不是严格凸','函数在R上严格凸，0不是拐点','函数只有x>0时凸'],'C','f′=4x³严格增加，函数严格凸；f″=12x²在0两侧都不变成负值，没有凹凸方向转换。'),
  q('f(x)=x|x|在0处连续，左侧为−x²，右侧为x²。0处的结论是：',['是拐点，虽然f″(0)不存在','不是拐点，因为二阶导数不存在','是严格极小值点','函数在0不连续'],'A','左侧为concave，右侧为convex，弯曲方向改变且曲线在0连续。f′=2|x|在0不可导，所以f″(0)不存在，这不妨碍拐点定义。')])
];
export const SHAPE_WRITTEN_ACTIVITIES:readonly ApplicationActivity[]=[
 {id:'l13-shape-family-20261030',lesson:13,number:5,title:'第十三讲·分层短答01：参数改变了哪些最值',minutes:4,questions:[w('设f_a(x)=x⁴−2ax²，定义域为[−2,2]，0<a<4。①给出内部驻点及局部类型。②比较0、±√a、±2处的函数值，分类全局最大值点与最小值点。','f′=4x(x²−a)。0是局部极大值点，±√a是局部极小值点。函数值分别为0、−a²、16−8a。全局最小值在±√a取得。a<2时全局最大值在±2；a=2时在0与±2；a>2时在0。','驻点必须处于定义域内；这里0<a<4保证±√a在内部。最小值比较可用f_a=(x²−a)²−a²；局部极大并不自动是整个闭区间最大。',['导数与驻点（2分）。','局部符号分类（2分）。','最小值与取得点（2分）。','以a=2为界分类最大值并含等号（4分）。'],4)]},
 {id:'l13-shape-monotone-20261030',lesson:13,number:6,title:'第十三讲·论证短答02：导数非负怎样保证严格增加',minutes:3,questions:[w('设f在区间I上可导且f′≥0，并且f′在任何长度大于0的子区间上都不恒为0。证明f严格增加。提示：先用中值定理得不减，再假设两个不同输入取得相同函数值。','中值定理先给任意u<v时f(u)≤f(v)。若某u<v满足相等，则任意t∈[u,v]都有f(u)≤f(t)≤f(v)=f(u)，因此f在[u,v]恒定，内部导数恒为0，与条件矛盾，故严格增加。','严格性需要排除一整段平坦区间，不需要每一点导数都严格为正。x³在0处导数为0但仍严格增加。',['用中值定理得到不减（3分）。','相等端值迫使整段恒定（4分）。','与不恒零条件矛盾并得严格增加（3分）。'],3)]},
 {id:'l13-shape-convex-20261030',lesson:13,number:7,title:'第十三讲·深入短答03：从局部最小到全局保证',minutes:4,questions:[w('设f在区间I上可导且凸，a为I内点且f′(a)=0。①用切线不等式证明a为全局最小值点。②若f严格凸，证明最小值点至多一个。③举出严格凸却在R上没有最小值的函数。','①凸函数满足f(x)≥f(a)+f′(a)(x−a)=f(a)。②若不同u、v均取得最小值m，严格凸性给f((u+v)/2)<[f(u)+f(v)]/2=m，矛盾。③eˣ在R上严格凸，所有值均正且x→−∞时趋0，但取不到0，所以没有最小值。','“严格凸保证唯一”须准确表述为最小值点若存在则唯一；不能省略存在性或把下确界当作已取得的最小值。',['切线不等式与驻点全局性（4分）。','以中点和严格不等式反证唯一性（3分）。','给出eˣ及不取得0的解释（3分）。'],4)]}
];
export const APPLICATION_ACTIVITIES:readonly ApplicationActivity[]=[LHOPITAL_IN_CLASS,...SHAPE_CHOICE_ACTIVITIES,...SHAPE_WRITTEN_ACTIVITIES];
