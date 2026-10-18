import { authoredLesson } from "../authoring.js";
export const lesson07=authoredLesson(7,"导数：从平均变化到瞬时变化","很小的调价怎样改变利润？",["函数极限","利润函数"],["用定义求导","解释导数单位","区分割线与切线"],[{minutes:15,activity:"配送变化"},{minutes:25,activity:"导数定义"},{minutes:20,activity:"割线实验"},{minutes:20,activity:"独立计算"},{minutes:10,activity:"变化解释"}],[
 {title:"导数与微分",layout:"cover",style:"cover",image:"unit-03.png",imageAlt:"运动与变化的拼贴",lead:"从一段变化，走向一个位置的变化率。",body:["第三单元 / 第7—11讲"]},
 {title:"配送车经过的距离",layout:"story",image:"l07-scene.png",imageAlt:"配送车辆沿道路行驶",formula:"s(t)=t^2\\quad(\\text{千米}),\\quad t\\text{以小时计}",prompt:"第1小时到第2小时的平均速度，等于2小时处的速度吗？",sourceLabel:"教学情境"},
 {title:"平均变化率",layout:"proof",formula:"\\frac{s(t+h)-s(t)}h",steps:[{title:"代入平方函数",formula:"\\frac{(t+h)^2-t^2}h=2t+h"},{title:"取越来越短的区间",formula:"\\lim_{h\\to0}(2t+h)=2t"},{title:"单位",text:"距离除以时间，单位为千米/小时。"}]},
 {title:"导数定义",layout:"essay",image:"l07-concept.png",imageAlt:"割线接近切线的概念插画",formula:"f'(x_0)=\\lim_{h\\to0}\\frac{f(x_0+h)-f(x_0)}h",body:["极限必须存在且有限。","分子是输出变化，分母是输入变化。"]},
 {title:"利润的平均调价效应",layout:"proof",formula:"\\Pi(p)=-10p^2+1400p-26000",steps:[{title:"从50元涨价h元",formula:"\\frac{\\Pi(50+h)-\\Pi(50)}h=400-10h"},{title:"局部变化率",formula:"\\Pi'(50)=400"},{title:"解释",text:"50元附近每调高1元/件，日利润约增加400元/日。"}]},
 {title:"割线向切线靠近",layout:"lab",interactionId:"secant-tangent-lab",interactionDefaults:{basePrice:50,h:10},prompt:"缩小价格间隔，观察平均斜率与局部斜率的差距。"},
 {title:"切线是局部模型",layout:"proof",formula:"y-f(x_0)=f'(x_0)(x-x_0)",steps:[{title:"平方函数在1处",formula:"y-1=2(x-1)"},{title:"利润在50元处",formula:"y-19000=400(p-50)"}],prompt:"同一条切线能否准确描述整个定义域？"},
 {title:"连续不保证可导",layout:"compare",style:"constructivist",formula:"f(x)=|x|",body:["在0处连续。","左导数为$-1$，右导数为1。"],prompt:"为什么0处没有唯一的切线斜率？"},
 {title:"可导一定连续",layout:"proof",formula:"f(x_0+h)-f(x_0)=h\\frac{f(x_0+h)-f(x_0)}h",steps:[{title:"两个因子的极限",formula:"h\\to0,\\quad\\frac{f(x_0+h)-f(x_0)}h\\to f'(x_0)"},{title:"函数增量趋零",formula:"f(x_0+h)\\to f(x_0)"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"f(x)=3x^2+1",prompt:"用定义求$f'(2)$，再写出该点切线。",steps:[{title:"差商",formula:"\\frac{f(2+h)-f(2)}h=12+3h"},{title:"导数与切线",formula:"f'(2)=12,\\quad y-13=12(x-2)"}]},
 {title:"变化率的说明书",layout:"essay",body:["给出当前位置与允许范围。","明确固定了哪些条件。","解释导数的符号、数值和单位。"],prompt:"用三句话解释$\\Pi'(50)=400$。"}
]);
