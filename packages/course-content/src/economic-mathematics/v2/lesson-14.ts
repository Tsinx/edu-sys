import { authoredLesson } from "../authoring.js";
export const lesson14=authoredLesson(14,"单调、凹凸与最值","候选价格怎样变成可行的最优价格？",["一阶与二阶导数"],["用导数判断单调","比较端点与驻点","解释凹凸和拐点"],[{minutes:15,activity:"定价候选"},{minutes:25,activity:"符号表"},{minutes:25,activity:"最值推导"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"约束迁移"}],[
 {title:"货架上的价格候选",layout:"story",image:"l14-scene.png",imageAlt:"零售货架的选择",formula:"\\Pi(p)=-10p^2+1400p-26000",body:["价格范围：$20\\le p\\le110$，单位为元/件。","利润单位为元/日。"],prompt:"怎样证明一个价格胜过所有允许价格？",sourceLabel:"教学情境"},
 {title:"斜率决定升降",layout:"essay",image:"l14-concept.png",imageAlt:"升降与峰顶的概念插画",formula:"f'>0\\Rightarrow\\text{递增},\\qquad f'<0\\Rightarrow\\text{递减}",body:["在一个区间内检查符号。","单个位置的导数不能代表整个区间。"]},
 {title:"利润函数的符号表",layout:"proof",formula:"\\Pi'(p)=1400-20p",steps:[{title:"驻点",formula:"p=70"},{title:"两侧符号",text:"20到70递增，70到110递减。"},{"title":"最优值",formula:"\\Pi(70)=23000\\text{元/日}"}]},
 {title:"曲线证据",layout:"plot",plot:{model:"profit",xLabel:"价格 p（元/件）",yLabel:"日利润（元）",domain:[20,110]},prompt:"把导数符号与图形升降逐段对应。"},
 {title:"闭区间最值的路线",layout:"essay",body:["找出区间内部的驻点与不可导点。","计算这些候选点和两端点的函数值。","比较后给出可行决策及单位。"],prompt:"最优解在端点时，导数一定为零吗？"},
 {title:"二阶判别的条件",layout:"proof",formula:"f'(c)=0",steps:[{title:"向上弯曲",formula:"f''(c)>0\\Rightarrow\\text{局部极小}"},{title:"向下弯曲",formula:"f''(c)<0\\Rightarrow\\text{局部极大}"},{title:"等于零",text:"$f''(c)=0$时判别不确定，需要其他方法。"}]},
 {title:"驻点不一定是极值",layout:"compare",style:"constructivist",formula:"f(x)=x^3,\\quad f'(0)=0",prompt:"0两侧仍都递增。为什么这里没有极值？"},
 {title:"拐点看凹凸是否改变",layout:"proof",formula:"f(x)=x^3",steps:[{title:"二阶导数",formula:"f''(x)=6x"},{title:"符号改变",text:"0左侧向下弯曲，右侧向上弯曲。"},{"title":"结论",text:"0为拐点；二阶导数为零只是候选条件。"}]},
 {title:"独立练习：可行区间",layout:"exercise",kind:"exercise",formula:"F(x)=12x-x^2,\\quad0\\le x\\le4",prompt:"求最大值与最小值，说明为何驻点不是可行解。",steps:[{title:"检查",formula:"F'=12-2x>0\\quad(0\\le x\\le4)"},{title:"最值",formula:"F_{\\min}=F(0)=0,\\quad F_{\\max}=F(4)=32"}]},
 {title:"迁移：产能约束",layout:"exercise",kind:"exercise",lead:"沿用利润模型，日销量最多450件。",prompt:"加入约束后，最优价格与日利润是什么？",steps:[{title:"可行条件",formula:"1200-10p\\le450\\Rightarrow p\\ge75"},{title:"新最优",formula:"p^*=75,\\quad\\Pi^*=22750"}],sourceLabel:"教学情境"}
]);
