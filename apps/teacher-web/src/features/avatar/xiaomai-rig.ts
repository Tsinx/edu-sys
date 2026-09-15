import type { Cubism4InternalModel } from "pixi-live2d-display/cubism4";
import { neutralXiaomaiPose, xiaomaiPoint, type XiaomaiPose } from "./xiaomai-motion";

/** Subdivide the original Cubism quads, retaining its atlas, draw order and renderer.
 * This application rig is deliberately separate from the three-keyform .moc3 file.
 */
export class XiaomaiRig {
  private pose=neutralXiaomaiPose();
  private restore:()=>void;
  constructor(internal:Cubism4InternalModel) {
    const core=internal.coreModel;
    const unit=internal.pixelsPerUnit;
    const names=core.getModel().drawables.ids;
    const originals={
      getDrawableVertices:core.getDrawableVertices,
      getDrawableVertexCount:core.getDrawableVertexCount,
      getDrawableVertexIndexCount:core.getDrawableVertexIndexCount,
      getDrawableVertexIndices:core.getDrawableVertexIndices,
      getDrawableVertexUvs:core.getDrawableVertexUvs,
      getDrawableOpacity:core.getDrawableOpacity
    };
    const meshes=Array.from(names,(id,index)=>{
      const vertices=core.getDrawableVertices(index),uv=core.getDrawableVertexUvs(index),indices=core.getDrawableVertexIndices(index);
      const base:number[]=[],tex:number[]=[],tris:number[]=[];
      const n=id==="occlusion_underpainting"?32:/^(face_layer|hair_|neck_layer)/.test(id)?24:8;
      for(let t=0;t<indices.length;t+=3){
        const rows:number[][]=[];
        for(let r=0;r<=n;r++){
          const row:number[]=[];rows.push(row);
          for(let c=0;c<=n-r;c++){
            row.push(base.length/2);
            const weights=[1-(r+c)/n,c/n,r/n];
            for(let axis=0;axis<2;axis++){
              base.push(weights.reduce((v,w,k)=>v+w*vertices[indices[t+k]!*2+axis]!,0));
              tex.push(weights.reduce((v,w,k)=>v+w*uv[indices[t+k]!*2+axis]!,0));
            }
          }
        }
        for(let r=0;r<n;r++)for(let c=0;c<n-r;c++){
          tris.push(rows[r]![c]!,rows[r]![c+1]!,rows[r+1]![c]!);
          if(c<n-r-1)tris.push(rows[r]![c+1]!,rows[r+1]![c+1]!,rows[r+1]![c]!);
        }
      }
      // Half-pixel overlap seals antialiased cut edges between adjacent painted layers.
      const xs=Array.from(vertices).filter((_,i)=>i%2===0),ys=Array.from(vertices).filter((_,i)=>i%2===1);
      const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
      const sx=1+1.5/(unit*(Math.max(...xs)-Math.min(...xs))),sy=1+1.5/(unit*(Math.max(...ys)-Math.min(...ys)));
      if(id!=="occlusion_underpainting" && !id.startsWith("Eye") && !id.startsWith("brow_"))for(let i=0;i<base.length;i+=2){base[i]=cx+(base[i]!-cx)*sx;base[i+1]=cy+(base[i+1]!-cy)*sy;}
      return {id,base:new Float32Array(base),vertices:new Float32Array(base),uv:new Float32Array(tex),indices:new Uint16Array(tris)};
    });
    core.getDrawableVertices=i=>meshes[i]!.vertices;
    core.getDrawableVertexCount=i=>meshes[i]!.vertices.length/2;
    core.getDrawableVertexIndexCount=i=>meshes[i]!.indices.length;
    core.getDrawableVertexIndices=i=>meshes[i]!.indices;
    core.getDrawableVertexUvs=i=>meshes[i]!.uv;
    core.getDrawableOpacity=i=>/^Eye[LR]_(Open|Closed|Frame)$/.test(names[i]!)?0:originals.getDrawableOpacity.call(core,i);
    this.restore=()=>Object.assign(core,originals);
    this.update=(pose:XiaomaiPose)=>{
      this.pose=pose;
      for(const mesh of meshes){
        for(let i=0;i<mesh.base.length;i+=2){
          const x=mesh.base[i]!*unit+internal.originalWidth/2,y=-mesh.base[i+1]!*unit+internal.originalHeight/2;
          const [nx,ny]=xiaomaiPoint(x,y,this.pose,mesh.id);
          mesh.vertices[i]=(nx-internal.originalWidth/2)/unit;mesh.vertices[i+1]=-(ny-internal.originalHeight/2)/unit;
        }
      }
    };
  }
  update(_pose:XiaomaiPose) {}
  destroy(){this.restore();}
}
