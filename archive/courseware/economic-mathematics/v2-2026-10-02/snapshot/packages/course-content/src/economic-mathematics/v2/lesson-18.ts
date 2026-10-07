import { authoredLesson } from "../authoring.js";
export const lesson18=authoredLesson(18,"基本积分公式与直接积分","哪些变化率可以直接恢复？",["原函数","基本求导公式"],["使用积分公式","通过求导核验","注意定义域与绝对值"],[{minutes:15,activity:"速率清单"},{minutes:25,activity:"公式与范围"},{minutes:25,activity:"直接积分"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"核验迁移"}],[
 {title:"仓库的速率清单",layout:"story",image:"l18-scene.png",imageAlt:"仓库与货物记录",lead:"不同工序的速率可能是常数、幂函数或指数函数。",prompt:"怎样从熟悉的导数反向寻找原函数？",sourceLabel:"教学情境"},
 {title:"反向匹配",layout:"essay",image:"l18-concept.png",imageAlt:"匹配与反向恢复插画",formula:"F'=f\\quad\\Longleftrightarrow\\quad\\int f\\,dx=F+C",body:["识别函数结构。","保留范围限制。","求导核验结果。"]},
 {title:"幂函数公式",layout:"proof",formula:"\\int x^r\\,dx=\\frac{x^{r+1}}{r+1}+C,\\quad r\\ne-1",steps:[{title:"例题",formula:"\\int\\sqrt{x}\\,dx=\\frac23x^{3/2}+C\\quad(x>0)"},{title:"负幂",formula:"\\int x^{-2}\\,dx=-x^{-1}+C\\quad(x\\ne0)"}]},
 {title:"特殊的负一次幂",layout:"proof",formula:"\\int\\frac1x\\,dx=\\ln|x|+C,\\quad x\\ne0",steps:[{title:"正半轴",formula:"(\\ln x)'=1/x"},{title:"负半轴",formula:"(\\ln(-x))'=1/x"},{title:"范围",text:"原函数在正、负两个区间分别讨论，常数可以不同。"}]},
 {title:"指数与三角",layout:"table",table:{columns:["被积函数","一个原函数"],rows:[["$e^x$","$e^x$"],["$a^x$","$a^x/\\ln a$"],["$\\cos x$","$\\sin x$"],["$\\sin x$","$-\\cos x$"],["$1/(1+x^2)$","$\\arctan x$"]]},body:["指数底数$a>0$且$a\\ne1$；三角函数使用弧度。"]},
 {title:"展开后逐项积分",layout:"proof",formula:"\\int(x+1)^2\\,dx",steps:[{title:"展开",formula:"\\int(x^2+2x+1)\\,dx"},{title:"积分",formula:"x^3/3+x^2+x+C"},{title:"核验",formula:"(x^3/3+x^2+x)'=(x+1)^2"}]},
 {title:"除法整理",layout:"proof",formula:"\\int\\frac{x^2+1}{x}\\,dx",steps:[{title:"拆开",formula:"\\int(x+1/x)\\,dx"},{title:"结果",formula:"x^2/2+\\ln|x|+C,\\quad x\\ne0"}]},
 {title:"积分不是乘积法则的反写",layout:"compare",style:"constructivist",formula:"\\int x e^x\\,dx\\ne\\left(\\int x\\,dx\\right)\\left(\\int e^x\\,dx\\right)",prompt:"对右侧结果求导，为什么没有回到$xe^x$？"},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"\\int(3x^2-4x+2/x)\\,dx",prompt:"给出结果与范围，用求导核验。",steps:[{title:"结果",formula:"x^3-2x^2+2\\ln|x|+C,\\quad x\\ne0"},{title:"核验",formula:"3x^2-4x+2/x"}]},
 {title:"迁移：边际成本",layout:"exercise",kind:"exercise",formula:"MC(q)=12+3\\sqrt q,\\quad q>0",prompt:"求总成本的一般表达式；还缺少哪一项业务信息？",steps:[{title:"积分",formula:"C(q)=12q+2q^{3/2}+C_0"},{title:"缺少的信息",text:"固定成本或某个已知销量下的总成本。"}],sourceLabel:"教学情境"}
]);
