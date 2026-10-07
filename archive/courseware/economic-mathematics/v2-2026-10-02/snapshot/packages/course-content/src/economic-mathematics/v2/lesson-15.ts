import { authoredLesson } from "../authoring.js";
export const lesson15=authoredLesson(15,"边际收入、成本与利润","多销售一件，会带来多少净收益？",["导数与极值","反函数关系"],["按销量定义边际量","区分平均量与边际量","使用MR=MC并检验最优"],[{minutes:15,activity:"追加订单"},{minutes:25,activity:"反需求与边际"},{minutes:25,activity:"利润最优"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"单位解释"}],[
 {title:"追加一件的订单",layout:"story",image:"l15-scene.png",imageAlt:"包装台上的追加订单",lead:"需求$q=1200-10p$，成本$C=2000+20q$。",prompt:"增加一件销量，收入是否恰好增加当前单价？",sourceLabel:"教学情境"},
 {title:"边际量以销量为自变量",layout:"essay",image:"l15-concept.png",imageAlt:"多一个单位的概念插画",formula:"MR=\\frac{dR}{dq},\\quad MC=\\frac{dC}{dq},\\quad M\\Pi=\\frac{d\\Pi}{dq}",body:["单位：每增加一件对应的金额变化。","边际量给出局部近似，有限一件增量可以另行精算。"]},
 {title:"把价格写成销量函数",layout:"proof",formula:"q=1200-10p",steps:[{title:"反需求",formula:"p(q)=120-0.1q,\\quad0\\le q\\le1200"},{title:"收入",formula:"R(q)=120q-0.1q^2"},{title:"边际收入",formula:"MR(q)=120-0.2q"}]},
 {title:"降价销售影响全部销量",layout:"proof",formula:"MR=p+q\\frac{dp}{dq}",steps:[{title:"第一部分",text:"新增一件按现有价格带来收入。"},{"title":"第二部分",text:"为销售更多，价格下降影响原有销量的收入。"},{"title":"本例",formula:"MR=p-0.1q<p\\quad(q>0)"}]},
 {title:"价格导数不是边际收入",layout:"compare",style:"constructivist",formula:"\\frac{dR}{dp}=1200-20p\\ne MR(q)",body:["左边研究调价的收入效应。","右边研究增加销量的收入效应。"],prompt:"它们的自变量和单位分别是什么？"},
 {title:"利润的完整最优推导",layout:"proof",formula:"\\Pi(q)=100q-0.1q^2-2000",steps:[{title:"边际利润",formula:"\\Pi'(q)=100-0.2q=MR-MC"},{title:"驻点",formula:"q^*=500,\\quad p^*=70"},{title:"充分检查",formula:"\\Pi''=-0.2<0,\\quad\\Pi^*=23000"}]},
 {title:"平均成本与边际成本",layout:"split",formula:"AC(q)=2000/q+20,\\quad MC=20",body:["平均成本包含固定成本的分摊。","固定成本不改变本模型的边际成本。"],prompt:"$q=500$时，平均成本与边际成本相差多少？",steps:[{title:"计算",formula:"AC=24,\\quad AC-MC=4"}]},
 {title:"离散一件的核验",layout:"proof",formula:"R(501)-R(500)",steps:[{title:"实际增量",formula:"120-0.1(2\\cdot500+1)=19.9"},{title:"导数估算",formula:"MR(500)=20"},{title:"解释",text:"相差0.1元，来自收入函数的二次项。"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"p(q)=80-0.2q,\\quad C(q)=1000+20q",prompt:"求MR、MC、最优销量、价格与利润。",steps:[{title:"边际关系",formula:"MR=80-0.4q,\\quad MC=20"},{title:"驻点与价格",formula:"q^*=150,\\quad p^*=50"},{title:"检验与利润",formula:"\\Pi''=-0.4<0,\\quad\\Pi^*=3500"}],sourceLabel:"教学情境"},
 {title:"边际判断需要可行性",layout:"essay",body:["内部最优可能满足MR=MC。","产能、非负约束和不连续成本会改变最优条件。"],prompt:"为一个配送业务写出边际成本中可能出现跳跃的原因。"}
]);
