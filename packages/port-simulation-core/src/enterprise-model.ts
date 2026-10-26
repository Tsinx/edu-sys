/** Long-horizon, single-player teaching model. Currency is CNY; rates are scenario assumptions. */
export const ENTERPRISE_VERSION = 'port-enterprise/1.0' as const;
export const ENTERPRISE_RULES = Object.freeze({ engine: ENTERPRISE_VERSION, catalogue: 'port-assets/1.0', demand: 'port-market/1.0', finance: 'port-finance/1.0', indicators: 'port-enterprise-score/1.0' });
export const ENTERPRISE_NOTE_TOPICS: readonly string[] = ['经营决策', '设备投资', '生产调度', '异常与边界'];
export type CargoKind = 'container' | 'bulk' | 'liquid' | 'general' | 'roro' | 'passenger';
export type Stage = 'quay' | 'transport' | 'yard' | 'gate' | 'marine';
export type StaffRole = 'crane' | 'driver' | 'yard' | 'gate' | 'technician' | 'marine' | 'digital' | 'handling';
export type Shift = 0 | 1 | 2;
export type Scenario = 'balanced' | 'growth' | 'green' | 'resilience';
export interface EnterpriseConfig { seed: number; years: 1 | 3 | 5; scenario: Scenario; mode: 'practice' | 'exam'; }
export interface AssetSpec {
  id: string; name: string; stage: Stage; goods: CargoKind[]; rate: number; price: number; leaseDaily: number;
  leadDays: number; lifeYears: number; staff: StaffRole; staffRequired: number; kw: number; fuel: number;
  battery: number; reach: number; lift: number; required: 'none' | 'rail' | 'grid' | 'automation';
  maintenanceHours: number; repairDays: number; description: string;
}
export interface Asset {
  id: string; model: string; terminalId: string; ownership: 'owned' | 'leased'; orderedHour: number; readyHour: number;
  commissionedHour: number | null; status: 'ordered' | 'commissioning' | 'active' | 'maintenance' | 'failed' | 'retired';
  ageHours: number; workedHours: number; serviceHours: number; health: number; battery: number; batteryHealth: number;
  repairUntil: number | null; purchasePrice: number; residual: number; bookAtStart: number; oldAgeYears: number;
  downtimeHours: number; lastWork: number; note: string;
  leaseCredit: number;
}
export interface Terminal {
  id: string; name: string; goods: CargoKind; length: number; depth: number; rail: boolean; shore: boolean;
  storageCapacity: number; distance: number; gridLevel: number; automation: number; security: number;
  dustControl: number; floodProtection: number; bonded: boolean; berthCall: string | null;
  position: [number, number]; constructionUntil: number; enabled: boolean;
}
export interface Crew {
  id: string; role: StaffRole; count: number; shift: Shift | 'reserve'; skill: number; trainingUntil: number;
  trainingGain: number; hiredHour: number; wage: number;
}
export type DocumentKind = 'entry' | 'manifest' | 'customs' | 'carrier' | 'departure';
export type DocumentState = 'draft' | 'submitted' | 'approved' | 'correction';
export interface CallDocument { status: DocumentState; readyHour: number; reference: string; reason: string; }
export interface EnterpriseCall {
  id: string; terminalId: string; customerId: string; name: string; goods: CargoKind; eta: number; arrival: number;
  arrivedHour: number | null; berthedHour: number | null; workHour: number | null; departedHour: number | null;
  stage: 'announced' | 'waiting' | 'entering' | 'berthed' | 'leaving' | 'departed'; moveUntil: number;
  plannedTerminal: string | null; contractId: string | null; length: number; draft: number; rows: number; importLot: string; exportLot: string;
  deadline: number; documents: Record<DocumentKind, CallDocument>; issue: boolean; inspected: boolean;
  wait: { berth: number; channel: number; documents: number; equipment: number }; price: number;
}
export interface CargoLot {
  id: string; callId: string; terminalId: string; goods: CargoKind; flow: 'import' | 'export'; quantity: number;
  ship: number; apron: number; yard: number; land: number; completed: number; lost: number;
  quarantine: boolean; inspectionUntil: number | null; release: boolean; bonded: boolean;
  route: 'road' | 'rail' | 'barge' | 'pipeline'; deadline: number; firstHour: number; lastHour: number;
  waitingUnitHours: number; completedTimeSum: number; rehandleRemaining: number; lateUnits: number; revenue: number; storageFees: number; rehandles: number;
}
export interface Customer { id: string; name: string; goods: CargoKind; loyalty: number; served: number; late: number; rate: number; }
export interface Contract {
  id: string; customerId: string; title: string; goods: CargoKind; volume: number; price: number;
  startHour: number; endHour: number; accepted: boolean; expires: number; shipped: number; promised: number;
  penalty: number; settled: boolean;
}
export interface ProjectSpec {
  id: string; name: string; price: number; days: number; target: 'terminal' | 'port'; description: string;
  effect: 'storage' | 'road' | 'rail' | 'shore' | 'grid' | 'solar' | 'automation' | 'digital' | 'security' | 'flood' | 'dust' | 'bonded' | 'depth' | 'berth';
}
export interface Project { id: string; type: string; terminalId: string; started: number; completes: number; price: number; status: 'building' | 'completed'; }
export interface Policy {
  autoBerth: boolean; documents: 'automatic' | 'manual'; verifiedExceptions: boolean; priority: 'deadline' | 'fifo' | 'export';
  maintenance: 'preventive' | 'reactive'; maintenanceHealth: number; shorePower: boolean;
  roadQuota: number; railHour: number; bargeHour: number; transport: 'road' | 'rail' | 'barge' | 'balanced';
  tariff: number; reserveCash: number; insurance: boolean; autoSupplies: boolean;
}
export interface Incident {
  id: string; type: 'equipment' | 'power' | 'system' | 'flood' | 'spill' | 'security' | 'road';
  title: string; terminalId: string | null; started: number; status: 'active' | 'contained' | 'resolved';
  response: 'none' | 'isolate' | 'backup' | 'repair' | 'recover'; resolves: number | null; evidence: boolean;
  loss: number; blockedHours: number;
}
export interface MoneyEntry { hour: number; category: string; amount: number; cash: number; note: string; }
export interface Receivable { id: string; due: number; amount: number; }
export interface MonthReport {
  month: string; revenue: number; operating: number; capital: number; interest: number; depreciation: number;
  tax: number; handled: number; onTime: number; generated: number; energy: number; emissions: number;
  waiting: number; rehandles: number; cashEnd: number; debtEnd: number;
}
export interface EnterpriseEvent { id: number; hour: number; kind: string; title: string; detail: string; object: string; }
export interface EnterpriseStats {
  generated: number; delivered: number; onTime: number; lost: number; unloaded: number; loaded: number;
  waitingUnitHours: number; vesselWaiting: number; vesselHours: number; departed: number; rehandles: number;
  energy: number; fuel: number; emissions: number; spillExposure: number; roadWaiting: number; maintenance: number;
  unsafeAttempts: number; recovered: number; decisionNotes: number;
}
export interface EnterpriseState {
  schema: typeof ENTERPRISE_VERSION; rules: typeof ENTERPRISE_RULES; config: EnterpriseConfig; hour: number; horizon: number;
  terminals: Terminal[]; assets: Asset[]; crews: Crew[]; calls: EnterpriseCall[]; lots: CargoLot[]; customers: Customer[];
  contracts: Contract[]; projects: Project[]; incidents: Incident[]; policy: Policy;
  cash: number; debt: number; initialEquity: number; initialAssetValue: number; receivables: Receivable[];
  ledger: MoneyEntry[]; months: MonthReport[]; stats: EnterpriseStats; events: EnterpriseEvent[]; eventSequence: number;
  journal: EnterpriseJournal[]; notes: { hour: number; topic: string; text: string }[];
  gridKw: number; solarKw: number; digitalLevel: number; fuelStock: number; spareParts: number;
  governance: 'integrated' | 'landlord'; concessionRate: number; lastMarketQuarter: number;
  sealed: boolean; nextId: number;
}
export type EnterpriseCommand =
  | { kind: 'advance'; hours: number; stopOnIncident?: boolean }
  | { kind: 'policy'; patch: Partial<Policy> }
  | { kind: 'order-asset'; model: string; terminalId: string; ownership: 'owned' | 'leased' }
  | { kind: 'assign-asset'; assetId: string; terminalId: string }
  | { kind: 'maintain'; assetId: string; overhaul: boolean }
  | { kind: 'dispose'; assetId: string }
  | { kind: 'project'; type: string; terminalId: string }
  | { kind: 'hire'; role: StaffRole; count: number; shift: Shift | 'reserve' }
  | { kind: 'staff'; crewId: string; shift: Shift | 'reserve' }
  | { kind: 'train'; crewId: string }
  | { kind: 'release-staff'; crewId: string }
  | { kind: 'berth'; callId: string; terminalId: string }
  | { kind: 'document'; callId: string; document: DocumentKind; reference: string }
  | { kind: 'inspect'; lotId: string }
  | { kind: 'route'; lotId: string; route: CargoLot['route']; bonded: boolean }
  | { kind: 'accept-contract'; contractId: string }
  | { kind: 'respond'; incidentId: string; action: Incident['response'] | 'audit' }
  | { kind: 'loan'; amount: number }
  | { kind: 'repay'; amount: number }
  | { kind: 'supplies'; item: 'fuel' | 'parts'; quantity: number }
  | { kind: 'governance'; value: EnterpriseState['governance'] }
  | { kind: 'note'; topic: string; text: string }
  | { kind: 'seal' };
