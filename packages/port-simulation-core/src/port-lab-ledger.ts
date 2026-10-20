import { PORT_LAB_LEDGER } from './port-class-lab-legacy.js';
import type { PortClassLab } from './port-class-lab.js';

/** A separate, explicitly authored teaching copy, available after the backup inspection. */
export const PORT_LAB_INDEPENDENT_RECORDS = [
  { reference: 'IND-T01', ticket: 'T01', version: 18, quantity: 12 },
  { reference: 'IND-T02', ticket: 'T02', version: 18, quantity: 18 },
  { reference: 'IND-T04', ticket: 'T04', version: 18, quantity: 12 },
  { reference: 'IND-T05', ticket: 'T05', version: 18, quantity: 8 },
] as const;

export function reviewPortLabLedger(quarantine: readonly string[]) {
  const selected = Array.isArray(quarantine) ? quarantine : [];
  const idsValid = Array.isArray(quarantine) && new Set(quarantine).size === quarantine.length
    && quarantine.every(id => PORT_LAB_LEDGER.some(row => row.id === id));
  const retained = PORT_LAB_LEDGER.filter(row => !selected.includes(row.id));
  const errors: string[] = [];
  if (!idsValid) errors.push('隔离记录编号无效或重复。');
  if (!retained.length) errors.push('全部记录已隔离，没有可核验并用于备用交付的记录。');
  for (const row of retained) {
    const source = PORT_LAB_INDEPENDENT_RECORDS.find(record => record.ticket === row.ticket);
    if (!source || row.version !== source.version || row.declared !== source.quantity) {
      errors.push(`${row.id}的版本或申报数量与独立凭据不一致。`);
    }
  }
  for (const ticket of new Set(retained.map(row => row.ticket))) {
    if (retained.filter(row => row.ticket === ticket).length > 1) errors.push(`票号${ticket}重复保留，不能重复计算数量。`);
  }
  const valid = errors.length === 0;
  const quantity = valid ? retained.reduce((sum, row) => sum + row.declared, 0) : 0;
  const pendingTickets = PORT_LAB_INDEPENDENT_RECORDS.filter(record => !retained.some(row => row.ticket === record.ticket)).map(record => record.ticket);
  return { valid, errors, retained, quantity, limit: Math.min(24, quantity), pendingTickets };
}

/** Derived from accepted commands, so imported flags cannot enlarge an allowance. */
export function portLabBackupCapacity(run: PortClassLab): number {
  if (!run.incident?.backupVerified) return 0;
  if (!run.scenario) return 24;
  const audit = run.commands.find(command => command.kind === 'audit' || command.kind === 'start-audit');
  return audit && (audit.kind === 'audit' || audit.kind === 'start-audit') ? reviewPortLabLedger(audit.quarantine).limit : 0;
}
