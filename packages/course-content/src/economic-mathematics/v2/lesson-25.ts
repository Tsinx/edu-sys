import { authoredLesson } from "../authoring.js";
export const lesson25=authoredLesson(25,"消费者剩余与生产者剩余","曲线下的面积能够表达什么经济差额？",["反需求","定积分与面积"],["计算两类剩余","确定积分范围","区分剩余与企业利润"],[{minutes:15,activity:"市场价格"},{minutes:25,activity:"消费者剩余"},{minutes:20,activity:"价格实验"},{minutes:20,activity:"生产者剩余与练习"},{minutes:10,activity:"解释边界"}],[
 {title:"农产品市场的统一价格",layout:"story",image:"l25-scene.png",imageAlt:"农产品市场",formula:"p_D(q)=120-0.1q",prompt:"愿付价格高于成交价的差额怎样累计？",sourceLabel:"教学情境"},
 {title:"愿付与实际支付",layout:"essay",image:"l25-concept.png",imageAlt:"支付与剩余的概念插画",formula:"CS=\\int_0^{q^*}[p_D(q)-p^*]dq",body:["需求曲线采用愿付价格解释。","$q^*$由需求曲线与市场价相交确定。","结果为金额，依赖模型假设。"]},
 {title:"价格60元的完整计算",layout:"proof",formula:"p^*=60",steps:[{title:"销量",formula:"q^*=600"},{title:"积分",formula:"CS=\\int_0^{600}(60-0.1q)dq"},{title:"三角形核验",formula:"CS=18000=\\tfrac12\\cdot60\\cdot600"}]},
 {title:"需求曲线与面积",layout:"plot",plot:{model:"surplus",xLabel:"销量 q（件）",yLabel:"愿付价格（元/件）",domain:[0,1200]},prompt:"指出价格60元时的实际支付矩形与消费者剩余区域。"},
 {title:"消费者剩余实验",layout:"lab",interactionId:"consumer-surplus-lab",interactionDefaults:{price:60},prompt:"改变价格，观察成交量、支付金额与消费者剩余的共同变化。"},
 {title:"生产者剩余",layout:"proof",formula:"PS=\\int_0^{q^*}[p^*-p_S(q)]dq",steps:[{title:"供给模型",formula:"p_S(q)=20+0.1q"},{title:"市场均衡",formula:"120-0.1q=20+0.1q\\Rightarrow q^*=500,p^*=70"},{title:"计算",formula:"PS=\\tfrac12\\cdot500\\cdot50=12500"}],sourceLabel:"教学情境"},
 {title:"同一均衡的两块面积",layout:"proof",formula:"q^*=500,\\quad p^*=70",steps:[{title:"消费者剩余",formula:"CS=\\tfrac12\\cdot500\\cdot50=12500"},{title:"总剩余",formula:"CS+PS=25000"},{title:"解释边界",text:"该模型没有外部性、交易成本或分配权重。"}]},
 {title:"生产者剩余与利润",layout:"compare",style:"constructivist",body:["生产者剩余扣除模型中的变动机会成本。","企业利润还需考虑固定成本等其他成本。"],formula:"\\Pi=PS-\\text{固定成本}\\quad\\text{在相应成本假设下}",prompt:"固定成本2000元时，本例利润是多少？",steps:[{title:"结果",formula:"\\Pi=10500"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"p_D(q)=100-0.5q,\\quad p^*=40",prompt:"求成交量、实际支付与消费者剩余。",steps:[{title:"销量",formula:"q^*=120"},{title:"支付",formula:"40\\cdot120=4800"},{title:"剩余",formula:"CS=\\tfrac12\\cdot60\\cdot120=3600"}],sourceLabel:"教学情境"},
 {title:"迁移：有数量上限",layout:"exercise",kind:"exercise",lead:"沿用上一题，市场价40元，但最多出售80件。",prompt:"按需求曲线累计前80件的消费者剩余。为什么不再是原来的三角形？",steps:[{title:"计算",formula:"CS=\\int_0^{80}(60-0.5q)dq=3200"},{title:"几何",text:"销售范围被截断，区域是梯形。"}],sourceLabel:"教学情境"}
]);
