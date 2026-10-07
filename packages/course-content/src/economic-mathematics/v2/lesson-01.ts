import { authoredLesson } from "../authoring.js";
export const lesson01=authoredLesson(1,"函数：从交易记录到数量关系","记录怎样变成可以计算的规则？",["代数运算","区间"],["识别输入、输出和参数","求定义域并解释单位"],[{minutes:12,activity:"零售记录"},{minutes:25,activity:"函数与定义域"},{minutes:23,activity:"完整建模"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"配送计费迁移"}],[
 {title:"经济数学",lead:"函数、变化、累计与决策",kicker:"商科基础 / 64学时",layout:"cover",style:"cover",image:"course-cover.png",imageAlt:"零售与配送的编辑拼贴",sourceLabel:"教学情境",body:["用数量关系理解经济问题"]},
 {title:"函数与营销定量模型",lead:"价格、销量和成本分别扮演什么角色？",layout:"cover",style:"cover",image:"unit-01.png",imageAlt:"零售与库存拼贴",body:["第一单元 / 第1—2讲"]},
 {title:"三次定价记录",layout:"story",kind:"scene",image:"l01-scene.png",imageAlt:"社区零售柜台",sourceLabel:"教学情境",table:{columns:["单价（元/件）","日销量（件）"],rows:[["40","800"],["50","700"],["60","600"]]},prompt:"单价55元时，你会怎样预测销量？"},
 {title:"输入、输出与参数",layout:"split",formula:"q(p)=1200-10p",body:["输入$p$：元/件；输出$q$：件/日。","参数1200、10描述本模型的基准与变化规则。"],sourceLabel:"教学情境",prompt:"每涨价1元，模型中的日销量怎样改变？"},
 {title:"函数的三个组成部分",layout:"essay",body:["允许输入的集合。","每个允许输入都对应一个确定输出。","把输入映射到输出的同一规则。"],formula:"f:D\\longrightarrow Y,\\quad x\\longmapsto f(x)",prompt:"同一个输入对应两个输出时，规则还是函数吗？"},
 {title:"价格模型的定义域",layout:"proof",formula:"q(p)=1200-10p",steps:[{title:"销量非负",formula:"1200-10p\\ge0\\Rightarrow p\\le120"},{title:"价格非负",formula:"p\\ge0"},{title:"共同范围",formula:"D=[0,120]"}]},
 {title:"定义域先于代入",layout:"exercise",kind:"exercise",style:"constructivist",formula:"f(x)=\\frac{\\sqrt{x-2}}{x-5}",prompt:"求定义域，解释两个条件为什么必须同时满足。",steps:[{title:"根号条件",formula:"x\\ge2"},{title:"分母条件",formula:"x\\ne5"},{title:"交集",formula:"D=[2,5)\\cup(5,+\\infty)"}]},
 {title:"同一关系的三种表示",layout:"essay",image:"l01-concept.png",imageAlt:"输入输出的概念插画",body:["表格保留有限记录。","公式支持允许范围内的计算。","图形显示趋势与变化。"],sourceNote:"插画用于概念联想，数量关系以公式和表格为准。"},
 {title:"价格与需求的图形",layout:"plot",formula:"q(p)=1200-10p",plot:{model:"demand",xLabel:"价格 p（元/件）",yLabel:"日销量 q（件）",domain:[0,120]},prompt:"图形与记录相符，就能说明价格变化的因果效应吗？"},
 {title:"记录、模型与预测",layout:"compare",body:["记录：一些输入下实际观察到的结果。","模型：给定假设下的数量对应规则。","预测：将规则用于尚未观察的允许输入。"],prompt:"季节和竞争条件改变时，模型需要重新检验。",sourceLabel:"教学情境"},
 {title:"配送费的分段规则",layout:"proof",lead:"首千克8元，超出部分按连续重量每千克3元。",formula:"C(w)=\\begin{cases}8,&0<w\\le1,\\\\8+3(w-1),&w>1.\\end{cases}",steps:[{title:"半千克",formula:"C(0.5)=8"},{title:"两千克半",formula:"C(2.5)=12.5"}],sourceLabel:"教学情境"},
 {title:"连续计费与进位计费",layout:"compare",body:["连续计费按实际超出重量收费。","进位计费将超出部分向上取整。"],formula:"C_r(w)=8+3\\lceil\\max(w-1,0)\\rceil",prompt:"分别求重量1.2千克时的费用。",steps:[{title:"比较结果",formula:"C(1.2)=8.6,\\quad C_r(1.2)=11"}],sourceLabel:"教学情境"},
 {title:"独立建模：打印费用",layout:"exercise",kind:"exercise",lead:"服务费5元，每页0.2元；页数是非负整数。",prompt:"给出总费用函数、定义域和打印30页的费用。",steps:[{title:"费用规则",formula:"T(n)=5+0.2n"},{title:"输入范围",formula:"n\\in\\{0,1,2,\\ldots\\}"},{title:"代入",formula:"T(30)=11\\text{元}"}],sourceLabel:"教学情境"},
 {title:"一个关系，两项检查",layout:"essay",body:["数学检查：运算能否进行，输出是否唯一？","经济检查：单位是否一致，约束和假设是否合理？"],prompt:"为价格模型写一句包括假设与范围的说明。"},
 {title:"销量增加与利润增加",layout:"split",formula:"R(p)=p\\,q(p),\\quad\\Pi(p)=R(p)-C(q(p))",prompt:"销量增加，利润一定增加吗？",body:["下一讲把价格、销量与成本连接起来。"]}
]);
