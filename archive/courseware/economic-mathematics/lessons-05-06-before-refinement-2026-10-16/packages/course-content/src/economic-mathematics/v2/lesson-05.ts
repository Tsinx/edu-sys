import { authoredLesson } from "../authoring.js";
export const lesson05=authoredLesson(5,"重要极限与等价无穷小","小变化在什么条件下可以替换？",["极限","夹逼思想","弧度"],["建立正弦重要极限","辨别等价替换的条件"],[{minutes:10,activity:"微小转角"},{minutes:25,activity:"单位圆与夹逼"},{minutes:20,activity:"指数极限与等价关系"},{minutes:25,activity:"计算与错例"},{minutes:10,activity:"近似边界"}],[
 {title:"微小转角的测量",layout:"story",kind:"scene",image:"l05-scene.png",imageAlt:"镜头装配中的微小转角",lead:"弧长能否近似垂直位移？",body:["角度以弧度计。","单位圆的弧长等于角度数值。"],prompt:"角度缩小时，sin x与x的比值接近什么？",sourceLabel:"教学情境"},
 {title:"数值只是线索",layout:"table",table:{columns:["x（弧度）","sin x / x"],rows:[["0.5","0.958851"],["0.1","0.998334"],["0.01","0.999983"]]},prompt:"有限数值能证明所有足够小的输入都满足猜想吗？"},
 {title:"零附近的比值",layout:"plot",formula:"\\lim_{x\\to0}\\frac{\\sin x}{x}=1",plot:{model:"sinc",xLabel:"角度 x（弧度）",yLabel:"sin x / x",domain:[-3,3]},body:["比值是偶函数。","原式在零处未定义；空心点标记极限位置。"]},
 {title:"三个面积的比较",layout:"plot",plot:{model:"unit-circle",xLabel:"横坐标",yLabel:"纵坐标",params:{angle:.65}},formula:"\\frac12\\sin x\\cos x<\\frac12x<\\frac12\\tan x",body:["$0<x<\\pi/2$，半径为1。","内接三角形、扇形、外切三角形逐次增大。"],teachingCue:"逐一指认三个区域，本图采用内接三角形面积sin x cos x/2。"},
 {title:"把比值夹在两端之间",layout:"proof",formula:"\\sin x\\cos x<x<\\tan x",steps:[{title:"从右式得到下界",formula:"\\cos x<\\frac{\\sin x}{x}"},{title:"从左式得到上界",formula:"\\frac{\\sin x}{x}<\\frac1{\\cos x}"},{title:"两端趋于1",formula:"\\lim_{x\\to0^+}\\frac{\\sin x}{x}=1"}]},
 {title:"负侧与角度单位",layout:"essay",body:["$\\sin(-x)/(-x)=\\sin x/x$，负侧极限相同。","弧度使弧长与角度直接连接。","若用度数$x$，则$\\lim_{x\\to0}\\sin(x^\\circ)/x=\\pi/180$。"],prompt:"为什么更换角度单位会改变极限数值？"},
 {title:"局部近似的含义",layout:"essay",image:"l05-concept.png",imageAlt:"圆弧与小楔形的插画",formula:"\\sin x\\sim x\\quad(x\\to0)",body:["等价表示两个量的比值趋于1。","它描述趋近过程，通常意味着相对误差趋于0。"],sourceNote:"概念插画；几何证明以单位圆图为准。"},
 {title:"正弦极限的变式",layout:"proof",formula:"\\lim_{x\\to0}\\frac{\\sin3x}{5x}",steps:[{title:"补出内层",formula:"\\frac{\\sin3x}{5x}=\\frac35\\frac{\\sin3x}{3x}"},{title:"内层趋于零",formula:"\\lim_{x\\to0}\\frac{\\sin3x}{3x}=1"},{title:"极限",formula:"\\frac35"}]},
 {title:"复利与第二重要极限",layout:"split",formula:"\\lim_{n\\to\\infty}\\left(1+\\frac1n\\right)^n=e",body:["同一名义增长率拆成更多次增长。","有限n的增长因子与极限仍有差别。"],prompt:"无限细分描述什么理想状态？"},
 {title:"指数结构的换形",layout:"proof",formula:"\\lim_{x\\to0}(1+2x)^{1/x}",steps:[{title:"内层变量",formula:"t=2x"},{title:"标准结构",formula:"(1+2x)^{1/x}=\\left[(1+t)^{1/t}\\right]^2"},{title:"极限",formula:"e^2"}],body:["零附近底数为正。"]},
 {title:"常用等价关系",layout:"essay",formula:"\\sin x\\sim x,\\quad\\tan x\\sim x,\\quad e^x-1\\sim x,\\quad\\ln(1+x)\\sim x",body:["均以$x\\to0$为前提。","复合使用时，内层也必须趋于零。"],prompt:"ln(1+3x)等价于哪个简单表达式？"},
 {title:"相减后的一阶项抵消",layout:"proof",style:"constructivist",formula:"\\sin x-x",steps:[{title:"直接替换的后果",text:"把sin x换成x，会抹去仍需研究的剩余量。"},{"title":"高阶反例",formula:"\\lim_{x\\to0}\\frac{\\sin x-x}{x^3}=-\\frac16"}],assistantCue:"高阶极限只作反例结论，不要求本讲用泰勒展开证明。"},
 {title:"独立计算",layout:"exercise",kind:"exercise",prompt:"计算$\\lim_{x\\to0}\\dfrac{\\ln(1+4x)}{\\sin2x}$，说明替换条件。",steps:[{title:"同趋近点",formula:"\\ln(1+4x)\\sim4x,\\quad\\sin2x\\sim2x"},{title:"比值极限",formula:"2"}]},
 {title:"估计微小转角误差",layout:"exercise",kind:"exercise",lead:"用x近似sin x，角度为0.1弧度。",prompt:"计算相对误差，说明扩大角度的风险。",steps:[{title:"真实值",formula:"\\sin0.1\\approx0.0998334"},{title:"相对误差",formula:"\\frac{0.1-\\sin0.1}{\\sin0.1}\\approx0.001669"},{title:"含义",text:"约0.167%。小角度条件是近似的一部分。"}],sourceLabel:"教学情境"},
 {title:"连续还要检查函数值",layout:"split",body:["极限存在：邻近输出趋于同一个值。","连续：该极限还要等于点处函数值。"],prompt:"优惠门槛处，左右极限与实际收费能否吻合？"}
]);
