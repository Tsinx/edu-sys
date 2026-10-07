import { authoredLesson } from "../authoring.js";
export const lesson28=authoredLesson(28,"全微分与切平面","两个小变化如何合并估算？",["偏导数","单变量微分"],["计算全微分","构造切平面","比较实际变化与近似误差"],[{minutes:15,activity:"联动调整"},{minutes:25,activity:"全微分"},{minutes:20,activity:"切平面实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"适用范围"}],[
 {title:"同时调整价格与广告",layout:"story",image:"l28-scene.png",imageAlt:"双变量调整的商业场景",lead:"从$(p,a)=(60,25)$调整到$(61,26)$。",formula:"Q(p,a)=1200-8p+24\\sqrt a",prompt:"两项变化能否直接相加？",sourceLabel:"教学情境"},
 {title:"局部平面",layout:"essay",image:"l28-concept.png",imageAlt:"曲面附近平面的概念插画",formula:"dQ=Q_p\\,dp+Q_a\\,da",body:["两个局部方向共同形成一次近似。","全微分存在需要可微；只有偏导存在并不充分。"]},
 {title:"完整估算",layout:"proof",formula:"Q(60,25)=840",steps:[{title:"偏导",formula:"Q_p=-8,\\quad Q_a=2.4"},{title:"估算",formula:"dQ=-8+2.4=-5.6"},{title:"实际结果",formula:"\\Delta Q=-8+24(\\sqrt{26}-5)\\approx-5.624"}]},
 {title:"切平面的方程",layout:"proof",formula:"z=Q(p_0,a_0)+Q_p(p-p_0)+Q_a(a-a_0)",steps:[{title:"本例",formula:"z=840-8(p-60)+2.4(a-25)"},{title:"单位",text:"各项均为件/日，平面只用作基点附近的估算。"}]},
 {title:"切平面实验",layout:"lab",interactionId:"tangent-plane-lab",interactionDefaults:{basePrice:60,baseAdvertising:25,deltaPrice:0,deltaAdvertising:0},prompt:"改变两个方向的幅度，比较平面估算与真实响应。"},
 {title:"误差来源",layout:"proof",formula:"E=24(\\sqrt{25+\\Delta a}-5)-2.4\\Delta a",steps:[{title:"价格方向",text:"价格项是线性的，没有额外近似误差。"},{"title":"广告方向",text:"平方根向下弯曲，切线估算偏大。"},{"title":"结论",formula:"E\\le0\\quad(25+\\Delta a\\ge0)"}]},
 {title:"偏导存在不够",layout:"compare",style:"constructivist",formula:"f(x,y)=\\begin{cases}\\frac{xy}{x^2+y^2},&(x,y)\\ne(0,0),\\\\0,&(x,y)=(0,0).\\end{cases}",prompt:"沿两条坐标轴与沿$y=x$接近原点，结果是否一致？",steps:[{title:"路径证据",text:"沿坐标轴为0，沿$y=x$为1/2；原点不连续，更不可微。"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"F(x,y)=x^2y",prompt:"在(2,3)处求全微分和切平面。估算$F(2.01,2.98)$。",steps:[{title:"偏导与微分",formula:"F_x=12,F_y=4,\\quad dF=12dx+4dy"},{title:"切平面",formula:"z=12+12(x-2)+4(y-3)"},{title:"估算",formula:"F(2.01,2.98)\\approx12.04"}]},
 {title:"迁移：测量误差",layout:"exercise",kind:"exercise",formula:"V=xy,\\quad x=10,y=20",prompt:"两个测量各最多误差0.1，用微分估计面积的最大绝对误差。",steps:[{title:"上界",formula:"|dV|\\le20\\cdot0.1+10\\cdot0.1=3"},{title:"范围",text:"这是一次近似上界，精确乘积还包含误差乘积项。"}]},
 {title:"估算报告应包含误差",layout:"essay",body:["给出基点、变化幅度和单位。","说明可微范围与固定条件。","比较实际值或提供误差依据。"],prompt:"用三句话报告本讲的价格广告调整建议。"}
]);
