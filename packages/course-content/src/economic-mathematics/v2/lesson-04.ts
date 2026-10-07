import { authoredLesson } from "../authoring.js";
export const lesson04=authoredLesson(4,"函数极限：位置附近的趋势","缺失的一条记录能否由邻近趋势补足？",["函数与数列极限"],["计算左右极限","使用因式分解与有理化","区分函数值和极限"],[{minutes:15,activity:"邻近数据"},{minutes:25,activity:"左右极限"},{minutes:25,activity:"代数计算"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"边界迁移"}],[
 {title:"一个空缺的位置",layout:"story",image:"l04-scene.png",imageAlt:"物流柜的空缺",lead:"函数$f(x)=(x^2-1)/(x-1)$在$x=1$处不能代入。",prompt:"邻近的函数值会接近什么？"},
 {title:"附近的数值",layout:"table",table:{columns:["x","f(x)"],rows:[["0.9","1.9"],["0.99","1.99"],["1.01","2.01"],["1.1","2.1"]]},formula:"\\lim_{x\\to1}f(x)=2",prompt:"从左侧和右侧接近，结果一致吗？"},
 {title:"空点与极限",layout:"plot",plot:{model:"hole",xLabel:"输入 x",yLabel:"输出 f(x)",domain:[0,2]},body:["极限研究邻近趋势。","函数值研究该点是否定义以及取什么值。"]},
 {title:"两条接近路径",layout:"essay",image:"l04-concept.png",imageAlt:"两侧接近空缺的插画",formula:"\\begin{gathered}\\lim_{x\\to a}f(x)=L\\\\\\Updownarrow\\\\\\lim_{x\\to a^-}f(x)=\\lim_{x\\to a^+}f(x)=L\\end{gathered}",body:["两侧都存在并且相等，双侧极限才存在。"]},
 {title:"分段规则的左右极限",layout:"proof",formula:"f(x)=\\begin{cases}x+1,&x<0,\\\\2x+3,&x\\ge0.\\end{cases}",steps:[{title:"左侧",formula:"\\lim_{x\\to0^-}f(x)=1"},{title:"右侧",formula:"\\lim_{x\\to0^+}f(x)=3"},{title:"双侧",text:"左右极限不相等，双侧极限不存在。"}]},
 {title:"约分先核对范围",layout:"proof",formula:"\\lim_{x\\to1}\\frac{x^2-1}{x-1}",steps:[{title:"邻近但不同于1",formula:"x\\ne1\\Rightarrow\\frac{(x-1)(x+1)}{x-1}=x+1"},{title:"计算趋势",formula:"\\lim_{x\\to1}(x+1)=2"},{title:"原函数仍有空点",text:"约分不使原函数在$x=1$处自动有定义。"}]},
 {title:"有理化处理根式",layout:"proof",formula:"\\lim_{x\\to0}\\frac{\\sqrt{1+x}-1}{x}",steps:[{title:"乘共轭",formula:"\\frac{\\sqrt{1+x}-1}{x}=\\frac1{\\sqrt{1+x}+1}\\quad(x\\ne0)"},{title:"代入连续表达式",formula:"\\lim_{x\\to0}\\frac1{\\sqrt{1+x}+1}=\\frac12"}]},
 {title:"无穷远的主导项",layout:"proof",formula:"\\lim_{x\\to+\\infty}\\frac{2x^2+3}{5x^2-x}",steps:[{title:"同除最高次幂",formula:"\\frac{2+3/x^2}{5-1/x}"},{title:"求极限",formula:"\\frac25"}]},
 {title:"不能把零分母都叫无穷大",layout:"compare",style:"constructivist",formula:"\\frac{x}{x},\\qquad\\frac1{x},\\qquad\\frac1{x^2}",prompt:"分别求$x\\to0$的双侧极限。",steps:[{title:"三种结果",text:"第一式极限1；第二式双侧极限不存在；第三式趋向正无穷。"}]},
 {title:"独立计算",layout:"exercise",kind:"exercise",formula:"\\lim_{x\\to2}\\frac{x^2-4}{x-2},\\qquad\\lim_{x\\to0}\\frac{\\sqrt{4+x}-2}{x}",prompt:"分别写出消除未定形式的步骤。",steps:[{title:"因式分解",formula:"\\lim_{x\\to2}(x+2)=4"},{title:"有理化",formula:"\\lim_{x\\to0}\\frac1{\\sqrt{4+x}+2}=\\frac14"}]},
 {title:"函数值能否补上？",layout:"essay",formula:"g(x)=\\begin{cases}\\frac{x^2-1}{x-1},&x\\ne1,\\\\c,&x=1.\\end{cases}",prompt:"要让图形在1处没有断开，$c$应取什么值？",steps:[{title:"补点",formula:"c=2"}]}
]);
