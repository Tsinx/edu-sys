import { z } from "zod";
import { avatarControlActionSchema, type AvatarControlResponse } from "./index.js";

const turnId = z.string().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const realtimeClientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("turn.begin"), turnId }).strict(),
  z.object({ type: z.literal("audio.append"), turnId, audioBase64: z.string().min(4).max(24_000).regex(/^[A-Za-z0-9+/]+={0,2}$/) }).strict(),
  z.object({ type: z.literal("turn.commit"), turnId }).strict(),
  z.object({ type: z.literal("turn.cancel"), turnId }).strict()
]);
export type RealtimeClientEvent = z.infer<typeof realtimeClientEventSchema>;
export const realtimeControlSchema = z.object({
  actions: z.array(z.lazy(() => avatarControlActionSchema)).min(1).max(8)
}).strict();
export type RealtimeControl = z.infer<typeof realtimeControlSchema>;
export interface RealtimeTiming {
  responseCount: number;
  /** Submit to a complete, validated tool request; absent for ordinary answers. */
  toolDecisionMs?: number;
  firstTextMs?: number;
  firstAudioMs?: number;
  totalMs: number;
}
export type RealtimeServerEvent =
  | { type: "session.ready" }
  | { type: "session.idle" }
  | { type: "turn.started"; turnId: string }
  | { type: "input.transcript"; turnId: string; text: string }
  | { type: "dialogue.delta"; turnId: string; delta: string }
  | { type: "audio.delta"; turnId: string; audioBase64: string; sampleRate: 24000 }
  | { type: "control.result"; turnId: string; result: AvatarControlResponse }
  | { type: "turn.completed"; turnId: string; timing: RealtimeTiming }
  | { type: "turn.cancelled"; turnId: string }
  | { type: "error"; turnId?: string; code: string; message: string };
