import { authoredLesson } from "../authoring.js";
export const lesson27=authoredLesson(27,"偏导数：固定其他因素","保持广告不变时，调价会怎样？",["多元函数","单变量求导"],["求偏导数","说明固定条件和单位","辨别混合偏导"],[{minutes:15,activity:"控制变量"},{minutes:25,activity:"偏导计算"},{minutes:20,activity:"截线比较"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"边界解释"}],[
 {title:"只改变一项决策",layout:"story",image:"l27-scene.png",imageAlt:"固定因素下的商业选择",formula:"Q(p,a)=1200-8p+24\\sqrt a",prompt:"比较广告固定时调价，与价格固定时增加广告。",sourceLabel:"教学情境"},
 {title:"偏导沿一个方向",layout:"essay",image:"l27-concept.png",imageAlt:"一个方向运动的概念插画",formula:"Q_p=\\frac{\\partial Q}{\\partial p},\\quad Q_a=\\frac{\\partial Q}{\\partial a}",body:["求一个变量的导数时，把另一个变量视为常数。","偏导结论必须同时说明固定条件。"]},
 {title:"两个偏导数",layout:"proof",formula:"Q=1200-8p+24\\sqrt a",steps:[{title:"价格方向",formula:"Q_p=-8"},{title:"广告方向",formula:"Q_a=12/\\sqrt a,\\quad a>0"},{title:"在(60,25)",formula:"Q_p=-8,\\quad Q_a=2.4"}]},
 {title:"单位使解释明确",layout:"split",body:["$Q_p$：日销量相对于元/件的变化率。","$Q_a$：日销量相对于百元/日广告投入的变化率。"],prompt:"广告增加100元/日时，在当前点日销量约增加多少？",steps:[{title:"估算",text:"广告变量增加1，日销量约增加2.4件。"}]},
 {title:"截线验证方向",layout:"plot",plot:{model:"surface",xLabel:"价格 p（元/件）",yLabel:"日销量（件）",domain:[20,110],params:{advertising:25,section:1}},formula:"Q(p,25)=1320-8p",prompt:"图形斜率是否与偏导数一致？"},
 {title:"二阶与混合偏导",layout:"proof",formula:"Q_p=-8,\\quad Q_a=12a^{-1/2}",steps:[{title:"同方向",formula:"Q_{pp}=0,\\quad Q_{aa}=-6a^{-3/2}"},{title:"交叉方向",formula:"Q_{pa}=Q_{ap}=0"},{title:"解释",text:"本模型没有价格与广告的交互项。"}]},
 {title:"交互项改变局部效应",layout:"proof",formula:"F(x,y)=x^2+3xy+y^2",steps:[{title:"一阶",formula:"F_x=2x+3y,\\quad F_y=3x+2y"},{title:"二阶",formula:"F_{xx}=2,F_{yy}=2,F_{xy}=F_{yx}=3"},{title:"解释",text:"$x$方向的效应随$y$而改变。"}]},
 {title:"边界处不能随意求导",layout:"compare",style:"constructivist",formula:"Q_a=12/\\sqrt a",prompt:"$a=0$虽然属于函数定义域，为什么偏导公式不能直接代入？",steps:[{title:"检查",text:"平方根在0处没有有限的右导数；该公式要求$a>0$。"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"F(x,y)=\\ln(x+y)+xy,\\quad x+y>0",prompt:"求两个一阶偏导和混合偏导，在(1,2)处代入。",steps:[{title:"一阶",formula:"F_x=1/(x+y)+y,\\quad F_y=1/(x+y)+x"},{title:"交叉",formula:"F_{xy}=1-1/(x+y)^2"},{title:"点值",formula:"F_x=7/3,F_y=4/3,F_{xy}=8/9"}]},
 {title:"迁移：联动决策",layout:"essay",body:["偏导回答固定其他变量的局部问题。","两项同时改变时，还需要合并两种贡献。"],prompt:"若价格增加1元且广告增加1百元，分别列出对销量的局部影响。",steps:[{title:"两项贡献",formula:"-8\\cdot1+2.4\\cdot1=-5.6"}]}
]);
