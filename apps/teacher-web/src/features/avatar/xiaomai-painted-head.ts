import {Container,Mesh,MeshGeometry,MeshMaterial,Texture} from 'pixi.js';
import {bakedHeadYaw} from './xiaomai-head-projection';
import {xiaomaiPoint,type XiaomaiPose} from './xiaomai-motion';

type Layer={name:string;box:[number,number,number,number];png:string};
/** Lossless source layers avoid the trial model atlas's resampled cut seams.
 * A separate opt-in 2D renderer consumes the Blender bake; it is not a moc3 export.
 */
export class XiaomaiPaintedHead {
  readonly container=new Container();
  readonly ready:Promise<void>;
  private disposed=false;
  private meshes:{name:string;mesh:Mesh;vertices:Float32Array;base:Float32Array;yaw:Float32Array}[]=[];
  constructor(){
    this.container.visible=false;
    this.ready=this.load();
  }
  private async load(){
    const root='/avatar/live2d/xiaomai/head-layers/';
    const response=await fetch(root+'manifest.json');if(!response.ok)throw new Error('Missing head layers');
    const layers:Layer[]=await response.json();
    for(const layer of layers){
      const image=new Image();image.src=root+layer.png;await image.decode();
      if(this.disposed)return;
      const [l,t,r,b]=layer.box,step=t>440?16:4;
      const axis=(a:number,z:number)=>[a,...Array.from({length:Math.max(0,Math.ceil(z/step)-Math.floor(a/step)-1)},(_,i)=>(Math.floor(a/step)+1+i)*step),z];
      const xs=axis(l,r),ys=axis(t,b),base:number[]=[],uv:number[]=[],indices:number[]=[],yaw:number[]=[];
      for(const y of ys)for(const x of xs){base.push(x,y);uv.push((x-l)/(r-l),(y-t)/(b-t));for(const a of [-18,-9,0,9,18])yaw.push(bakedHeadYaw(x,y,a));}
      for(let y=0;y<ys.length-1;y++)for(let x=0;x<xs.length-1;x++){const i=y*xs.length+x;indices.push(i,i+1,i+xs.length,i+1,i+xs.length+1,i+xs.length);}
      // Pixi 6's IArrayBuffer predates TS's typed-array buffer generics.
      type GeometryData=ConstructorParameters<typeof MeshGeometry>;
      const vertices=new Float32Array(base),geometry=new MeshGeometry(vertices as unknown as GeometryData[0],new Float32Array(uv) as unknown as GeometryData[1],new Uint16Array(indices) as unknown as GeometryData[2]);
      const mesh=new Mesh(geometry,new MeshMaterial(Texture.from(image)));mesh.shader.texture.baseTexture.mipmap=0;
      this.container.addChild(mesh);this.meshes.push({name:layer.name,mesh,vertices,base:new Float32Array(base),yaw:new Float32Array(yaw)});
    }
  }
  fit(x:number,y:number,scale:number){this.container.position.set(x,y);this.container.scale.set(scale);}
  update(p:XiaomaiPose,speaking:boolean){
    this.container.visible=!!p.volume;if(!p.volume)return;
    const a=Math.max(-18,Math.min(18,p.x*1.8)),k=Math.min(3,Math.floor((a+18)/9)),t=(a+18-k*9)/9;
    for(const layer of this.meshes){
      layer.mesh.visible=!(layer.name==='Mouth_Closed'&&(speaking||p.expressionOpen>.05));
      if(!layer.mesh.visible)continue;
      for(let i=0;i<layer.base.length;i+=2){
        const x=layer.base[i]!,y=layer.base[i+1]!,j=i/2*5+k;
        const q=xiaomaiPoint(x,y,p,layer.name,layer.yaw[j]!*(1-t)+layer.yaw[j+1]!*t);
        layer.vertices[i]=q[0];layer.vertices[i+1]=q[1];
      }
      layer.mesh.geometry.getBuffer('aVertexPosition').update();
    }
  }
  destroy(){this.disposed=true;this.container.destroy({children:true,texture:true,baseTexture:true});this.meshes=[];}
}
