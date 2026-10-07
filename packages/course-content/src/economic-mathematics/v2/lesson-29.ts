import { authoredLesson } from "../authoring.js";
export const lesson29=authoredLesson(29,"多元链式法则与隐函数","决策沿一条路径联动时，变化率怎样传递？",["偏导与全微分","单变量链式法则"],["计算联动路径导数","求隐函数偏导","解释保持目标不变的补偿"],[{minutes:15,activity:"联动路径"},{minutes:25,activity:"多元链式"},{minutes:25,activity:"隐函数与补偿"},{minutes:15,activity:"独立练习"},{minutes:10,activity:"策略迁移"}],[
 {title:"决策随着时间联动",layout:"story",image:"l29-scene.png",imageAlt:"供应链与联动决策",formula:"p(t)=60+t,\\quad a(t)=25+5t",prompt:"时刻0附近，日销量在增加还是减少？",sourceLabel:"教学情境"},
 {title:"沿路径合并贡献",layout:"essay",image:"l29-concept.png",imageAlt:"多条路径合流的插画",formula:"\\frac{dQ}{dt}=Q_p\\frac{dp}{dt}+Q_a\\frac{da}{dt}",body:["每条路径的局部效应乘以该路径的变化率。","最终单位是销量相对于时间参数的变化率。"]},
 {title:"完整联动计算",layout:"proof",formula:"Q=1200-8p+24\\sqrt a",steps:[{title:"时刻0的偏导",formula:"Q_p=-8,\\quad Q_a=2.4"},{title:"路径速度",formula:"p'=1,\\quad a'=5"},{title:"合并",formula:"Q'(0)=-8+2.4\\cdot5=4"}]},
 {title:"直接代入核验",layout:"proof",formula:"Q(t)=720-8t+24\\sqrt{25+5t}",steps:[{title:"求导",formula:"Q'(t)=-8+60/\\sqrt{25+5t}"},{title:"时刻0",formula:"Q'(0)=4"},{title:"范围",text:"路径必须满足广告非负和销量非负。"}]},
 {title:"多个自变量的链式",layout:"proof",formula:"z=f(x(u,v),y(u,v))",steps:[{title:"u方向",formula:"z_u=f_xx_u+f_yy_u"},{title:"v方向",formula:"z_v=f_xx_v+f_yy_v"},{title:"固定条件",text:"求$u$偏导时保持$v$固定，求$v$偏导时保持$u$固定。"}]},
 {title:"隐函数的局部斜率",layout:"proof",formula:"F(x,y)=0",steps:[{title:"沿曲线求导",formula:"F_x+F_yy'=0"},{title:"求解条件",formula:"F_y\\ne0\\Rightarrow y'=-F_x/F_y"},{title:"单位圆",formula:"x^2+y^2=1\\Rightarrow y'=-x/y"}]},
 {title:"保持销量不变的补偿",layout:"proof",formula:"dQ=-8dp+\\frac{12}{\\sqrt a}da=0",steps:[{title:"广告补偿率",formula:"\\frac{da}{dp}=\\frac23\\sqrt a"},{title:"在a=25处",formula:"da/dp=10/3"},{title:"解释",text:"小幅涨价1元/件，需要约增加3.33百元/日广告以保持模型销量。"}]},
 {title:"三变量隐函数",layout:"proof",formula:"F(x,y,z)=x^2+y^2+z^2-9=0",steps:[{title:"z方向条件",formula:"F_z=2z\\ne0"},{title:"偏导",formula:"z_x=-x/z,\\quad z_y=-y/z"},{title:"局部说明",text:"在$z\\ne0$的位置选定上下半球分支后求导。"}]},
 {title:"独立练习",layout:"exercise",kind:"exercise",formula:"z=x^2+y^2,\\quad x=t,y=t^2",prompt:"求$dz/dt$，并直接代入核验。",steps:[{title:"链式",formula:"z'=2t+4t^3"},{title:"直接",formula:"z=t^2+t^4\\Rightarrow z'=2t+4t^3"}]},
 {title:"迁移：等目标曲线",layout:"exercise",kind:"exercise",formula:"F(x,y)=xy-100=0,\\quad x,y>0",prompt:"在(10,10)处求补偿斜率；解释为何只是局部关系。",steps:[{title:"隐函数",formula:"y=100/x,\\quad y'=-100/x^2"},{title:"点值",formula:"y'(10)=-1"},{title:"边界",text:"较大幅度改变时斜率变化，需要重新计算。"}]}
]);
