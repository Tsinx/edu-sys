"""Blender 5.1: editable frontal head proxy and baked yaw keyforms.

Run: blender --background --python scripts/build-xiaomai-head-proxy.py
The original painting is projected without relighting. This is a shallow head
surface for small turns, not a reconstructed full head or a native Cubism rig.
"""
import bpy
import math
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/avatar/xiaomai/head-proxy-v1'
OUT.mkdir(parents=True, exist_ok=True)
BAKE = ROOT / 'apps/teacher-web/src/features/avatar/xiaomai-head-bake.json'

def smooth(t):
    t = min(1, max(0, t))
    return t*t*(3-2*t)

def depth(x, y):
    # A continuous skull/cheek surface. Anatomical relief adds the nose and chin.
    dx = x-512
    skull = 106 * math.sqrt(max(.015, 1-(dx/212)**2-((y-245)/320)**2))
    face = 27*math.exp(-((x-512)/100)**4-((y-315)/115)**4)
    nose = 23*math.exp(-((x-507)/18)**2-((y-330)/36)**2)
    z = skull+face+nose
    # Tangent patches preserve the original independently animated eyes/lips.
    # Their borders and adjacent skin use the identical surface, avoiding seams.
    for l,t,r,b,cx,cy,zc,slope in [
        (389,230,494,315,448,280,124,.32),
        (524,218,617,303,563,268,125,-.29),
        (466,351,562,407,514,378,123,-.025),
    ]:
        wx=smooth((x-l+36)/36)*smooth((r+36-x)/36)
        wy=smooth((y-t+36)/36)*smooth((b+36-y)/36)
        z=z*(1-wx*wy)+(zc+slope*(x-cx))*(wx*wy)
    return z

def weight(y):
    return (1-math.cos(math.pi*(1-min(1,max(0,(y-420)/140)))))/2

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=4
scene.render.resolution_x=1024
scene.render.resolution_y=760
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'

# Full canvas surface; a regular 4 px grid gives exact correspondence with bake.
step=4
cols=1024//step+1
rows=760//step+1
vertices=[(x, -depth(x,y)*weight(y), 760-y) for y in range(0,761,step) for x in range(0,1025,step)]
faces=[]
for j in range(rows-1):
    for i in range(cols-1):
        a=j*cols+i
        faces.append((a,a+1,a+cols+1,a+cols))
mesh=bpy.data.meshes.new('Paint correspondence grid 4px')
mesh.from_pydata(vertices,[],faces)
mesh.update()
obj=bpy.data.objects.new('Xiaomai frontal head proxy',mesh)
scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj
obj.select_set(True)
uv=mesh.uv_layers.new(name='Original painting coordinates')
for poly in mesh.polygons:
    for li in poly.loop_indices:
        v=mesh.vertices[mesh.loops[li].vertex_index].co
        uv.data[li].uv=(v.x/1024,v.z/760)

mat=bpy.data.materials.new('Original painting - unlit, alpha preserved')
mat.use_nodes=True
nodes=mat.node_tree.nodes
nodes.clear()
texture=nodes.new('ShaderNodeTexImage')
texture.image=bpy.data.images.load(str(ROOT/'artifacts/avatar/xiaomai/layered-a-v2/xiaomai-a-transparent.png'))
texture.image.pack()
emission=nodes.new('ShaderNodeEmission')
transparent=nodes.new('ShaderNodeBsdfTransparent')
mix=nodes.new('ShaderNodeMixShader')
output=nodes.new('ShaderNodeOutputMaterial')
links=mat.node_tree.links
links.new(texture.outputs['Color'],emission.inputs['Color'])
links.new(texture.outputs['Alpha'],mix.inputs[0])
links.new(transparent.outputs[0],mix.inputs[1])
links.new(emission.outputs[0],mix.inputs[2])
links.new(mix.outputs[0],output.inputs['Surface'])
obj.data.materials.append(mat)
obj.shape_key_add(name='Basis - original front')

angles=[-18,-9,0,9,18]
grid_x,grid_y,nx,ny=256,0,125,141
keyforms=[]
for angle in angles:
    a=math.radians(angle)
    key=obj.shape_key_add(name=f'Yaw {angle:+d}')
    for v,k in zip(vertices,key.data):
        x,negz,h=v
        y=760-h
        w=weight(y)
        z=depth(x,y)-35
        k.co.x=x+((x-512)*(math.cos(a)-1)+z*math.sin(a))*w
        k.co.y=negz+((x-512)*math.sin(a)+z*(1-math.cos(a)))*w
        k.co.z=h
    delta=[]
    for j in range(ny):
        for i in range(nx):
            index=(j+grid_y//step)*cols+i+grid_x//step
            delta.append(round((key.data[index].co.x-vertices[index][0])*1000))
    keyforms.append(delta)

bake={'version':1,'generator':'Blender 5.1 shape keys','angles':angles,'x':grid_x,'y':grid_y,'step':step,'cols':nx,'rows':ny,'quantization':1000,'dx':keyforms}
BAKE.write_text(json.dumps(bake,separators=(',',':')),encoding='utf8')

camera_data=bpy.data.cameras.new('Orthographic original-art camera')
camera=bpy.data.objects.new('Camera',camera_data)
scene.collection.objects.link(camera)
camera.location=(512,-1800,380)
camera.rotation_euler=(math.pi/2,0,0)
camera_data.type='ORTHO'
camera_data.clip_end=5000
camera_data.ortho_scale=1024
scene.camera=camera
scene.world.color=(1,1,1)
obj['scope']='Frontal curved proxy; small yaw only. No unseen back head reconstruction.'
obj['runtime']='Baked 2D keyform displacements; no Blender or 3D renderer needed in classroom.'
obj['yaw_degrees']=18.0
# A reproducible turntable in the editable file.
for frame,angle in [(1,0),(31,-18),(61,0),(91,18),(121,0)]:
    for key in obj.data.shape_keys.key_blocks[1:]:
        key.value=1 if key.name==f'Yaw {angle:+d}' else 0
        key.keyframe_insert(data_path='value',frame=frame)
scene.frame_start=1
scene.frame_end=121
scene.render.fps=30
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Xiaomai_head_proxy.blend'))
for frame,label in [(1,'front'),(31,'left'),(91,'right')]:
    scene.frame_set(frame)
    scene.render.filepath=str(OUT/f'{label}.png')
    bpy.ops.render.render(write_still=True)
print(json.dumps({'blend':str(OUT/'Xiaomai_head_proxy.blend'),'bake':str(BAKE),'vertices':len(vertices),'keys':angles}))
