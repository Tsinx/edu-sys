import { authoredLesson } from "../authoring.js";
export const lesson10=authoredLesson(10,"高阶导数与变化的变化","销售增速上升时，销售量一定加速增长吗？",["一阶导数","链式法则"],["计算二阶导数","区分水平、增速与增速变化"],[{minutes:15,activity:"运动观察"},{minutes:25,activity:"二阶导数"},{minutes:20,activity:"曲率与累计"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"解释迁移"}],[
 {title:"骑手的速度记录",layout:"story",image:"l10-scene.png",imageAlt:"骑手行驶的摄影场景",formula:"s(t)=t^3-3t^2+4t,\\quad0\\le t\\le3",prompt:"何时速度最小？何时加速？",sourceLabel:"教学情境"},
 {title:"位置、速度、加速度",layout:"essay",image:"l10-concept.png",imageAlt:"变化层级的概念插画",formula:"v=s',\\qquad a=v'=s''",body:["位移：千米。","速度：千米/小时。","加速度：千米/小时²。"]},
 {title:"完整求导与解释",layout:"proof",formula:"s(t)=t^3-3t^2+4t",steps:[{title:"速度",formula:"v(t)=3t^2-6t+4=3(t-1)^2+1"},{title:"加速度",formula:"a(t)=6t-6"},{title:"时段",text:"0到1小时速度下降；1到3小时速度上升；速度始终为正。"}]},
 {title:"二阶导数与图形",layout:"plot",plot:{model:"cubic",xLabel:"时间 t（小时）",yLabel:"位移 s（千米）",domain:[0,3]},body:["$s''<0$时斜率下降。","$s''>0$时斜率上升。"],prompt:"1小时处的曲线为什么改变弯曲方向？"},
 {title:"二阶导数不等于函数值",layout:"compare",style:"constructivist",formula:"f(x)=x^2-100",body:["在0处$f=-100$，但$f''=2>0$。","弯曲方向与函数值的正负是不同问题。"],prompt:"再举一个函数下降但向上弯曲的例子。"},
 {title:"更高阶导数",layout:"proof",formula:"f(x)=x^4",steps:[{title:"前两阶",formula:"f'=4x^3,\\quad f''=12x^2"},{title:"继续求导",formula:"f'''=24x,\\quad f^{(4)}=24,\\quad f^{(5)}=0"}]},
 {title:"累计销售与销售速率",layout:"proof",formula:"A(t)=120t+12t^2-t^3,\\quad0\\le t\\le8",steps:[{title:"速率",formula:"A'(t)=120+24t-3t^2"},{title:"速率变化",formula:"A''(t)=24-6t"},{title:"解释",text:"累计量始终增加；4小时之后销售速率开始下降。"}],sourceLabel:"教学情境"},
 {title:"两项业务陈述",layout:"compare",body:["销售量增加：累计量的一阶导数为正。","销售速度增加：累计量的二阶导数为正。"],prompt:"4小时后累计销售仍增加，为什么不能说销售速率也在增加？"},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"f(x)=e^{2x},\\quad g(x)=\\ln x",prompt:"求二阶导数，说明各自斜率如何变化。",steps:[{title:"指数",formula:"f''=4e^{2x}>0"},{title:"对数",formula:"g''=-1/x^2<0,\\quad x>0"}]},
 {title:"迁移：增长率报告",layout:"exercise",kind:"exercise",formula:"N(t)=100+20t-t^2,\\quad0\\le t\\le8",prompt:"解释$N'(3)$与$N''(3)$。是否仍在增长？",steps:[{title:"数值",formula:"N'(3)=14,\\quad N''(3)=-2"},{title:"结论",text:"用户数量增加，但每小时新增用户数下降。"}],sourceLabel:"教学情境"}
]);
