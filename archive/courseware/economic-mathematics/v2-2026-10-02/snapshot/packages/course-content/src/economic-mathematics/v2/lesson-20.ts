import { authoredLesson } from "../authoring.js";
export const lesson20=authoredLesson(20,"分部积分：把困难转移","一个乘积怎样化成更简单的积分？",["乘积求导","换元积分"],["选择u与dv","正确保留边界与符号","核验分部积分结果"],[{minutes:15,activity:"时间加权"},{minutes:25,activity:"公式推导"},{minutes:25,activity:"例题策略"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"综合选择"}],[
 {title:"随时间变化的工作量",layout:"story",image:"l20-scene.png",imageAlt:"手工作坊与时间安排",formula:"\\int t e^t\\,dt",prompt:"怎样让乘积中的$t$在求导后变简单？"},
 {title:"从乘积法则反推",layout:"essay",image:"l20-concept.png",imageAlt:"交换与简化的概念插画",formula:"d(uv)=u\\,dv+v\\,du",body:["将一个因子求导。","将另一个因子积分。","剩下的积分应比原来更容易。"]},
 {title:"分部积分公式",layout:"proof",formula:"\\int u\\,dv=uv-\\int v\\,du",steps:[{title:"选择",formula:"u=t,\\quad dv=e^t\\,dt"},{title:"计算部件",formula:"du=dt,\\quad v=e^t"},{title:"结果",formula:"\\int te^t\\,dt=te^t-e^t+C"}]},
 {title:"对数函数的积分",layout:"proof",formula:"\\int\\ln x\\,dx,\\quad x>0",steps:[{title:"隐含的因子1",formula:"u=\\ln x,\\quad dv=dx"},{title:"套用公式",formula:"x\\ln x-\\int1\\,dx"},{title:"结果",formula:"x\\ln x-x+C"}]},
 {title:"重复分部积分",layout:"proof",formula:"\\int x^2e^x\\,dx",steps:[{title:"第一次",formula:"x^2e^x-2\\int xe^x\\,dx"},{title:"第二次",formula:"e^x(x^2-2x+2)+C"},{title:"核验",formula:"[e^x(x^2-2x+2)]'=x^2e^x"}]},
 {title:"循环出现的积分",layout:"proof",formula:"I=\\int e^x\\cos x\\,dx",steps:[{title:"两次分部",formula:"I=e^x\\cos x+e^x\\sin x-I"},{title:"移项",formula:"I=\\tfrac12e^x(\\sin x+\\cos x)+C"}]},
 {title:"选择影响工作量",layout:"compare",body:["$u$求导后尽量更简单。","$dv$应能直接找到原函数。","若剩余积分更复杂，重新选择或改用换元。"],prompt:"积分$xe^{x^2}$更适合哪一种方法？",steps:[{title:"换元更直接",formula:"\\int xe^{x^2}\\,dx=\\tfrac12e^{x^2}+C"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"\\int x\\sin x\\,dx",prompt:"写出$u,dv,du,v$，求积分并核验。",steps:[{title:"选择",formula:"u=x,\\quad dv=\\sin x\\,dx,\\quad v=-\\cos x"},{title:"结果",formula:"-x\\cos x+\\sin x+C"}]},
 {title:"综合练习",layout:"exercise",kind:"exercise",formula:"\\int x\\ln x\\,dx,\\quad x>0",prompt:"完成分部积分。",steps:[{title:"选择",formula:"u=\\ln x,\\quad dv=x\\,dx"},{title:"结果",formula:"\\frac{x^2}2\\ln x-\\frac{x^2}4+C"}]},
 {title:"方法选择的三次检查",layout:"essay",body:["直接积分：能否展开、拆分或匹配公式？","换元：是否存在内层函数的微分因子？","分部：是否有一个因子求导后更简单？"],prompt:"为三种方法分别编一个例子，并核验结果。"}
]);
