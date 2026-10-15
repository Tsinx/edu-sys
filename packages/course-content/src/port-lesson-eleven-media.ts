/** Public illustration metadata. Images depict generic teaching scenes, never historic evidence. */
const base='/course-assets/port-management/l11-media/';
const filmBase=base+'documentary-v2/';
export const PORT_ELEVEN_FILM={id:'l11-opening-v2',durationMs:180000,src:filmBase+'opening.mp4',poster:filmBase+'poster.jpg',player:filmBase+'index.html',captions:filmBase+'captions.vtt',title:'等待，发生在哪里'} as const;
export interface PortElevenIllustration {
  src:string;alt:string;caption:string;mode:'panorama'|'split'|'strip';
  callouts?:readonly {x:number;y:number;text:string}[];
}
export const PORT_ELEVEN_ILLUSTRATIONS:Readonly<Record<string,PortElevenIllustration>>={
 'l11-singapore-question':{src:filmBase+'cover.jpg',alt:'真实拍摄的集装箱堆场与运输车道，非新加坡2024年事件现场',caption:'许可实拍 · Toàn BDS / Pexels · 非新加坡事件现场',mode:'panorama'},
 'l11-mpa-evidence':{src:base+'anchorage.jpg',alt:'港外集装箱船舶与岸线的教学示意',caption:'AI场景；右侧为MPA历史材料',mode:'split'},
 'l11-congestion-mechanism':{src:base+'terminal.jpg',alt:'集装箱船、岸桥、运输、堆场与闸口的接续场景',caption:'AI教学示意 · 标注表示业务位置，不表示实测瓶颈',mode:'panorama',callouts:[{x:14,y:70,text:'船舶 / 泊位占用'},{x:37,y:39,text:'岸桥 / 岸侧缓存'},{x:62,y:59,text:'运输接续'},{x:73,y:29,text:'堆场 / 场桥'},{x:88,y:58,text:'闸口 / 交付'}]},
 'l11-six-time-events':{src:base+'quayside.jpg',alt:'从船上观察岸桥、作业船舶与集卡的教学示意',caption:'AI教学示意 · 时间端点由记录界定',mode:'strip'},
 'l11-stock-flow-balance':{src:base+'yard.jpg',alt:'场桥吊运与集卡在堆场作业面的接续',caption:'AI教学示意 · 吊箱、在途和待交付属于不同状态',mode:'split'},
 'l11-capacity-network':{src:base+'yard.jpg',alt:'场桥作业面、待接箱车辆与运输车道',caption:'AI教学示意 · 资源必须在同一时段接续',mode:'panorama',callouts:[{x:40,y:38,text:'场桥可用'},{x:31,y:72,text:'车辆 + 司机'},{x:73,y:66,text:'通道与作业面'}]},
 'l11-cppi-reading':{src:base+'quayside.jpg',alt:'靠泊船舶与岸桥的教学场景',caption:'AI教学示意 · 指数定义见世界银行方法说明',mode:'split'},
 'l11-live-feedback':{src:base+'terminal.jpg',alt:'观察上游卸船与下游交付之间的联系',caption:'AI教学示意 · 反馈应回到实际运行轨迹',mode:'panorama',callouts:[{x:22,y:58,text:'上游释放'},{x:58,y:57,text:'中间积压'},{x:87,y:60,text:'下游交付'}]},
 'l11-queue-area':{src:base+'yard.jpg',alt:'堆场服务与持续到达车辆的接续',caption:'AI教学示意 · 存量与出流分别核对',mode:'strip'},
 'l11-deadline-cohort':{src:base+'gate.jpg',alt:'闸口前待核验集卡与已通过车道',caption:'AI教学示意 · 未交付仍留在固定队列分母',mode:'strip'},
 'l11-bottleneck-migration':{src:base+'gate.jpg',alt:'多条闸口车道与待交付车辆',caption:'AI教学示意 · 哪一环成为新约束，需要试验',mode:'panorama',callouts:[{x:29,y:48,text:'到达闸口'},{x:49,y:62,text:'核验能力'},{x:73,y:45,text:'实际放行'}]},
 'l11-incentive-design':{src:base+'control-room.jpg',alt:'调度人员观察码头、堆场和闸口的教学场景',caption:'AI教学示意 · 局部指标与全程结果一起评审',mode:'split'},
 'l11-field-data-plan':{src:base+'control-room.jpg',alt:'控制室中的业务记录与港口现场',caption:'AI教学示意 · 画面不能替代日志与时间戳',mode:'split'},
 'l11-exit-decision':{src:base+'terminal.jpg',alt:'从海侧到陆侧的港口作业全景',caption:'AI教学示意 · 将建议放回完整业务链',mode:'split'}
};
