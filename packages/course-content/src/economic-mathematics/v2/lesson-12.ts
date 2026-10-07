import { authoredLesson } from "../authoring.js";
export const lesson12=authoredLesson(12,"中值定理：平均与瞬时之间","一段平均变化能证明什么？",["连续与可导"],["检查定理条件","用中值定理连接变化率","证明简单不等式"],[{minutes:15,activity:"平均速度"},{minutes:25,activity:"罗尔与拉格朗日"},{minutes:25,activity:"应用推导"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"边界反例"}],[
 {title:"导数应用、边际与弹性",layout:"cover",style:"cover",image:"unit-04.png",imageAlt:"比较与决策拼贴",lead:"把变化率转化为可核验的判断。",body:["第四单元 / 第12—16讲"]},
 {title:"一段行程的平均速度",layout:"story",image:"l12-scene.png",imageAlt:"轨道交通与运行时刻",lead:"连续行驶2小时，共前进120千米；位移函数在区间内部可导。",prompt:"是否一定有某一时刻速度恰好60千米/小时？",sourceLabel:"教学情境"},
 {title:"平均与瞬时的桥梁",layout:"essay",image:"l12-concept.png",imageAlt:"两端与中间位置的概念插画",formula:"f'(c)=\\frac{f(b)-f(a)}{b-a},\\quad c\\in(a,b)",body:["闭区间连续，开区间可导。","结论保证存在，通常不保证唯一。"]},
 {title:"罗尔定理的水平桥梁",layout:"proof",formula:"f(a)=f(b)",steps:[{title:"条件",text:"$f$在$[a,b]$连续、在$(a,b)$可导。"},{"title":"结论",formula:"\\exists c\\in(a,b),\\quad f'(c)=0"},{title:"例题",formula:"f=x^2-2x,\\ [0,2]\\Rightarrow c=1"}]},
 {title:"拉格朗日定理的几何关系",layout:"proof",formula:"g(x)=f(x)-\\frac{f(b)-f(a)}{b-a}(x-a)",steps:[{title:"两端相等",formula:"g(a)=g(b)"},{title:"应用罗尔定理",formula:"g'(c)=0"},{title:"还原",formula:"f'(c)=\\frac{f(b)-f(a)}{b-a}"}]},
 {title:"完整例题：平方函数",layout:"proof",formula:"f(x)=x^2,\\quad[a,b]=[1,3]",steps:[{title:"平均斜率",formula:"(9-1)/(3-1)=4"},{title:"找到c",formula:"2c=4\\Rightarrow c=2"},{title:"核对位置",formula:"2\\in(1,3)"}]},
 {title:"变化幅度的上界",layout:"proof",formula:"|f'(x)|\\le M\\quad(x\\in(a,b))",steps:[{title:"中值等式",formula:"f(b)-f(a)=f'(c)(b-a)"},{title:"上界",formula:"|f(b)-f(a)|\\le M|b-a|"}],prompt:"导数上界为3，输入改变0.2时，输出最多改变多少？"},
 {title:"不等式例题",layout:"proof",formula:"x>0",steps:[{title:"对ln在[1,1+x]应用定理",formula:"\\ln(1+x)=x/c,\\quad1<c<1+x"},{title:"夹出界限",formula:"\\frac{x}{1+x}<\\ln(1+x)<x"}]},
 {title:"条件缺失的反例",layout:"compare",style:"constructivist",formula:"f(x)=|x|,\\quad[-1,1]",prompt:"两端函数值相等，但区间内有没有导数为零的位置？缺少哪项条件？",steps:[{title:"检查",text:"0处不可导，不能使用罗尔定理。"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"f(x)=\\ln x,\\quad[1,e]",prompt:"验证条件，求满足中值定理的$c$。",steps:[{title:"条件",text:"在闭区间连续且内部可导。"},{"title":"解c",formula:"1/c=1/(e-1)\\Rightarrow c=e-1"}]},
 {title:"业务解释的边界",layout:"essay",body:["平均效应对应某个局部效应，需要定理条件成立。","有跳跃或不可导点时，应检查规则结构。"],prompt:"优惠门槛案例为什么不能直接套用同一结论？"}
]);
