import { api, ApiError } from "../api";
import type { RuntimeConfig } from "./runtime";

export function isLocalDevelopment(config: RuntimeConfig | undefined, developmentBuild: boolean) {
  return developmentBuild && config?.profile === "development" && config.identity === "development";
}

// React StrictMode mounts twice. Share the request so both mounts use one cookie.
let pendingIdentity: ReturnType<typeof api.getIdentitySession> | undefined;
export function ensureLocalIdentity(pathname: string) {
  pendingIdentity ??= api.getIdentitySession().catch(reason => {
    if (!(reason instanceof ApiError) || reason.status !== 401) throw reason;
    return api.createDevelopmentIdentitySession(pathname.startsWith("/join/") ? "student" : "teacher");
  }).finally(() => { pendingIdentity = undefined; });
  return pendingIdentity;
}
