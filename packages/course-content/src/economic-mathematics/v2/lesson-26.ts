import { authoredLesson } from "../authoring.js";
export const lesson26=authoredLesson(26,"多元函数：价格与广告共同变化","两个输入怎样共同决定结果？",["一元函数","坐标","平方根"],["二元函数的定义域","区分曲面、截线、等高线"],[{minutes:12,activity:"多因素场景"},{minutes:23,activity:"函数与定义域"},{minutes:25,activity:"截线与等高线实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"模型边界"}],[
 {title:"多元函数微分",layout:"cover",style:"cover",image:"unit-07.png",imageAlt:"双输入的编辑拼贴",lead:"同一个结果，接受不止一个输入。",body:["第七单元 / 第26—29讲"]},
 {title:"价格与广告一起调整",layout:"story",kind:"scene",image:"l26-scene.png",imageAlt:"定价与广告场景",lead:"销量变化应归到哪个因素？",body:["$p$：元/件。$a$：百元/日。","$Q$：件/日。"],sourceLabel:"教学情境"},
 {title:"两个输入，一个输出",layout:"essay",image:"l26-concept.png",imageAlt:"两支撑共同作用的概念插画",formula:"Q(p,a)=1200-8p+24\\sqrt a",body:["p和a都是输入。1200、8、24是参数。","平方根项表示广告增量响应递减。"],sourceLabel:"教学情境",prompt:"广告投入翻倍，广告贡献的响应会翻倍吗？"},
 {title:"一个经营点",layout:"proof",formula:"(p,a)=(60,25)",steps:[{title:"代入",formula:"Q(60,25)=1200-480+120"},{title:"响应",formula:"Q(60,25)=840\\text{件/日}"},{title:"边界",text:"教学模型未包含库存与竞争变化。"}],sourceLabel:"教学情境"},
 {title:"共同允许的输入",layout:"proof",formula:"Q(p,a)=1200-8p+24\\sqrt a",steps:[{title:"数学条件",formula:"a\\ge0"},{title:"经济条件",formula:"p\\ge0,\\quad Q\\ge0"},{title:"定义域",formula:"D=\\{(p,a):a\\ge0,\\ 0\\le p\\le150+3\\sqrt a\\}"}]},
 {title:"图形是一张面",layout:"plot",plot:{model:"surface",xLabel:"价格 p（元/件）",yLabel:"广告 a（百元/日）"},formula:"z=Q(p,a)",body:["每个输入点对应一个响应高度。","颜色与等高线表示高度。"]},
 {title:"固定广告的截线",layout:"plot",plot:{model:"surface",xLabel:"价格 p（元/件）",yLabel:"响应 Q（件/日）",domain:[20,110],params:{advertising:25,section:1}},formula:"Q(p,25)=1320-8p",body:["价格上升时，响应沿直线下降。","每涨价1元，模型响应减少8件/日。"]},
 {title:"固定价格的截线",layout:"plot",plot:{model:"surface",xLabel:"广告 a（百元/日）",yLabel:"响应 Q（件/日）",domain:[4,100],params:{price:60,section:2}},formula:"Q(60,a)=720+24\\sqrt a",body:["响应增加，增量逐渐减小。"]},
 {title:"相同响应的等高线",layout:"proof",formula:"Q(p,a)=840",steps:[{title:"整理",formula:"24\\sqrt a=8p-360"},{title:"保留符号条件",formula:"p\\ge45"},{title:"等高线",formula:"a=((p-45)/3)^2"}],prompt:"平方为什么不能抹去p的下界？"},
 {title:"价格与广告实验",layout:"lab",kind:"interaction",interactionId:"marketing-surface-lab",interactionDefaults:{price:60,advertising:25,lockedAxis:"none",revealStep:false},prompt:"先固定一个输入，改变另一个输入，观察截线和响应。",plot:{model:"surface",xLabel:"价格 p（元/件）",yLabel:"广告 a（百元/日）"},sourceLabel:"教学情境"},
 {title:"两条调整路径",layout:"proof",lead:"从(60,25)调整到(55,36)。",steps:[{title:"先价格",formula:"840\\longrightarrow880\\longrightarrow904"},{title:"先广告",formula:"840\\longrightarrow864\\longrightarrow904"},{title:"最终输入相同",text:"静态模型的最终响应相同；现实滞后可能改变结果。"}]},
 {title:"独立练习：定义域",layout:"exercise",kind:"exercise",formula:"F(x,y)=\\frac{\\sqrt{y-x^2}}{x+y-1}",prompt:"写出定义域，判断(0,1)和(1,2)是否允许。",steps:[{title:"共同条件",formula:"y\\ge x^2,\\quad x+y\\ne1"},{title:"两个点",text:"(0,1)分母为0；(1,2)满足条件。"}]},
 {title:"独立练习：广告补偿",layout:"exercise",kind:"exercise",lead:"基准(60,25)，价格提高到63元，保持响应840件/日。",prompt:"求新的广告投入及增量。",steps:[{title:"维持响应",formula:"1200-8\\cdot63+24\\sqrt a=840"},{title:"投入",formula:"a=36"},{title:"增量",formula:"\\Delta a=11\\text{百元/日}"}],sourceLabel:"教学情境"},
 {title:"多输入模型的边界",layout:"essay",body:["变量、单位和输入范围都要明确。","截线表示其他输入保持不变的变化。","拟合关系不会自动成为现实因果效应。"],prompt:"只改变一个输入的瞬时变化怎样描述？"}
]);
