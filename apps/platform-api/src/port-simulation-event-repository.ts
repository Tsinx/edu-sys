import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  portSimulationCanonicalEventSchema,
  portSimulationCheckpointSchema,
  portSimulationCommandResultV2Schema,
  type PortSimulationCanonicalEvent,
  type PortSimulationCheckpoint,
  type PortSimulationCommandResultV2,
  type PortSimulationEventBatch
} from "@edu/contracts";

export class PortSimulationEventRepository {
  private database: DatabaseSync | null = null;
  private readonly pendingEventWrites: Array<{
    event: PortSimulationCanonicalEvent;
    result: PortSimulationCommandResultV2;
    resolve: () => void;
    reject: (error: unknown) => void;
  }> = [];
  private readonly pendingReceipts = new Map<string, PortSimulationCommandResultV2>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly databaseFile: string) {}

  initialize() {
    if (this.database) return;
    mkdirSync(dirname(this.databaseFile), { recursive: true });
    const database = new DatabaseSync(this.databaseFile);
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA synchronous = NORMAL");
    database.exec(`
      CREATE TABLE IF NOT EXISTS port_simulation_runs (
        run_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        scenario_version TEXT NOT NULL,
        sync_mode TEXT NOT NULL,
        latest_sequence INTEGER NOT NULL DEFAULT 0,
        latest_checkpoint_sequence INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS port_simulation_runs_team
        ON port_simulation_runs(session_id, team_id, run_id);
      CREATE TABLE IF NOT EXISTS port_simulation_events (
        run_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        event_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (run_id, sequence)
      );
      CREATE TABLE IF NOT EXISTS port_simulation_checkpoints (
        run_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        checkpoint_json TEXT NOT NULL,
        state_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (run_id, sequence)
      );
      CREATE TABLE IF NOT EXISTS port_simulation_receipts (
        run_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        result_json TEXT NOT NULL,
        sequence INTEGER,
        created_at TEXT NOT NULL,
        PRIMARY KEY (run_id, request_id)
      );
    `);
    this.database = database;
  }

  close() {
    this.flushPendingEventWrites();
    this.database?.close();
    this.database = null;
  }

  private get db() {
    if (!this.database) this.initialize();
    return this.database!;
  }

  registerRun(input: {
    runId: string;
    sessionId: string;
    teamId: string;
    scenarioId: string;
    scenarioVersion: string;
    syncMode: "event_stream_v1";
    createdAt: string;
  }) {
    this.db.prepare(`
      INSERT OR IGNORE INTO port_simulation_runs (
        run_id, session_id, team_id, scenario_id, scenario_version,
        sync_mode, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.runId,
      input.sessionId,
      input.teamId,
      input.scenarioId,
      input.scenarioVersion,
      input.syncMode,
      input.createdAt,
      input.createdAt
    );
  }

  appendEvent(event: PortSimulationCanonicalEvent) {
    this.flushPendingEventWrites();
    const parsed = portSimulationCanonicalEventSchema.parse(event);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`
        INSERT INTO port_simulation_events (run_id, sequence, event_json, created_at)
        VALUES (?, ?, ?, ?)
      `).run(parsed.runId, parsed.sequence, JSON.stringify(parsed), parsed.createdAt);
      this.db.prepare(`
        UPDATE port_simulation_runs
        SET latest_sequence = ?, updated_at = ?
        WHERE run_id = ?
      `).run(parsed.sequence, parsed.createdAt, parsed.runId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  appendEventWithReceipt(
    event: PortSimulationCanonicalEvent,
    result: PortSimulationCommandResultV2
  ) {
    const parsedEvent = portSimulationCanonicalEventSchema.parse(event);
    const parsedResult = portSimulationCommandResultV2Schema.parse(result);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`
        INSERT INTO port_simulation_events (run_id, sequence, event_json, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        parsedEvent.runId,
        parsedEvent.sequence,
        JSON.stringify(parsedEvent),
        parsedEvent.createdAt
      );
      this.db.prepare(`
        UPDATE port_simulation_runs
        SET latest_sequence = ?, updated_at = ?
        WHERE run_id = ?
      `).run(
        parsedEvent.sequence,
        parsedEvent.createdAt,
        parsedEvent.runId
      );
      this.db.prepare(`
        INSERT OR REPLACE INTO port_simulation_receipts (
          run_id, request_id, result_json, sequence, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        parsedEvent.runId,
        parsedResult.requestId,
        JSON.stringify(parsedResult),
        parsedEvent.sequence,
        parsedEvent.createdAt
      );
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  enqueueEventWithReceipt(
    event: PortSimulationCanonicalEvent,
    result: PortSimulationCommandResultV2
  ) {
    const parsedEvent = portSimulationCanonicalEventSchema.parse(event);
    const parsedResult = portSimulationCommandResultV2Schema.parse(result);
    const key = `${parsedEvent.runId}:${parsedResult.requestId}`;
    this.pendingReceipts.set(key, parsedResult);
    const pending = new Promise<void>((resolve, reject) => {
      this.pendingEventWrites.push({
        event: parsedEvent,
        result: parsedResult,
        resolve,
        reject
      });
    });
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flushPendingEventWrites();
      }, 2);
      this.flushTimer.unref();
    }
    return pending;
  }

  private flushPendingEventWrites() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.pendingEventWrites.length === 0) return;
    const batch = this.pendingEventWrites.splice(0);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const insertEvent = this.db.prepare(`
        INSERT INTO port_simulation_events (run_id, sequence, event_json, created_at)
        VALUES (?, ?, ?, ?)
      `);
      const updateRun = this.db.prepare(`
        UPDATE port_simulation_runs
        SET latest_sequence = MAX(latest_sequence, ?), updated_at = ?
        WHERE run_id = ?
      `);
      const insertReceipt = this.db.prepare(`
        INSERT OR REPLACE INTO port_simulation_receipts (
          run_id, request_id, result_json, sequence, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `);
      for (const item of batch) {
        insertEvent.run(
          item.event.runId,
          item.event.sequence,
          JSON.stringify(item.event),
          item.event.createdAt
        );
        updateRun.run(
          item.event.sequence,
          item.event.createdAt,
          item.event.runId
        );
        insertReceipt.run(
          item.event.runId,
          item.result.requestId,
          JSON.stringify(item.result),
          item.event.sequence,
          item.event.createdAt
        );
      }
      this.db.exec("COMMIT");
      for (const item of batch) {
        this.pendingReceipts.delete(
          `${item.event.runId}:${item.result.requestId}`
        );
        item.resolve();
      }
    } catch (error) {
      this.db.exec("ROLLBACK");
      for (const item of batch) {
        this.pendingReceipts.delete(
          `${item.event.runId}:${item.result.requestId}`
        );
        item.reject(error);
      }
    }
  }

  saveCheckpoint(checkpoint: PortSimulationCheckpoint) {
    this.flushPendingEventWrites();
    const parsed = portSimulationCheckpointSchema.parse(checkpoint);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO port_simulation_checkpoints (
          run_id, sequence, checkpoint_json, state_hash, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        parsed.runId,
        parsed.sequence,
        JSON.stringify(parsed),
        parsed.stateHash,
        parsed.serverTime
      );
      this.db.prepare(`
        UPDATE port_simulation_runs
        SET latest_checkpoint_sequence = ?, updated_at = ?
        WHERE run_id = ?
      `).run(parsed.sequence, parsed.serverTime, parsed.runId);
      this.db.prepare(`
        DELETE FROM port_simulation_checkpoints
        WHERE run_id = ? AND sequence NOT IN (
          SELECT sequence FROM port_simulation_checkpoints
          WHERE run_id = ? ORDER BY sequence DESC LIMIT 3
        )
      `).run(parsed.runId, parsed.runId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getLatestCheckpoint(runId: string) {
    this.flushPendingEventWrites();
    const row = this.db.prepare(`
      SELECT checkpoint_json FROM port_simulation_checkpoints
      WHERE run_id = ? ORDER BY sequence DESC LIMIT 1
    `).get(runId) as { checkpoint_json?: string } | undefined;
    return row?.checkpoint_json
      ? portSimulationCheckpointSchema.parse(JSON.parse(row.checkpoint_json))
      : undefined;
  }

  getEventsAfter(runId: string, afterSequence: number): PortSimulationEventBatch {
    this.flushPendingEventWrites();
    const run = this.db.prepare(`
      SELECT latest_sequence FROM port_simulation_runs WHERE run_id = ?
    `).get(runId) as { latest_sequence?: number } | undefined;
    const earliest = this.db.prepare(`
      SELECT MIN(sequence) AS sequence FROM port_simulation_events WHERE run_id = ?
    `).get(runId) as { sequence?: number | null } | undefined;
    const latestSequence = Number(run?.latest_sequence ?? 0);
    const earliestSequence = Number(earliest?.sequence ?? 0);
    const resyncRequired = earliestSequence > 0 && afterSequence < earliestSequence - 1;
    const rows = resyncRequired
      ? []
      : (this.db.prepare(`
          SELECT event_json FROM port_simulation_events
          WHERE run_id = ? AND sequence > ? ORDER BY sequence ASC
        `).all(runId, afterSequence) as Array<{ event_json: string }>);
    return {
      runId,
      afterSequence,
      latestSequence,
      resyncRequired,
      events: rows.map((row) =>
        portSimulationCanonicalEventSchema.parse(JSON.parse(row.event_json))
      )
    };
  }

  compactEvents(runId: string, retain = 500) {
    this.flushPendingEventWrites();
    const run = this.db.prepare(`
      SELECT latest_sequence, latest_checkpoint_sequence
      FROM port_simulation_runs WHERE run_id = ?
    `).get(runId) as {
      latest_sequence?: number;
      latest_checkpoint_sequence?: number;
    } | undefined;
    const latest = Number(run?.latest_sequence ?? 0);
    const checkpoint = Number(run?.latest_checkpoint_sequence ?? 0);
    const through = Math.min(checkpoint, latest - retain);
    if (through <= 0) return 0;
    const result = this.db.prepare(`
      DELETE FROM port_simulation_events WHERE run_id = ? AND sequence <= ?
    `).run(runId, through);
    return Number(result.changes);
  }

  saveReceipt(
    runId: string,
    requestId: string,
    result: PortSimulationCommandResultV2,
    sequence: number | null,
    createdAt: string
  ) {
    this.flushPendingEventWrites();
    this.db.prepare(`
      INSERT OR REPLACE INTO port_simulation_receipts (
        run_id, request_id, result_json, sequence, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `).run(runId, requestId, JSON.stringify(result), sequence, createdAt);
  }

  getReceipt(runId: string, requestId: string) {
    const pending = this.pendingReceipts.get(`${runId}:${requestId}`);
    if (pending) return pending;
    const row = this.db.prepare(`
      SELECT result_json FROM port_simulation_receipts
      WHERE run_id = ? AND request_id = ?
    `).get(runId, requestId) as { result_json?: string } | undefined;
    return row?.result_json
      ? portSimulationCommandResultV2Schema.parse(JSON.parse(row.result_json))
      : undefined;
  }
}
