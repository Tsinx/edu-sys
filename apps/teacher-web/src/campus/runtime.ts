export interface RuntimeConfig { profile:"campus"|"development"; identity:string; avatar:"browser"|"lam"; simulation:string; synchronization:string; speech:{asr:boolean;tts:boolean} }
export let runtimeConfig:RuntimeConfig={profile:"development",identity:"development",avatar:"lam",simulation:"local_solo",synchronization:"checkpoints-v1",speech:{asr:false,tts:false}};
export function setRuntimeConfig(value:RuntimeConfig){runtimeConfig=value;}
