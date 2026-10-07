import { authoredLesson } from "../authoring.js";
export const lesson03=authoredLesson(3,"数列极限：逐轮接近","广告优化能无限增加触达吗？",["数列","不等式"],["识别数列的极限","用误差刻画接近","区别趋势与终点"],[{minutes:15,activity:"投放轮次"},{minutes:25,activity:"数列与极限"},{minutes:20,activity:"误差实验"},{minutes:20,activity:"独立练习"},{minutes:10,activity:"库存迁移"}],[
 {title:"极限与连续",layout:"cover",style:"cover",image:"unit-02.png",imageAlt:"接近与边界的拼贴",body:["第二单元 / 第3—6讲"],lead:"接近一个位置，究竟意味着什么？"},
 {title:"广告的逐轮改进",layout:"story",image:"l03-scene.png",imageAlt:"精品商店广告投放",lead:"教学模型中，第$n$轮触达指数为$a_n=120-60/n$。",prompt:"轮次翻倍时，改善幅度也翻倍吗？",sourceLabel:"教学情境"},
 {title:"轮次与数值",layout:"table",table:{columns:["轮次 n","触达指数"],rows:[["1","60"],["2","90"],["4","105"],["10","114"],["100","119.4"]]},prompt:"观察相邻改进的方向与幅度。"},
 {title:"接近与达到",layout:"essay",image:"l03-concept.png",imageAlt:"逐步接近目标的概念插画",formula:"a_n<120,\\qquad\\lim_{n\\to\\infty}a_n=120",body:["每一个有限轮次都没有达到120。","极限描述轮次充分大时的接近关系。"]},
 {title:"误差能直接计算",layout:"proof",formula:"|a_n-120|=\\frac{60}{n}",steps:[{title:"误差小于2",formula:"60/n<2\\Rightarrow n>30"},{title:"整数轮次",formula:"n\\ge31"},{title:"任意正误差",formula:"n>60/\\varepsilon\\Rightarrow|a_n-120|<\\varepsilon"}]},
 {title:"数列极限的实验",layout:"lab",interactionId:"sequence-limit-lab",interactionDefaults:{n:1,epsilon:"2"},prompt:"改变轮次与误差带，找到从哪一轮开始始终处于带内。"},
 {title:"极限的运算",layout:"proof",formula:"\\lim a_n=A,\\quad\\lim b_n=B",steps:[{title:"和与积",formula:"\\lim(a_n+b_n)=A+B,\\quad\\lim a_nb_n=AB"},{title:"商的条件",formula:"B\\ne0\\Rightarrow\\lim\\frac{a_n}{b_n}=\\frac AB"},{title:"例题",formula:"\\lim\\frac{3n+2}{2n-1}=\\lim\\frac{3+2/n}{2-1/n}=\\frac32"}]},
 {title:"有界不等于收敛",layout:"compare",style:"constructivist",formula:"a_n=(-1)^n",body:["所有项都在$[-1,1]$内。","奇数项为$-1$，偶数项为1。"],prompt:"它能同时接近哪一个唯一数值？"},
 {title:"单调有界的意义",layout:"essay",body:["递增且有上界的实数数列有极限。","递减且有下界的实数数列有极限。"],formula:"120-\\frac{60}{n}\\nearrow120",prompt:"上界可以取200，为什么极限仍是120？"},
 {title:"独立练习：库存回补",layout:"exercise",kind:"exercise",formula:"s_n=80+\\frac{40}{n+1}",prompt:"求极限；最早从第几轮开始，库存与极限的差小于1？",steps:[{title:"极限",formula:"\\lim s_n=80"},{title:"误差条件",formula:"40/(n+1)<1\\Rightarrow n>39"},{title:"整数结论",formula:"n\\ge40"}],sourceLabel:"教学情境"},
 {title:"预测需要说明时间范围",layout:"essay",body:["极限不是对下一轮的数值预测。","给出容许误差，才能讨论需要多少轮。"],prompt:"为广告模型写一条包含目标、误差和轮次的运营建议。"}
]);
