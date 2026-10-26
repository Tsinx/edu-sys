import type { AssetSpec, ProjectSpec } from './enterprise-model.js';

const asset = (id: string, name: string, stage: AssetSpec['stage'], goods: AssetSpec['goods'], rate: number, price: number, staff: AssetSpec['staff'], options: Partial<AssetSpec> = {}): AssetSpec => ({
  id, name, stage, goods, rate, price, leaseDaily: Math.round(price / 1500), leadDays: 30, lifeYears: 15,
  staff, staffRequired: 1, kw: 0, fuel: 0, battery: 0, reach: 0, lift: 0, required: 'none', maintenanceHours: 500,
  repairDays: 2, description: '公开规格维度用于适配；能力、费用和周期为本情境教学设定。', ...options,
});
export const ENTERPRISE_ASSETS: AssetSpec[] = [
  asset('sts-standard', '标准岸桥', 'quay', ['container'], 30, 24_000_000, 'crane', { kw: 360, reach: 18, lift: 40, leadDays: 120, maintenanceHours: 650 }),
  asset('sts-wide', '大伸距岸桥', 'quay', ['container'], 39, 36_000_000, 'crane', { kw: 470, reach: 24, lift: 55, leadDays: 180, required: 'grid', maintenanceHours: 800 }),
  asset('mobile-crane', '多用途移动起重机', 'quay', ['general', 'bulk'], 95, 8_500_000, 'crane', { fuel: 24, lift: 100, leadDays: 45 }),
  asset('ship-loader', '散货装卸船机', 'quay', ['bulk'], 350, 18_000_000, 'handling', { kw: 210, leadDays: 90 }),
  asset('liquid-arm', '液散装卸臂与泵组', 'quay', ['liquid'], 420, 9_000_000, 'handling', { kw: 140, leadDays: 60 }),
  asset('roro-ramp', '滚装桥与引导设备', 'quay', ['roro'], 90, 6_000_000, 'handling', { kw: 25 }),
  asset('passenger-gangway', '客运登离船设施', 'quay', ['passenger'], 220, 3_600_000, 'handling', { kw: 18 }),
  asset('diesel-tractor', '柴油集卡', 'transport', ['container'], 18, 680_000, 'driver', { fuel: 9, leadDays: 20, lifeYears: 10, maintenanceHours: 400 }),
  asset('electric-tractor', '电动集卡', 'transport', ['container'], 20, 1_050_000, 'driver', { kw: 48, battery: 280, required: 'grid', leadDays: 35, lifeYears: 10 }),
  asset('agv', '自动导引运输车', 'transport', ['container'], 22, 1_900_000, 'digital', { staffRequired: .25, kw: 42, battery: 240, required: 'automation', leadDays: 60 }),
  asset('bulk-conveyor', '散货输送线', 'transport', ['bulk'], 420, 5_200_000, 'handling', { kw: 90, leadDays: 60 }),
  asset('liquid-pipeline', '独立输送管线', 'transport', ['liquid'], 480, 5_800_000, 'handling', { kw: 80, leadDays: 75 }),
  asset('forklift', '重型叉车', 'transport', ['general'], 65, 1_100_000, 'driver', { fuel: 6, lift: 35, leadDays: 20 }),
  asset('tugmaster', '滚装牵引与车辆引导组', 'transport', ['roro'], 100, 850_000, 'driver', { fuel: 5, leadDays: 20 }),
  asset('passenger-transfer', '客运接驳系统', 'transport', ['passenger'], 250, 1_200_000, 'driver', { kw: 15 }),
  asset('rtg', '轮胎式场桥', 'yard', ['container'], 58, 10_000_000, 'yard', { fuel: 15, leadDays: 60 }),
  asset('rmg', '轨道式场桥', 'yard', ['container'], 80, 15_000_000, 'yard', { kw: 160, required: 'rail', leadDays: 120 }),
  asset('reachstacker', '正面吊', 'yard', ['container', 'general'], 24, 3_200_000, 'yard', { fuel: 8, lift: 45, leadDays: 25 }),
  asset('stacker', '堆取料机', 'yard', ['bulk'], 450, 9_000_000, 'yard', { kw: 150, leadDays: 90 }),
  asset('tank-pump', '储罐收发泵组', 'yard', ['liquid'], 500, 4_200_000, 'yard', { kw: 100, leadDays: 45 }),
  asset('warehouse-kit', '件杂货库场设备', 'yard', ['general'], 80, 1_800_000, 'yard', { kw: 15 }),
  asset('roro-yard', '滚装停车场管理设备', 'yard', ['roro'], 120, 1_600_000, 'yard', { kw: 12 }),
  asset('passenger-hall', '候船与安检设施', 'yard', ['passenger'], 260, 2_000_000, 'gate', { kw: 35 }),
  asset('manual-gate', '人工核验闸口', 'gate', ['container'], 28, 900_000, 'gate', { kw: 5, leadDays: 15 }),
  asset('smart-gate', '智能识别闸口', 'gate', ['container'], 48, 2_200_000, 'gate', { staffRequired: .5, kw: 12, required: 'automation' }),
  asset('bulk-gate', '散货计量交付设施', 'gate', ['bulk'], 460, 1_800_000, 'gate', { kw: 15 }),
  asset('liquid-dispatch', '液散管道交付站', 'gate', ['liquid'], 520, 2_800_000, 'gate', { kw: 45 }),
  asset('general-gate', '件杂货交接设施', 'gate', ['general'], 85, 600_000, 'gate', { kw: 5 }),
  asset('roro-gate', '车辆交付核验设施', 'gate', ['roro'], 120, 650_000, 'gate', { kw: 5 }),
  asset('passenger-gate', '客运出入站设施', 'gate', ['passenger'], 280, 750_000, 'gate', { kw: 12 }),
  asset('tug', '港作拖轮服务单元', 'marine', ['container', 'bulk', 'liquid', 'general', 'roro', 'passenger'], 1, 22_000_000, 'marine', { staffRequired: 2, fuel: 35, leadDays: 120 }),
];
export const assetSpec = (id: string) => { const found = ENTERPRISE_ASSETS.find(a => a.id === id); if (!found) throw Error('未知设备型号。'); return found; };
export const ENTERPRISE_PROJECTS: ProjectSpec[] = [
  { id: 'yard-extension', name: '库场扩容', price: 8_000_000, days: 75, target: 'terminal', effect: 'storage', description: '增加50%库场容量；施工期间库场有效能力下降15%。' },
  { id: 'road-upgrade', name: '道路与流线改造', price: 5_000_000, days: 45, target: 'terminal', effect: 'road', description: '运输距离系数降低20%；施工期间运输能力下降。' },
  { id: 'rail-link', name: '铁路及轨道接口', price: 18_000_000, days: 180, target: 'terminal', effect: 'rail', description: '接通铁路发运，并提供轨道场桥基础条件。' },
  { id: 'shore-power', name: '船舶岸电工程', price: 6_000_000, days: 90, target: 'terminal', effect: 'shore', description: '具备岸电连接条件；使用时消耗全港供电容量。' },
  { id: 'grid-upgrade', name: '供电扩容与充电设施', price: 9_000_000, days: 120, target: 'port', effect: 'grid', description: '全港增加2500kW供电和充电容量，目标码头接入升级。' },
  { id: 'solar-storage', name: '光伏与储能组合', price: 7_000_000, days: 90, target: 'port', effect: 'solar', description: '增加白天可用清洁供电；发电随时段和天气变化。' },
  { id: 'automation', name: '自动化与人员转型', price: 14_000_000, days: 150, target: 'terminal', effect: 'automation', description: '提供AGV和智能闸口的系统接口；仍需合格操作和监管人员。' },
  { id: 'port-community', name: '港口信息协同平台', price: 4_000_000, days: 60, target: 'port', effect: 'digital', description: '缩短单证反馈延迟，改善信息核验与网络恢复。' },
  { id: 'security', name: '保安与监测改造', price: 2_500_000, days: 40, target: 'terminal', effect: 'security', description: '降低侵入和危险事件暴露，改善应急监测。' },
  { id: 'flood', name: '防洪与排涝改造', price: 5_500_000, days: 90, target: 'terminal', effect: 'flood', description: '降低洪水停工时间和货损风险。' },
  { id: 'dust', name: '抑尘与污水收集', price: 3_000_000, days: 60, target: 'terminal', effect: 'dust', description: '减少散货作业环境暴露及整改停工风险。' },
  { id: 'bonded-warehouse', name: '监管仓储与业务接口', price: 6_500_000, days: 100, target: 'terminal', effect: 'bonded', description: '启用教学情境中的保税仓储路径；出区仍需放行与交付条件。' },
  { id: 'channel-depth', name: '泊位水深维护与提升', price: 12_000_000, days: 120, target: 'terminal', effect: 'depth', description: '目标泊位教学可用水深增加1.5m；施工期不能靠泊。' },
  { id: 'berth-extension', name: '泊位岸线延长', price: 20_000_000, days: 180, target: 'terminal', effect: 'berth', description: '岸线增加60m、库场增加20%；施工期间该泊位停用。' },
];
export const projectSpec = (id: string) => { const found = ENTERPRISE_PROJECTS.find(p => p.id === id); if (!found) throw Error('未知建设项目。'); return found; };
export const ENTERPRISE_PARAMETER_NOTES = [
  { group: '能力与适配', provenance: '教学设定', unit: '各货种单位/设备小时；米；千瓦', boundary: '用于同情境决策比较，不代表真实厂商生产承诺。' },
  { group: '财务与交期', provenance: '教学设定', unit: '人民币元；日；年', boundary: '价格、工资、利率、税率和交期均为固定版本情境参数。' },
  { group: '监管与信息', provenance: '教学抽象', unit: '仿真小时', boundary: '规则区分物理、单证、监管和交付状态，不替代现实监管规定。' },
  { group: '长期生产', provenance: '货批级离散模型', unit: '小时；TEU/吨/立方米/辆/人', boundary: '统计按货种分别输出，异种数量合计只作为教学工作量指数。' },
];