export interface EnterpriseJournal { hour: number; command: EnterpriseCommand; ok: boolean; message: string; }
export interface EnterpriseRecord {
  schema: typeof ENTERPRISE_VERSION; rules: typeof ENTERPRISE_RULES; config: EnterpriseConfig;
  commands: EnterpriseCommand[];
}
export interface EnterpriseScore {
  total: number; complete: boolean; progress: number;
  components: { id: string; label: string; score: number; max: number; detail: string }[];
  equity: number; assetValue: number; receivables: number; futureObligations: number; profit: number;
  deliveryRate: number; waitingHours: number; emissionsPerUnit: number; benchmark: string;
  prepaidLease: number;
}
export interface EnterpriseTask {
  id: string; title: string; courseId: string; config: EnterpriseConfig; rules: typeof ENTERPRISE_RULES;
  createdAt: string; deadline: string | null; closed: boolean; maxAttempts: number; completeRequired: boolean;
}
export interface EnterpriseAttemptSummary {
  id: string; taskId: string; actorId: string; displayName: string; config: EnterpriseConfig;
  status: 'started' | 'queued' | 'verifying' | 'verified' | 'rejected'; createdAt: string; submittedAt: string | null;
  error: string | null; result: EnterpriseScore | null;
}
export const ENTERPRISE_START = Date.UTC(2027, 0, 1);
export const hourDate = (hour: number) => new Date(ENTERPRISE_START + hour * 3_600_000);
export const hourLabel = (hour: number) => hourDate(hour).toISOString().slice(0, 16).replace('T', ' ');
export const monthKey = (hour: number) => hourDate(hour).toISOString().slice(0, 7);
export function quarterIndex(hour: number) { const d = hourDate(hour); return (d.getUTCFullYear() - 2027) * 4 + Math.floor(d.getUTCMonth() / 3); }
export function nextQuarterHour(hour: number) { const d = hourDate(hour); return (Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3 + 3, 1) - ENTERPRISE_START) / 3_600_000; }
export function enterpriseHorizon(years: number) { return (Date.UTC(2027 + years, 0, 1) - ENTERPRISE_START) / 3_600_000; }
export function enterpriseRandom(seed: number, stream: string, at: number): number {
  let h = (seed ^ Math.imul(at + 1, 0x9e3779b1)) >>> 0;
  for (let i = 0; i < stream.length; i++) h = Math.imul(h ^ stream.charCodeAt(i), 0x85ebca6b) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export const CARGO_LABELS: Record<CargoKind, { name: string; unit: string; rate: number; footprint: number }> = {
  container: { name: '集装箱', unit: 'TEU', rate: 1200, footprint: 1 },
  bulk: { name: '干散货', unit: '吨', rate: 110, footprint: 1 },
  liquid: { name: '液体散货', unit: '立方米', rate: 125, footprint: 1 },
  general: { name: '件杂货', unit: '吨', rate: 280, footprint: 1 },
  roro: { name: '滚装车辆', unit: '辆', rate: 460, footprint: 1 },
  passenger: { name: '客运', unit: '人', rate: 75, footprint: 1 },
};
export const STAFF_LABELS: Record<StaffRole, string> = { crane: '起重操作', driver: '车辆操作', yard: '堆存操作', gate: '闸口与物流', technician: '维修技术', marine: '引航与拖轮', digital: '数字系统', handling: '专业装卸' };
export const SCENARIOS: Record<Scenario, { name: string; description: string }> = {
  balanced: { name: '接管东湾港', description: '接管新旧设备混合的综合港，协调六类业务，稳定服务、资金与资产。' },
  growth: { name: '货源增长与分期扩建', description: '增长需求与大型船增加，在建设周期和现金约束下安排能力扩展。' },
  green: { name: '能源转型与设备更新', description: '电力容量、设备替换、岸电与人工结构共同影响转型结果。' },
  resilience: { name: '复合中断下的持续经营', description: '天气、设备和信息中断叠加，检验备用能力、恢复与履约。' },
};
