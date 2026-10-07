import { authoredLesson } from "../authoring.js";
export const lesson24=authoredLesson(24,"累计销售、平均量与面积","总量和平均量怎样帮助安排运营？",["定积分与基本定理"],["从速率求累计","计算区间平均值","区别净面积与几何面积"],[{minutes:15,activity:"配送排班"},{minutes:25,activity:"累计计算"},{minutes:20,activity:"平均量与分段"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"业务迁移"}],[
 {title:"安排一天的配送",layout:"story",image:"l24-scene.png",imageAlt:"配送中心与累计记录",formula:"v(t)=120+24t-3t^2,\\quad0\\le t\\le8",prompt:"前4小时与后4小时的总量是否相同？",sourceLabel:"教学情境"},
 {title:"速率与累计的两个视角",layout:"essay",image:"l24-concept.png",imageAlt:"累计台阶与流动插画",formula:"A(T)=120T+12T^2-T^3",body:["速率描述一个时刻的工作强度。","累计量描述一段时间内完成的工作。"]},
 {title:"分段累计",layout:"proof",formula:"A(4)=480+192-64=608",steps:[{title:"前半段",formula:"\\int_0^4v=608"},{title:"后半段",formula:"\\int_4^8v=A(8)-A(4)=608"},{title:"解释",text:"速率关于4小时对称，两段总量相同。"}]},
 {title:"累计曲线",layout:"plot",plot:{model:"accumulation",xLabel:"时间 T（小时）",yLabel:"累计件数 A（件）",domain:[0,8]},prompt:"累计曲线的斜率最大位置，是否也是累计量最大位置？"},
 {title:"连续函数的平均值",layout:"proof",formula:"\\bar f=\\frac1{b-a}\\int_a^bf(t)\\,dt",steps:[{title:"8小时平均速率",formula:"\\bar v=1216/8=152"},{title:"至少一个时刻",formula:"v(c)=152\\quad\\text{对某个 }c\\in[0,8]"},{title:"条件",text:"速率连续，平均值位于最小值与最大值之间。"}]},
 {title:"面积中的正负",layout:"proof",formula:"r(t)=t-2,\\quad0\\le t\\le4",steps:[{title:"净累计",formula:"\\int_0^4r(t)dt=0"},{title:"几何面积",formula:"\\int_0^2(2-t)dt+\\int_2^4(t-2)dt=4"},{title:"解释",text:"净变化相互抵消，绝对变化不会抵消。"}]},
 {title:"两条曲线之间",layout:"proof",formula:"f(x)=2x,\\quad g(x)=x^2,\\quad0\\le x\\le2",steps:[{title:"上下关系",formula:"2x\\ge x^2"},{title:"面积",formula:"S=\\int_0^2(2x-x^2)dx=4/3"}]},
 {title:"独立练习：累计销售",layout:"exercise",kind:"exercise",formula:"s(t)=50+10t,\\quad0\\le t\\le6",prompt:"求6小时总销售、前2小时销售及平均销售速率。",steps:[{title:"总量",formula:"\\int_0^6s=480"},{title:"前2小时",formula:"\\int_0^2s=120"},{title:"平均",formula:"\\bar s=80\\text{件/小时}"}],sourceLabel:"教学情境"},
 {title:"独立练习：总变化",layout:"exercise",kind:"exercise",formula:"f(x)=x-1,\\quad0\\le x\\le3",prompt:"求净积分与绝对面积，说明差别。",steps:[{title:"净积分",formula:"\\int_0^3(x-1)dx=3/2"},{title:"绝对面积",formula:"\\int_0^1(1-x)dx+\\int_1^3(x-1)dx=5/2"}]},
 {title:"迁移：排班依据",layout:"essay",body:["平均速率适合总资源估计。","高峰速率决定短时容量要求。","累计曲线支持截止时间安排。"],prompt:"若每名员工每小时处理40件，分别按平均和峰值估算人数，解释两者用途。",steps:[{title:"估算",text:"平均需要至少4人；峰值168件/小时需要至少5人。"}]}
]);
