import { authoredLesson } from "../authoring.js";
export const lesson09=authoredLesson(9,"链式法则：沿关系传递变化","曝光变化怎样传到订阅收入？",["基本求导","复合函数"],["识别内外函数","计算复合变化率","核对单位链"],[{minutes:15,activity:"订阅漏斗"},{minutes:25,activity:"链式法则"},{minutes:25,activity:"完整计算"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"迁移建模"}],[
 {title:"从曝光到收入",layout:"story",image:"l09-scene.png",imageAlt:"订阅服务的运营场景",lead:"曝光量$u$影响订阅数$n$，订阅数影响月收入$R$。",formula:"n(u)=100\\ln(1+u),\\quad R(n)=20n",prompt:"曝光增加一个单位，收入约增加多少？",sourceLabel:"教学情境"},
 {title:"变化经过中间变量",layout:"essay",image:"l09-concept.png",imageAlt:"连续传递的概念插画",formula:"\\frac{dR}{du}=\\frac{dR}{dn}\\frac{dn}{du}",body:["收入/订阅数，乘以订阅数/曝光量。","中间单位消去，得到收入/曝光量。"]},
 {title:"订阅模型的完整计算",layout:"proof",formula:"u\\ge0",steps:[{title:"内层",formula:"n'(u)=100/(1+u)"},{title:"外层",formula:"R'(n)=20"},{title:"合成",formula:"\\frac{dR}{du}=\\frac{2000}{1+u}"}]},
 {title:"一般链式法则",layout:"proof",formula:"y=f(g(x))\\Rightarrow y'=f'(g(x))g'(x)",steps:[{title:"平方的内层",formula:"[(3x+1)^2]'=2(3x+1)\\cdot3"},{title:"指数的内层",formula:"[e^{-2x}]'=-2e^{-2x}"}]},
 {title:"根式与对数",layout:"proof",formula:"y=\\sqrt{1+x^2},\\quad z=\\ln(1+x^2)",steps:[{title:"根式",formula:"y'=\\frac{x}{\\sqrt{1+x^2}}"},{title:"对数",formula:"z'=\\frac{2x}{1+x^2}"}]},
 {title:"漏掉内层会怎样？",layout:"compare",style:"constructivist",formula:"[\\sin(5x)]'=5\\cos(5x)",prompt:"比较$\\sin x$和$\\sin(5x)$在0处的斜率。为什么相差5倍？"},
 {title:"隐函数也可沿链计算",layout:"proof",formula:"x^2+y^2=25",steps:[{title:"对x求导",formula:"2x+2yy'=0"},{title:"解导数",formula:"y'=-x/y,\\quad y\\ne0"},{title:"点(3,4)",formula:"y'=-3/4"}]},
 {title:"对数求导简化乘积",layout:"proof",formula:"y=x^x,\\quad x>0",steps:[{title:"取对数",formula:"\\ln y=x\\ln x"},{title:"求导",formula:"y'/y=\\ln x+1"},{title:"还原",formula:"y'=x^x(\\ln x+1)"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"f(x)=\\ln(2x+3),\\quad g(x)=e^{x^2}",prompt:"求导，写出$f$的定义域，并计算$g'(1)$。",steps:[{title:"对数",formula:"f'=2/(2x+3),\\quad x>-3/2"},{title:"指数",formula:"g'=2xe^{x^2},\\quad g'(1)=2e"}]},
 {title:"迁移：获客成本",layout:"exercise",kind:"exercise",lead:"客户数$n(t)=50\\sqrt{t+1}$，总服务成本$C(n)=10n+0.1n^2$。",prompt:"建立$dC/dt$，解释其中两种变化率。",steps:[{title:"链式计算",formula:"\\frac{dC}{dt}=(10+0.2n)\\frac{25}{\\sqrt{t+1}}"},{title:"代入",formula:"\\frac{dC}{dt}=250/\\sqrt{t+1}+250"}],sourceLabel:"教学情境"}
]);


