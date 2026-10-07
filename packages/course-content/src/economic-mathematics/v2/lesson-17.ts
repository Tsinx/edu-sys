import { authoredLesson } from "../authoring.js";
export const lesson17=authoredLesson(17,"原函数与不定积分","只知道变化率，能恢复总量吗？",["基本求导"],["辨认原函数","保留积分常数","利用初始条件恢复函数"],[{minutes:15,activity:"流入与存量"},{minutes:25,activity:"原函数"},{minutes:25,activity:"初始条件"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"成本迁移"}],[
 {title:"不定积分",layout:"cover",style:"cover",image:"unit-05.png",imageAlt:"流量累积的拼贴",lead:"从变化规则恢复一族总量函数。",body:["第五单元 / 第17—20讲"]},
 {title:"储液罐的流入",layout:"story",image:"l17-scene.png",imageAlt:"储液罐与管道",formula:"V'(t)=6t+4",prompt:"仅知道流入速率，能确定罐中原有多少液体吗？",sourceLabel:"教学情境"},
 {title:"一个导数，多条原函数",layout:"essay",image:"l17-concept.png",imageAlt:"不同起点相同变化的插画",formula:"(3t^2+4t+C)'=6t+4",body:["常数不同，变化率相同。","不定积分表示所有原函数的集合。"]},
 {title:"不定积分的记号",layout:"proof",formula:"\\int f(x)\\,dx=F(x)+C",steps:[{title:"原函数条件",formula:"F'(x)=f(x)"},{title:"核验方法",text:"对结果求导，检查是否回到被积函数。"},{"title":"常数的意义",text:"在同一个连通区间上，任意两个原函数相差常数。"}]},
 {title:"初始条件确定常数",layout:"proof",formula:"V'(t)=6t+4,\\quad V(0)=20",steps:[{title:"积分",formula:"V(t)=3t^2+4t+C"},{title:"初始条件",formula:"C=20"},{title:"两小时",formula:"V(2)=40\\text{升}"}],sourceLabel:"教学情境"},
 {title:"线性法则",layout:"proof",formula:"\\int(af+bg)\\,dx=a\\int f\\,dx+b\\int g\\,dx",steps:[{title:"例题",formula:"\\int(6x+4)\\,dx=3x^2+4x+C"},{title:"核验",formula:"(3x^2+4x+C)'=6x+4"}]},
 {title:"变化率积分的单位",layout:"split",formula:"\\text{升/小时}\\times\\text{小时}=\\text{升}",body:["速率与输入增量相乘，恢复总量的单位。","积分常数与原函数使用相同单位。"],prompt:"边际成本以元/件计，按销量积分后是什么单位？"},
 {title:"常数不能随意省略",layout:"compare",style:"constructivist",formula:"C'(q)=20\\not\\Rightarrow C(q)=20q",prompt:"固定成本在哪里？再给出一个具有同样边际成本的函数。",steps:[{title:"一般结果",formula:"C(q)=20q+C_0"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"A'(t)=4t^3-2t,\\quad A(1)=5",prompt:"恢复$A(t)$并求$A(2)$。",steps:[{title:"积分",formula:"A=t^4-t^2+C"},{title:"确定常数",formula:"C=5"},{title:"结果",formula:"A(2)=17"}]},
 {title:"迁移：成本函数",layout:"exercise",kind:"exercise",formula:"MC(q)=10+0.04q,\\quad C(0)=800",prompt:"恢复总成本，计算销售100件时的成本。",steps:[{title:"恢复",formula:"C(q)=800+10q+0.02q^2"},{title:"结果",formula:"C(100)=2000\\text{元}"}],sourceLabel:"教学情境"}
]);
