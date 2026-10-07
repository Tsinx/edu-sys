import { authoredLesson } from "../authoring.js";
export const lesson30=authoredLesson(30,"无约束极值与二阶判别","两项投入的驻点一定最好吗？",["一阶与二阶偏导"],["求多元驻点","使用Hessian判别","比较局部和全局最优"],[{minutes:15,activity:"工作室投入"},{minutes:25,activity:"驻点推导"},{minutes:20,activity:"二阶实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"最优边界"}],[
 {title:"优化与营销决策",layout:"cover",style:"cover",image:"unit-08.png",imageAlt:"资源与决策拼贴",lead:"在可行条件下比较行动。",body:["第八单元 / 第30—32讲"]},
 {title:"工作室的两项投入",layout:"story",image:"l30-scene.png",imageAlt:"工作室的两种资源",formula:"\\Pi(x,y)=40x+30y-x^2-y^2-100",prompt:"两项投入怎样共同影响利润指数？",sourceLabel:"教学情境"},
 {title:"各方向同时停止上升",layout:"essay",image:"l30-concept.png",imageAlt:"双方向最优的概念插画",formula:"\\Pi_x=0,\\qquad\\Pi_y=0",body:["可微内部极值必须满足梯度为零。","必要条件给出候选点，还需要判别。"]},
 {title:"完整驻点计算",layout:"proof",formula:"\\Pi_x=40-2x,\\quad\\Pi_y=30-2y",steps:[{title:"方程组",formula:"40-2x=0,\\quad30-2y=0"},{title:"候选点",formula:"(x^*,y^*)=(20,15)"},{title:"函数值",formula:"\\Pi(20,15)=525"}]},
 {title:"二阶判别",layout:"proof",lead:"在内部驻点$f_x=f_y=0$处，假定二阶偏导在邻域内连续。",formula:"D=f_{xx}f_{yy}-f_{xy}^2",steps:[{title:"D为正",text:"$f_{xx}>0$为局部极小，$f_{xx}<0$为局部极大。"},{"title":"D为负",text:"鞍点，两个方向的变化性质不同。"},{"title":"D为零",text:"判别不确定，需要进一步分析。"}]},
 {title:"本例的全局证据",layout:"proof",formula:"\\Pi=525-(x-20)^2-(y-15)^2",steps:[{title:"二阶",formula:"\\Pi_{xx}=-2,\\quad\\Pi_{yy}=-2,\\quad D=4"},{title:"平方非负",formula:"\\Pi(x,y)\\le525"},{title:"唯一达到",formula:"x=20,y=15"}]},
 {title:"双投入实验",layout:"lab",interactionId:"unconstrained-optimum-lab",interactionDefaults:{x:10,y:10,revealClassification:false},prompt:"移动投入点，观察等值线与利润；找到候选点后给出数学证据。"},
 {title:"驻点也可能是鞍点",layout:"compare",style:"constructivist",formula:"f(x,y)=x^2-y^2",body:["原点的两个偏导都为零。","沿$x$轴上升，沿$y$轴下降。"],prompt:"任意小邻域中是否同时有比0大和比0小的函数值？"},
 {title:"边界最优需要另行比较",layout:"essay",formula:"0\\le x\\le10,\\quad0\\le y\\le10",body:["本例的内部驻点不在这个可行区域。","利润在该区域两个方向都递增。"],prompt:"区域内的最优点与利润是多少？",steps:[{title:"边界结果",formula:"(10,10),\\quad\\Pi=400"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"F(x,y)=x^2+2y^2-4x-8y",prompt:"求驻点、二阶判别和全局最小值。",steps:[{title:"驻点",formula:"(x,y)=(2,2)"},{title:"二阶",formula:"D=8>0,\\quad F_{xx}=2>0"},{title:"全局",formula:"F=(x-2)^2+2(y-2)^2-12\\ge-12"}]},
 {title:"迁移：预算带来的改变",layout:"essay",body:["无约束最优允许独立改变每项投入。","预算约束将两项投入连接起来。"],prompt:"若$x+y=25$，本例的无约束最优点还可行吗？"}
]);
