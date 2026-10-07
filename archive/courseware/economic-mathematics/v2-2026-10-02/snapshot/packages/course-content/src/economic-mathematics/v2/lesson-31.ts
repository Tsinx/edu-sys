import { authoredLesson } from "../authoring.js";
export const lesson31=authoredLesson(31,"约束优化：一笔预算的两种用途","有限资源怎样比较增量响应？",["偏导数","一元极值"],["消元与拉格朗日法","检查边界并解释影子价格"],[{minutes:12,activity:"预算与可行集"},{minutes:25,activity:"消元及端点"},{minutes:23,activity:"拉格朗日与切线"},{minutes:20,activity:"实验和独立练习"},{minutes:10,activity:"敏感性"}],[
 {title:"两个渠道，一笔预算",layout:"story",kind:"scene",image:"l31-scene.png",imageAlt:"两渠道预算场景",formula:"G(x,y)=40\\sqrt x+30\\sqrt y,\\quad x+y=100",body:["投入单位为百元；G为教学响应指数。","非负投入，预算必须用完。"],sourceLabel:"教学情境"},
 {title:"约束改变可行选择",layout:"essay",image:"l31-concept.png",imageAlt:"有限资源连接两容器",formula:"y=100-x,\\quad0\\le x\\le100",body:["增加x必须减少同样数量的y。","最优要与所有可行点比较，包括端点。"]},
 {title:"消元成为一元问题",layout:"proof",formula:"g(x)=40\\sqrt x+30\\sqrt{100-x}",steps:[{title:"内部导数",formula:"g'(x)=20/\\sqrt x-15/\\sqrt{100-x}"},{title:"必要比例",formula:"x:y=16:9"},{title:"预算分配",formula:"x=64,\\quad y=36"}],body:["导数公式用于内部，端点另行检查。"]},
 {title:"最大值还需要证据",layout:"proof",formula:"g''(x)=-10/x^{3/2}-7.5/(100-x)^{3/2}<0",steps:[{title:"内部严格凹",text:"驻点是唯一内部最大值。"},{"title":"端点",formula:"g(0)=300,\\quad g(100)=400"},{title:"比较",formula:"g(64)=500>400>300"}]},
 {title:"可行线上观察最优",layout:"plot",plot:{model:"budget",xLabel:"渠道x投入（百元）",yLabel:"响应指数 G",params:{budget:100}},formula:"g(x)=40\\sqrt x+30\\sqrt{100-x}",prompt:"平均分配在图形上处于什么位置？"},
 {title:"拉格朗日函数",layout:"proof",formula:"L=40\\sqrt x+30\\sqrt y-\\lambda(x+y-100)",steps:[{title:"三个条件",formula:"20/\\sqrt x=\\lambda,\\quad15/\\sqrt y=\\lambda,\\quad x+y=100"},{title:"边际响应相等",formula:"G_x=G_y=\\lambda"},{title:"最优点",formula:"(x,y)=(64,36),\\quad\\lambda=2.5"}]},
 {title:"切线条件的含义",layout:"split",formula:"\\nabla G=\\lambda\\nabla(x+y)",body:["沿预算线微调时，一阶响应变化互相抵消。","两渠道每单位预算的边际响应相同。"],prompt:"若Gx大于Gy，预算应向哪边调整？",steps:[{title:"调整方向",text:"从y向x调整，增加总响应。"}]},
 {title:"预算约束实验",layout:"lab",kind:"interaction",interactionId:"budget-constraint-lab",interactionDefaults:{budget:"100",channelX:50,revealOptimum:false,revealStep:false},plot:{model:"budget",xLabel:"渠道x投入（百元）",yLabel:"响应指数 G"},prompt:"从平均分配出发，观察小幅挪动的效果。",sourceLabel:"教学情境"},
 {title:"任意预算的最优规则",layout:"proof",formula:"x+y=B>0",steps:[{title:"比例",formula:"x:y=16:9"},{title:"最优分配",formula:"x^*=0.64B,\\quad y^*=0.36B"},{title:"最优响应",formula:"V(B)=50\\sqrt B"}]},
 {title:"预算的影子价格",layout:"proof",formula:"V(B)=50\\sqrt B",steps:[{title:"边际价值",formula:"V'(B)=25/\\sqrt B=\\lambda(B)"},{title:"预算100时",formula:"V'(100)=2.5"},{title:"有限增量",text:"V(101)−V(100)是精确增量；2.5是一阶近似。"}]},
 {title:"最优比例的来源",layout:"compare",style:"constructivist",body:["16:9来自本模型的系数40与30。","响应函数改变，最优比例可能改变。","资源单价不同，需要比较每元预算的边际响应。"],prompt:"交换响应系数，比例怎样变化？"},
 {title:"独立求解新模型",layout:"exercise",kind:"exercise",formula:"H=30\\sqrt x+40\\sqrt y,\\quad x+y=50",prompt:"求非负投入下的最大值并检查端点。",steps:[{title:"必要比例",formula:"x:y=9:16"},{title:"投入",formula:"x=18,\\quad y=32"},{title:"最大值",formula:"H^*=50\\sqrt{50}>H(0,50),\\ H(50,0)"}]},
 {title:"资源单价不同",layout:"exercise",kind:"exercise",formula:"F=6\\sqrt x+4\\sqrt y,\\quad2x+y=24",prompt:"求最优投入，并解释为什么边际响应不能直接相等。",steps:[{title:"每元边际响应",formula:"(3/\\sqrt x)/2=2/\\sqrt y"},{title:"比例",formula:"y=16x/9"},{title:"投入",formula:"x=108/17,\\quad y=192/17"}],sourceLabel:"教学情境"},
 {title:"向陌生情境迁移",layout:"essay",body:["识别投入单位和资源价格。","建立目标与可行集，检查内部和边界。","解释参数变化与模型假设的影响。"],prompt:"下一讲自行建立展览推广模型。"}
]);
