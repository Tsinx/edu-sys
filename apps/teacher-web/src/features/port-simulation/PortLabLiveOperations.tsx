import { physicalPhaseProgress, physicalVehiclePose, type PortView } from '@edu/port-simulation-core';

const phases:Record<string,string>={'traffic-wait':'等待作业区放行','road-wait':'车辆等待道路时隙','work-wait':'等待作业区道路清空','empty':'接箱车辆空驶','haul':'车辆重载运输','machine':'场桥转场','crane':'岸桥沿轨移机'};

/** A readable counterpart of the same jobs and poses used by the Three.js scene. */
export function PortLabLiveOperations({view,onFocus}:{view:PortView;onFocus:(id:string)=>void}) {
  const groups=[['quay','岸桥'],['truck','集卡运输'],['yard','场桥'],['gate','闸口']] as const;
  return <section className="pcl-live-operations" aria-label="实际设备作业">
    {groups.map(([kind,label])=>{
      const jobs=view.jobs.filter(job=>job.kind===kind),job=jobs.find(job=>job.rate>0)??jobs[0];
      const progress=job?physicalPhaseProgress(job,view.second):0;
      const carrier=job?.physical?.carrier;
      const pose=carrier!==undefined&&carrier!==null&&view.facilities?physicalVehiclePose(view.facilities,view.jobs,carrier,view.second):null;
      const vehicleName=carrier===undefined||carrier===null?'':view.facilities?.vehicles[carrier]?.external?`外集卡${carrier-view.plan.equipment.vehicles+1}`:`场内车${carrier+1}`;
      const phase=job?.physical?.stage==='service'?(kind==='gate'?'闸口核验':kind==='quay'?'船岸吊装交接':'堆场吊装交接'):phases[job?.physical?.stage??'']??'作业中';
      return <div key={kind} data-operation={kind}>
        <span>{label} · {jobs.length}项任务</span>
        {job?<><button type="button" onClick={()=>onFocus(job.physical?.parking&&job.kind==='yard'?`yard-crane-${job.resource}`:job.boxId)} title="在三维现场定位当前任务">{job.physical?.parking&&job.kind==='yard'?`场桥${job.resource+1}空载返回`:job.boxId}</button><output aria-label={`${label}当前作业`}>{job.rate===0?'暂停／等待条件':phase} · {Math.round(progress*100)}%</output><progress aria-label={`${label}作业进度`} max={1} value={progress}/>{pose&&<small aria-label={`${label}车辆位置`}>{vehicleName} · x {pose.x.toFixed(1)} / z {pose.z.toFixed(1)}</small>}</>:<output aria-label={`${label}当前作业`}>暂无可执行任务</output>}
      </div>;
    })}
  </section>;
}
