import { authoredLesson } from "../authoring.js";
export const lesson02=authoredLesson(2,"需求、收入、成本与利润","卖得更多，赚得也更多吗？",["函数","单位与定义域"],["区分收入与利润","连接价格与销量","解释盈亏"],[{minutes:15,activity:"价格记录与问题"},{minutes:25,activity:"收入成本模型"},{minutes:20,activity:"利润实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"行业迁移"}],[
 {title:"补货日的选择",layout:"story",image:"l02-scene.png",imageAlt:"文具零售与库存",lead:"某文具组合的日需求为$q=1200-10p$；每件成本20元，日固定成本2000元。",prompt:"降价带来更多销量，是否值得？",sourceLabel:"教学情境"},
 {title:"同一业务的四个量",layout:"essay",image:"l02-concept.png",imageAlt:"收入与成本的流量插画",body:["价格$p$：元/件；销量$q$：件/日。","收入$R$、成本$C$、利润$\\Pi$：元/日。"],formula:"\\Pi=R-C",sourceLabel:"概念模型"},
 {title:"收入按销量计算",layout:"proof",formula:"R=pq",steps:[{title:"价格决定需求",formula:"q(p)=1200-10p"},{title:"收入成为价格函数",formula:"R(p)=1200p-10p^2"},{title:"范围与单位",text:"$0\\le p\\le120$；收入单位为元/日。"}]},
 {title:"固定成本与变动成本",layout:"split",formula:"C(q)=2000+20q",body:["没有销量时，固定成本仍为2000元/日。","每增加一件，成本增加20元。"],prompt:"销售700件时，总成本和平均成本分别是多少？",steps:[{title:"计算",formula:"C(700)=16000,\\quad C(700)/700\\approx22.86"}]},
 {title:"把三条关系连起来",layout:"proof",formula:"\\Pi(p)=(p-20)(1200-10p)-2000",steps:[{title:"展开",formula:"\\Pi(p)=-10p^2+1400p-26000"},{title:"价格50元",formula:"q=700,\\quad R=35000,\\quad C=16000,\\quad\\Pi=19000"},{title:"价格60元",formula:"q=600,\\quad\\Pi=22000"}]},
 {title:"销量少了，利润增加了",layout:"plot",plot:{model:"profit",xLabel:"价格（元/件）",yLabel:"日利润（元）",domain:[20,110]},prompt:"在图中找到利润增加与减少的大致分界。"},
 {title:"价格实验",layout:"lab",interactionId:"price-profit-lab",interactionDefaults:{price:50,segment:"A",revealStep:false},prompt:"比较两个细分市场的同一价格。记录销量、收入与利润，说明变化原因。"},
 {title:"盈亏平衡不等于最优",layout:"proof",formula:"\\Pi(p)=0",steps:[{title:"求解",formula:"p^2-140p+2600=0\\Rightarrow p=70\\pm10\\sqrt{23}"},{title:"盈利区间",formula:"70-10\\sqrt{23}<p<70+10\\sqrt{23}"},{title:"另一个问题",text:"利润为零给出边界；最大利润还需要比较区间内部。"}]},
 {title:"独立练习：订阅服务",layout:"exercise",kind:"exercise",lead:"月订阅价为$p$元，订阅量$n=900-6p$，每位用户服务成本20元，月固定成本2000元。",prompt:"建立月收入、成本和利润函数，计算$p=60$的结果。",steps:[{title:"模型",formula:"\\Pi(p)=(p-20)(900-6p)-2000"},{title:"结果",formula:"n=540,\\quad R=32400,\\quad C=12800,\\quad\\Pi=19600"}],sourceLabel:"教学情境"},
 {title:"两个假设会改变结论",layout:"compare",body:["产能限制会截断允许销量。","成本随规模变化时，线性成本需要修改。"],prompt:"选择零售或配送业务，列出模型中最需要验证的一项假设。"},
 {title:"变量选择决定下一步",layout:"essay",body:["价格函数用于研究调价。","销量函数用于研究边际收入。","利润函数用于比较可行决策。"],prompt:"写出一个完整句子：我用什么变量，回答什么问题，结果以什么单位表达？"}
]);
