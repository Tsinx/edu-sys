import type { PortSimulationAuthoritativeEngineState } from "@edu/contracts";

function stableKey(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  for (const key of ["id", "resourceId", "incidentId", "role", "type"]) {
    if (typeof record[key] === "string") return `${key}:${record[key]}`;
  }
  return "";
}

function canonicalize(value: unknown): unknown {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : Math.round(value * 1_000_000) / 1_000_000;
  }
  if (Array.isArray(value)) {
    const normalized = value.map(canonicalize);
    if (normalized.every((item) => typeof item !== "object" || item === null)) {
      return [...normalized].sort((left, right) =>
        String(left).localeCompare(String(right))
      );
    }
    if (normalized.every((item) => stableKey(item))) {
      return [...normalized].sort((left, right) =>
        stableKey(left).localeCompare(stableKey(right))
      );
    }
    return normalized;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "wallClockAnchor")
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

export function canonicalPortSimulationStateJson(
  state: PortSimulationAuthoritativeEngineState
) {
  return JSON.stringify(canonicalize(state));
}

export async function hashPortSimulationState(
  state: PortSimulationAuthoritativeEngineState
) {
  const bytes = new TextEncoder().encode(canonicalPortSimulationStateJson(state));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}
