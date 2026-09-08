import type { ClassroomActor } from "@edu/contracts";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { LocalPortSimulationStage } from "./LocalPortSimulationStage";

export function AuthenticatedLocalPortSimulationPage() {
  const [actor, setActor] = useState<ClassroomActor>();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const resolveIdentity = async () => {
      try {
        let identity;
        try {
          identity = await api.getIdentitySession();
        } catch (reason) {
          if (!import.meta.env.DEV) throw reason;
          identity = await api.createDevelopmentIdentitySession("student");
        }
        if (active) setActor(identity.actor);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void resolveIdentity();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <section className="port-local-auth-state" role="alert">
        <CircleAlert aria-hidden="true" />
        <h1>请先登录教学信息系统</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!actor) {
    return (
      <section className="port-local-auth-state" role="status">
        <LoaderCircle className="spin" aria-hidden="true" />
        <h1>正在确认登录身份</h1>
        <p>身份确认完成后，港口仿真将在当前浏览器本地运行。</p>
      </section>
    );
  }

  return (
    <LocalPortSimulationStage
      actorId={actor.actorId}
      actorDisplayName={actor.displayName}
      storageScope={`standalone:${actor.actorId}`}
      initialChallengeId="joint-watch"
      sourceLabel={`${actor.identitySource === "development" ? "开发身份" : "校园账号"}已确认`}
    />
  );
}
