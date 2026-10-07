import { authoredLesson } from "../authoring.js";
export const lesson23=authoredLesson(23,"定积分的换元与分部","换了变量，边界要怎样跟着改变？",["换元","分部积分","基本定理"],["同步变换上下限","处理定积分边界项","检查符号与单位"],[{minutes:15,activity:"计量转换"},{minutes:25,activity:"定积分换元"},{minutes:25,activity:"定积分分部"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"综合核验"}],[
 {title:"换一个刻度观察",layout:"story",image:"l23-scene.png",imageAlt:"计量容器与换算",formula:"\\int_0^1 2x e^{x^2}\\,dx",prompt:"令$u=x^2$后，原来的0与1分别变成什么？"},
 {title:"边界与微分一起变",layout:"essay",image:"l23-concept.png",imageAlt:"刻度转换插画",formula:"u=g(x),\\quad du=g'(x)dx",body:["变量、微分和上下限应属于同一套表达式。","直接用新变量积分时，不必回代。"]},
 {title:"完整换元计算",layout:"proof",formula:"\\int_0^1 2x e^{x^2}\\,dx",steps:[{title:"换元及边界",formula:"u=x^2,\\quad u(0)=0,\\quad u(1)=1"},{title:"新积分",formula:"\\int_0^1 e^u\\,du"},{title:"结果",formula:"e-1"}]},
 {title:"上限发生变化",layout:"proof",formula:"\\int_0^1\\frac{2x}{1+x^2}\\,dx",steps:[{title:"换元",formula:"u=1+x^2,\\quad1\\le u\\le2"},{title:"结果",formula:"\\int_1^2\\frac{du}u=\\ln2"}]},
 {title:"错误的边界组合",layout:"compare",style:"constructivist",formula:"\\int_0^1\\frac{du}u",prompt:"上一题换元后仍保留0—1，会导致什么错误？",steps:[{title:"检查",text:"新变量从1到2；错误下限0甚至制造了原题不存在的奇点。"}]},
 {title:"定积分的分部公式",layout:"proof",formula:"\\int_a^bu\\,dv=[uv]_a^b-\\int_a^bv\\,du",steps:[{title:"例题",formula:"\\int_0^1 xe^x\\,dx=[xe^x]_0^1-\\int_0^1e^x\\,dx"},{title:"结果",formula:"e-(e-1)=1"}]},
 {title:"对称性减少计算",layout:"proof",formula:"\\int_{-a}^af(x)\\,dx",steps:[{title:"奇函数",formula:"f(-x)=-f(x)\\Rightarrow\\int_{-a}^af=0"},{title:"偶函数",formula:"f(-x)=f(x)\\Rightarrow\\int_{-a}^af=2\\int_0^af"},{title:"前提",text:"函数在积分区间可积，不能跨越不可积奇点。"}]},
 {title:"独立练习：換元",layout:"exercise",kind:"exercise",formula:"\\int_0^1 3x^2\\sqrt{1+x^3}\\,dx",prompt:"写出新上下限并计算。",steps:[{title:"换元",formula:"u=1+x^3,\\quad u:1\\to2"},{title:"结果",formula:"\\frac23(2\\sqrt2-1)"}]},
 {title:"独立练习：分部",layout:"exercise",kind:"exercise",formula:"\\int_1^e\\ln x\\,dx",prompt:"保留完整边界项。",steps:[{title:"计算",formula:"[x\\ln x-x]_1^e=1"}]},
 {title:"综合检查",layout:"essay",body:["新旧变量的区间是否对应？","结果符号是否符合被积函数的正负？","数值是否落在容易计算的上、下界之间？"],prompt:"给$\\int_0^1e^{x^2}2x\\,dx$建立一个简单数值界限。",steps:[{title:"一个界限",formula:"1\\le e-1\\le e"}]}
]);
