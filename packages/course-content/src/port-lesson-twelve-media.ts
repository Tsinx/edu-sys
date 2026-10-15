import type {PortElevenIllustration} from './port-lesson-eleven-media.js';
const base='/course-assets/port-management/l12-media/';
const filmBase=base+'documentary-v2/';
export const PORT_TWELVE_FILM={id:'l12-opening-v2',durationMs:180000,src:filmBase+'opening.mp4',poster:filmBase+'poster.jpg',player:filmBase+'index.html',captions:filmBase+'captions.vtt',title:'放行之前'} as const;
export const PORT_TWELVE_ILLUSTRATIONS:Readonly<Record<string,PortElevenIllustration>>={
 'l12-investigation-question':{src:filmBase+'cover.jpg',alt:'真实拍摄的仓储核验工作场景，人物与历史案件无关',caption:'许可实拍 · cottonbro studio / Pexels · 人物与案件无关',mode:'panorama'},
 'l12-tianjin-findings':{src:base+'warehouse.jpg',alt:'仓储检查人员核对库存与许可记录的教学场景',caption:'AI场景；右侧为天津调查报告材料',mode:'split'},
 'l12-evidence-levels':{src:base+'community.jpg',alt:'港区、交通通道和城市居民区之间空间关系的通用示意',caption:'AI教学示意 · 非天津历史布局或距离测量',mode:'split'},
 'l12-report-to-barrier':{src:base+'warehouse.jpg',alt:'仓库内的检查通道、分区储存和核验岗位',caption:'AI教学示意 · 标注为管理功能，不代替现场规范',mode:'panorama',callouts:[{x:28,y:43,text:'储存对象'},{x:59,y:49,text:'现场记录'},{x:81,y:67,text:'核验岗位'}]},
 'l12-barrier-specification':{src:base+'records.jpg',alt:'两名工作人员交叉核对纸质独立清单与电子记录',caption:'AI教学示意 · 记录来源独立性由证据确定',mode:'split'},
 'l12-common-cause':{src:base+'records.jpg',alt:'电子业务记录与纸质清单的核对场景',caption:'AI教学示意 · 多人确认不等于来源独立',mode:'strip'},
 'l12-nagoya-record':{src:base+'gate.jpg',alt:'现代港口集装箱闸口及等待核验的车辆',caption:'AI教学示意 · 非名古屋2023年事件实拍',mode:'panorama'},
 'l12-business-impact':{src:base+'gate.jpg',alt:'闸口接口、待交付车辆与内部堆场的衔接',caption:'AI教学示意 · 隔离范围由依赖与证据界定',mode:'panorama',callouts:[{x:28,y:43,text:'待交付车辆'},{x:55,y:55,text:'业务核验接口'},{x:82,y:30,text:'内部箱流'}]},
 'l12-continuity-options':{src:base+'drill.jpg',alt:'港口多岗位人员共同核对备用与恢复条件的教学演练',caption:'AI教学示意 · 角色与流程依核准制度确定',mode:'split'},
 'l12-incident-boundary':{src:base+'gate.jpg',alt:'港口闸口前需要确定业务影响边界的场景',caption:'AI教学示意 · 本实验为信息中断，设备可用',mode:'split'},
 'l12-manual-capacity':{src:base+'records.jpg',alt:'双人核验独立记录与业务额度的教学场景',caption:'AI教学示意 · 备用容量与额度为课程设定',mode:'split'},
 'l12-recovery-gates':{src:base+'drill.jpg',alt:'业务、技术与现场岗位核对恢复证据',caption:'AI教学示意 · 技术完成、数据可信与业务恢复分别取证',mode:'panorama',callouts:[{x:25,y:55,text:'技术状态'},{x:51,y:61,text:'记录一致'},{x:78,y:55,text:'业务验证'}]},
 'l12-responsibility-handoffs':{src:base+'handoff.jpg',alt:'值班人员核对对象、状态与下一步任务后交班',caption:'AI教学示意 · 岗位示例不代替实际法定职责',mode:'split'},
 'l12-residual-risk':{src:base+'handoff.jpg',alt:'新班次接收记录和剩余任务的教学场景',caption:'AI教学示意 · 恢复后仍需保留原始告警和未完业务',mode:'split'},
 'l12-exit-evidence':{src:base+'community.jpg',alt:'港口运行与城市居民生活共同存在的空间场景',caption:'AI教学示意 · 评价安全决策对公众与业务的影响',mode:'split'}
};
