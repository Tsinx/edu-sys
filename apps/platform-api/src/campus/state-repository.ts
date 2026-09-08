import type { PlatformState } from "../seed.js";
import { openDatabase, transaction } from "./database.js";

/** Entity documents keep legacy domain contracts while updating only changed rows. */
export class CampusStateRepository {
  readonly db;
  private saved = new Map<string, string>();
  constructor(path: string) {
    this.db = openDatabase(path);
    this.db.exec("CREATE TABLE IF NOT EXISTS platform_documents (collection TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(collection,id))");
  }
  load(): PlatformState | undefined {
    const rows = this.db.prepare("SELECT collection,id,payload FROM platform_documents ORDER BY collection,id").all();
    if (!rows.length) return undefined;
    const result: Record<string, unknown> = {};
    const arrays = new Set(["teachers", "courses", "classSessions", "studySessions", "activities"]);
    const orders = new Map<string, string[]>();
    for (const row of rows) {
      const collection = String(row.collection);
      const id = String(row.id);
      const payload = String(row.payload);
      this.saved.set(`${collection}\0${id}`, payload);
      if (id === "__order") orders.set(collection, JSON.parse(payload));
      else if (id === "__value") result[collection] = JSON.parse(payload);
      else if (arrays.has(collection)) ((result[collection] ??= []) as unknown[]).push(JSON.parse(payload));
      else ((result[collection] ??= {}) as Record<string, unknown>)[id] = JSON.parse(payload);
    }
    for (const [collection, order] of orders) {
      const values = result[collection] as Array<{ id: string }>;
      values.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    return result as unknown as PlatformState;
  }
  save(state: PlatformState) {
    const next = new Map<string, string>();
    for (const [collection, value] of Object.entries(state)) {
      if (Array.isArray(value) && value.length && value.every(item => item && typeof item.id === "string")) {
        next.set(`${collection}\0__order`, JSON.stringify(value.map(item => item.id)));
        for (const item of value) next.set(`${collection}\0${item.id}`, JSON.stringify(item));
      } else if (value && !Array.isArray(value) && typeof value === "object" && Object.keys(value).length) {
        for (const [id, item] of Object.entries(value)) next.set(`${collection}\0${id}`, JSON.stringify(item));
      } else next.set(`${collection}\0__value`, JSON.stringify(value));
    }
    transaction(this.db, () => {
      const put = this.db.prepare("INSERT INTO platform_documents VALUES (?,?,?) ON CONFLICT(collection,id) DO UPDATE SET payload=excluded.payload");
      const remove = this.db.prepare("DELETE FROM platform_documents WHERE collection=? AND id=?");
      for (const [key, payload] of next) if (this.saved.get(key) !== payload) put.run(...key.split("\0") as [string,string], payload);
      for (const key of this.saved.keys()) if (!next.has(key)) remove.run(...key.split("\0") as [string,string]);
    });
    this.saved = next;
  }
  close() { this.db.close(); }
}
