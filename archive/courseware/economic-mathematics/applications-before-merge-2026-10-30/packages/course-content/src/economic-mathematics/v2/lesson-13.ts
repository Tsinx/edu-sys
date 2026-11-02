import { authoredLesson } from "../authoring.js";
export const lesson13=authoredLesson(13,"洛必达法则与未定式","零除以零，为什么没有固定答案？",["极限","求导"],["识别未定式","核验洛必达条件","转换其他未定形式"],[{minutes:15,activity:"相对变化"},{minutes:25,activity:"法则条件"},{minutes:25,activity:"转换计算"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"方法选择"}],[
 {title:"两个变化同时趋零",layout:"story",image:"l13-scene.png",imageAlt:"两侧平衡的商业观察",formula:"\\frac{\\ln(1+x)}x,\\quad x\\to0",prompt:"分子与分母都趋零，商会趋零吗？"},
 {title:"未定式需要比较速度",layout:"essay",image:"l13-concept.png",imageAlt:"两股变化的概念插画",formula:"\\frac00,\\qquad\\frac{\\infty}{\\infty}",body:["符号描述趋势组合，不是可以直接运算的数。","不同函数可以产生不同极限。"]},
 {title:"洛必达法则的条件",layout:"essay",body:["分子与分母在去心邻域可导。","分母导数在该邻域不为零。","原式为$0/0$或$\\infty/\\infty$型。","导数商的极限存在或为无穷。"],formula:"\\lim\\frac{f(x)}{g(x)}=\\lim\\frac{f'(x)}{g'(x)}"},
 {title:"完整例题：对数",layout:"proof",formula:"\\lim_{x\\to0}\\frac{\\ln(1+x)}x",steps:[{title:"核验",text:"$x>-1$附近为$0/0$型，分母导数为1。"},{"title":"分别求导",formula:"\\lim_{x\\to0}\\frac{1/(1+x)}1=1"}]},
 {title:"重复使用要重复核验",layout:"proof",formula:"\\lim_{x\\to0}\\frac{e^x-1-x}{x^2}",steps:[{title:"第一次",formula:"\\lim\\frac{e^x-1}{2x}"},{title:"仍是0/0型",formula:"\\lim\\frac{e^x}{2}=\\frac12"}]},
 {title:"乘积转换为商",layout:"proof",formula:"\\lim_{x\\to0^+}x\\ln x",steps:[{title:"重写",formula:"\\frac{\\ln x}{1/x}\\quad(\\infty/\\infty\\text{型})"},{title:"求导数商",formula:"\\lim_{x\\to0^+}\\frac{1/x}{-1/x^2}=\\lim(-x)=0"}]},
 {title:"幂形式先取对数",layout:"proof",formula:"y=(1+x)^{1/x},\\quad x\\to0",steps:[{title:"对数",formula:"\\ln y=\\ln(1+x)/x\\to1"},{title:"还原",formula:"y\\to e"}]},
 {title:"不能任意求导数商",layout:"compare",style:"constructivist",formula:"\\lim_{x\\to0}\\frac{x+1}{x+2}=\\frac12",prompt:"直接求导数商得到1。原式缺少哪项条件？",steps:[{title:"核验",text:"原式为1/2型，不能使用洛必达法则。"}]},
 {title:"代数方法仍有优势",layout:"compare",formula:"\\lim_{x\\to1}\\frac{x^2-1}{x-1}=2",body:["因式分解一步消除零因子。","法则帮助处理未定式，方法选择仍取决于表达式结构。"]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"\\lim_{x\\to0}\\frac{\\sin x-x}{x^3}",prompt:"逐次说明未定形式，求极限。",steps:[{title:"第一次",formula:"\\lim\\frac{\\cos x-1}{3x^2}"},{title:"第二次",formula:"\\lim\\frac{-\\sin x}{6x}"},{title:"第三次",formula:"\\lim\\frac{-\\cos x}{6}=-\\frac16"}]},
 {title:"迁移：相对增量",layout:"exercise",kind:"exercise",formula:"\\lim_{h\\to0}\\frac{\\sqrt{4+h}-2}{h}",prompt:"分别用有理化和洛必达法则求解，比较步骤。",steps:[{title:"一致结果",formula:"\\frac14"}]}
]);
