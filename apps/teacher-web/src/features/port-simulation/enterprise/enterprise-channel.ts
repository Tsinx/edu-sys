import type {EnterpriseConfig,EnterpriseCommand,EnterpriseRecord,EnterpriseView,EnterprisePackage,EnterpriseYardExperiment} from '@edu/port-simulation-core';
export type EnterpriseResponse={id:number;type:string;view?:EnterpriseView;record?:EnterpriseRecord;package?:EnterprisePackage;csv?:string;error?:string;persist?:boolean;replaying?:boolean;hour?:number;horizon?:number;experiment?:EnterpriseYardExperiment};
export type EnterpriseRequest={type:string;config?:EnterpriseConfig;command?:EnterpriseCommand;record?:EnterpriseRecord;position?:number};
export interface EnterpriseWorkerPort {postMessage:(message:EnterpriseRequest&{id:number})=>void;terminate:()=>void}
/** One admitted operation at a time, independent of React's render timing. */
export class EnterpriseChannel<Context=undefined>{
  private seq=0;
  private pending?:{id:number;resolve:(r:EnterpriseResponse)=>void;reject:(e:Error)=>void;context:Context|undefined;timer:ReturnType<typeof setTimeout>;maximum:ReturnType<typeof setTimeout>};
  private stopped=false;
  private lastCommand?:{key:string;at:number};
  get busy(){return !!this.pending;}
  constructor(private port:EnterpriseWorkerPort,private callbacks:{state:(response:EnterpriseResponse,context:Context|undefined)=>void;busy:(value:boolean)=>void;progress:(response:EnterpriseResponse)=>void;failure:(error:Error)=>void},private timeoutMs=300000,private now=Date.now,private maxDurationMs=900000){}
  request(request:EnterpriseRequest,context?:Context):Promise<EnterpriseResponse>{
    if(this.stopped)return Promise.reject(Error('本机计算已中断，请恢复本机计算；最后确认的经营记录仍保留。'));
    if(this.pending)return Promise.reject(Error('正在完成上一项操作，请稍候；本次点击未重复执行。'));
    if(request.type==='command'&&request.command){
      const key=JSON.stringify(request.command),at=this.now();
      if(this.lastCommand?.key===key&&at-this.lastCommand.at<600)return Promise.reject(Error('已收到这项操作，本次快速重复点击未再次执行。'));
      this.lastCommand={key,at};
    }else if(request.type==='create'||request.type==='restore')this.lastCommand=undefined;
    const id=++this.seq;
    return new Promise((resolve,reject)=>{
      const timer=this.idleTimer();
      const maximum=setTimeout(()=>this.fail(Error('本轮计算超过最长时限，已保留最后确认的进度。请恢复本机计算后重试。')),this.maxDurationMs);
      this.pending={id,resolve,reject,context,timer,maximum};this.callbacks.busy(true);
      try{this.port.postMessage({...request,id});}catch(error){this.lastCommand=undefined;this.complete(undefined,error instanceof Error?error:Error(String(error)));}
    });
  }
  receive(response:EnterpriseResponse){
    if(this.stopped||!this.pending||response.id!==this.pending.id)return;
    if(response.type==='progress'){clearTimeout(this.pending.timer);this.pending.timer=this.idleTimer();this.callbacks.progress(response);return;}
    if(response.type==='error'){this.complete(undefined,Error(response.error??'仿真失败。'));return;}
    try{this.callbacks.state(response,this.pending.context);this.complete(response);}catch(error){this.complete(undefined,error instanceof Error?error:Error(String(error)));}
  }
  private idleTimer(){return setTimeout(()=>this.fail(Error('本轮计算超时，已保留最后确认的进度。请恢复本机计算后重试。')),this.timeoutMs);}
  private complete(response?:EnterpriseResponse,error?:Error){
    const p=this.pending;if(!p)return;this.pending=undefined;clearTimeout(p.timer);clearTimeout(p.maximum);this.callbacks.busy(false);
    if(error)p.reject(error);else p.resolve(response!);
  }
  fail(error:Error){if(this.stopped)return;this.stopped=true;this.port.terminate();this.complete(undefined,error);this.callbacks.failure(error);}
  close(){if(this.stopped)return;this.stopped=true;this.port.terminate();this.complete(undefined,Error('运行空间已关闭。'));}
}
