import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { portNavigationPose, portLocationPose, portAnchorPoint, PORT_ENTRANCE, navigationPoint, type PortView } from "@edu/port-simulation-core";
import { createTerminalWorld } from "./terminal-3d-world";
export interface PortSceneHandle {
    focus: (id: string) => void;
    fit: (ids: string[]) => void;
    camera: (name: "overview" | "yard" | "sea") => void;
    project: (id: string) => { x: number; y: number; visible: boolean } | null;
}
export type PortDrag = {
    kind: "ship" | "batch" | "crane" | "crew" | "yard";
    id: string;
};
export const PORT_DRAG_MIME = "application/x-edu-port-object";
function tag(text: string, color = "#d5f6ef") {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 80;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#123d49e8";
    c.beginPath();
    c.roundRect(2, 2, 380, 76, 15);
    c.fill();
    c.font = '600 30px "Microsoft YaHei",sans-serif';
    c.fillStyle = color;
    c.textAlign = "center";
    c.fillText(text, 192, 50);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    sprite.scale.set(43, 9, 1);
    sprite.renderOrder = 8;
    return sprite;
}
const berthPosition = (i: number) => new THREE.Vector3(i ? 62 : -62, 0, -78);
const anchorPosition = (i: number) => new THREE.Vector3(i % 2 ? 72 : -72, 0, -177 - Math.floor(i / 2) * 59);
export const PortOperationsScene = forwardRef<PortSceneHandle, {
    view: PortView;
    selected: string;
    speed: number;
    followSelected?: boolean;
    floatingPanel?: boolean;
    highlightIds?: string[];
    onSelect: (id: string) => void;
    onContext: (id: string) => void;
    onDrop: (source: PortDrag, target: string) => void;
}>(function PortOperationsScene(props, ref) {
    const host = useRef<HTMLDivElement>(null), latest = useRef(props), runtime = useRef<{
        camera: THREE.PerspectiveCamera;
        controls: OrbitControls;
        positions: Map<string, THREE.Vector3>;
        visible: boolean;
    } | null>(null);
    const [status, setStatus] = useState("loading"), [retry, setRetry] = useState(0), following = useRef(true);
    latest.current = props;
    const construction = JSON.stringify({ ...props.view.plan.equipment, dispatch: undefined, schema: props.view.schema });
    const focusedPoint = (id: string) => {
        const r = runtime.current, v = latest.current.view;
        if (!r) return undefined;
        const ship = v.vessels.find(s => s.id === id);
        if (ship && ["approach", "departed"].includes(ship.call.stage)) return berthPosition(ship.call.plannedBerth ?? 0);
        if (ship && v.schema !== "port-operations/3.0" && !r.visible) {
            const c=ship.call, pose=c.move?.navigation ? portNavigationPose(c.move.navigation,v.second-c.move.start) : portLocationPose(c.berth!==null?`berth:${c.berth}`:c.anchor!==null?`anchor:${c.anchor}`:"outer",id);
            return new THREE.Vector3(pose.x,0,pose.z);
        }
        const batch = v.batches.find(b => b.id === id);
        return r.positions.get(batch ? batch.targetYard ?? batch.callId : id);
    };
    const focus = (id: string) => { const r = runtime.current, p = focusedPoint(id); if (!r || !p)
        return; following.current = true; r.controls.target.copy(p); r.camera.position.copy(p).add(new THREE.Vector3(85, 94, -108).multiplyScalar(Math.max(1, 1.1 / r.camera.aspect))); r.controls.update(); };
    useImperativeHandle(ref, () => ({ focus, fit(ids) {
        const r=runtime.current;if(!r)return;
        const points=ids.map(id=>r.positions.get(id)).filter((p):p is THREE.Vector3=>!!p);
        if(!points.length)return;
        const box=new THREE.Box3().setFromPoints(points).expandByScalar(65),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
        const distance=Math.max(size.x/Math.max(.25,r.camera.aspect),size.z)*1.5+130;
        following.current=false;r.controls.target.copy(center);r.camera.position.copy(center).add(new THREE.Vector3(.25,1,-.35).normalize().multiplyScalar(distance));r.controls.update();
    }, project(id) {
        const r = runtime.current, point = r?.positions.get(id), canvas = host.current?.querySelector("canvas");
            if (!r || !point || !canvas) return null;
            const ship = latest.current.view.vessels.find(v => v.id === id), box = latest.current.view.boxes.find(b => b.id === id);
            if (ship && ["approach", "departed"].includes(ship.call.stage) || box?.deliveredAt != null) return null;
            const p = point.clone().setY(point.y + 8).project(r.camera), rect = canvas.getBoundingClientRect();
            const x=rect.left+(p.x+1)*rect.width/2,y=rect.top+(1-p.y)*rect.height/2;
            return { x, y, visible: x>0 && x<window.innerWidth && y>0 && y<window.innerHeight && p.z >= -1 && p.z <= 1 && Math.abs(p.x) < .96 && Math.abs(p.y) < .96 };
        }, camera(name) { const r = runtime.current; if (!r)
            return; following.current = false; if(name === "sea" && latest.current.view.schema !== "port-operations/3.0") {r.controls.target.set(0,0,-750);r.camera.position.copy(r.controls.target).add(new THREE.Vector3(480,1600,-800).multiplyScalar(Math.max(1,1.1/r.camera.aspect)));r.controls.update();return;} const p = name === "yard" ? [135, 160, -10] : name === "sea" ? [160, 230, -330] : [198, 240, -290]; r.camera.position.set(p[0]!, p[1]!, p[2]!); r.controls.target.set(0, 0, name === "yard" ? 30 : name === "sea" ? -165 : -87); } }), []);
    useEffect(() => {
        const h = host.current!;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        }
        catch {
            setStatus("failed");
            return;
        }
        setStatus("loading");
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .9;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.shadowMap.autoUpdate = false;
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute("aria-label", "三维港区；点击定位对象，右键打开业务操作，拖拽安排目的位置");
        h.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#c6dfe2");
        scene.fog = new THREE.Fog("#c6dfe2", 2200, 13000);
        const camera = new THREE.PerspectiveCamera(43, 1, .5, 15000);
        camera.position.set(198, 240, -290);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, -87);
        controls.enableDamping = true;
        controls.addEventListener("start", () => { following.current = false; });
        controls.maxPolarAngle = Math.PI * .47;
        controls.minDistance = 40;
        controls.maxDistance = 12000;
        controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = new RoomEnvironment();
        const env = pmrem.fromScene(environment, .04);
        scene.environment = env.texture;
        environment.dispose();
        pmrem.dispose();
        scene.add(new THREE.HemisphereLight(0xe5f7ff, 0x789a90, .8));
        const sun = new THREE.DirectionalLight(0xffedcb, 2.1);
        sun.position.set(-180, 280, -130);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1536, 1536);
        sun.shadow.camera.left = -280;
        sun.shadow.camera.right = 280;
        sun.shadow.camera.top = 280;
        sun.shadow.camera.bottom = -280;
        sun.shadow.camera.far = 800;
        sun.shadow.bias = -.0005;
        scene.add(sun);
        const world = createTerminalWorld(latest.current.view.plan.equipment, { liveCargo: true });
        scene.add(world.root);
        world.ships.forEach(s => s.visible = false);
        world.labels.children.filter(c => c.userData.vesselIndex !== undefined).forEach(c => c.visible = false);
        world.lots.visible = false;
        world.people.forEach(p => p.visible = false);
        world.routes.visible = true;
        const positions = new Map<string, THREE.Vector3>();
        for (const [id, p] of world.facilityPositions)
            positions.set(/^y[1-6]$/.test(id) ? id.toUpperCase() : id, p);
        world.labels.children.filter(c => /^y[1-6]$/.test(c.userData.entityId ?? "")).forEach(c => c.visible = false);
        for (const yard of latest.current.view.yards) {
            const label = tag(`${yard.id} · ${yard.name}`);
            label.position.copy(positions.get(yard.id)!).add(new THREE.Vector3(0, 17, 0));
            label.userData.entityId = yard.id;
            world.root.add(label);
        }
        const modern=latest.current.view.schema!=="port-operations/3.0";
        const anchorAt=(i:number)=>{ const p=portAnchorPoint(i);return modern?new THREE.Vector3(p.x,0,p.z):anchorPosition(i); };
        if(modern) world.water.scale.set(12,12,1);
        const vesselModels = new Map<string, THREE.Group>(), vesselLabels = new Map<string, THREE.Sprite>();
        const marker = (id: string, p: THREE.Vector3, text: string, radius: number) => { const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 1, radius, 64), new THREE.MeshBasicMaterial({ color: 0x87ddd2, transparent: true, opacity: .7, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.copy(p).setY(-1.4); ring.userData.entityId = id; world.root.add(ring); const label = tag(text); label.position.copy(p).add(new THREE.Vector3(0, 2, 22)); label.userData.entityId = id; world.root.add(label); positions.set(id, p); };
        for (let i = 0; i < 4; i++)
            marker(`anchor:${i}`, anchorAt(i), `候泊锚位 ${i + 1}`, 25);
        for (let i = 0; i < 2; i++)
            marker(`berth:${i}`, berthPosition(i), `泊位 ${i ? "B · 大型船适配" : "A"}`, 17);
        const buoys = new THREE.Group();
        for (const x of modern ? [-500,-400] : [-116,116])
            for(let z=modern?-1200:-120;z>=(modern?-1450:-290);z-=28) {
                const buoy=new THREE.Mesh(new THREE.CylinderGeometry(modern?2:.6,modern?3:1,modern?7:3,6),new THREE.MeshStandardMaterial({color:x<(modern?-450:0)?0xcc7356:0x5fc8af}));
                buoy.position.set(x,0,z);buoys.add(buoy);
            }
        if(modern) {
            marker("entrance",new THREE.Vector3(PORT_ENTRANCE.x,0,PORT_ENTRANCE.z),"港口入口 · 航道",38);
            marker("turning",new THREE.Vector3(0,0,-370),"港内转向水域",200);
        }
        world.root.add(buoys);
        const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(7.4, 2.6, 3.1), new THREE.MeshStandardMaterial({ roughness: .65, metalness: .2 }), 10000);
        boxes.castShadow = true;
        boxes.receiveShadow = true;
        boxes.count = 0;
        boxes.frustumCulled = false;
        world.root.add(boxes);
        const dummy = new THREE.Object3D();
        const coachGeometry = new THREE.RingGeometry(17, 19, 48), coachMaterial = new THREE.MeshBasicMaterial({ color: 0xf4bb50, transparent: true, opacity: .85, side: THREE.DoubleSide, depthTest: false });
        const coachRings = Array.from({ length: 8 }, () => { const ring = new THREE.Mesh(coachGeometry, coachMaterial); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 10; ring.visible = false; world.root.add(ring); return ring; });
        const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
        const routeMaterial=new THREE.LineDashedMaterial({color:0x367bad,transparent:true,opacity:.85,dashSize:9,gapSize:7});
        const routeLine=new THREE.Line(new THREE.BufferGeometry(),routeMaterial);routeLine.position.y=.4;routeLine.userData.navigationGuide=true;world.root.add(routeLine);
        let routeKey="";
        const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
        const pick = (x: number, y: number) => { const rect = renderer.domElement.getBoundingClientRect(); pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1); ray.setFromCamera(pointer, camera); for (const hit of ray.intersectObject(world.root, true)) {
            let o: THREE.Object3D | null = hit.object, visible = true;
            while (o) {
                if (!o.visible)
                    visible = false;
                o = o.parent;
            }
            if (!visible)
                continue;
            let id = hit.instanceId !== undefined ? hit.object.userData.entityIds?.[hit.instanceId] : hit.object.userData.entityId;
            o = hit.object;
            while (!id && o) {
                id = o.userData.entityId;
                o = o.parent;
            }
            if (["entrance","turning"].includes(id)) continue;
            if (id && id !== "land" && !String(id).startsWith("lot:"))
                return /^y[1-6]$/.test(id) ? String(id).toUpperCase() : String(id);
        } return ""; };
        let down = { x: 0, y: 0, id: "" }, dragging = false;
        const pointerDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, id: pick(e.clientX, e.clientY) }; const box=latest.current.view.boxes.find(b=>b.id===down.id);const shipId=box?.location.startsWith("ship:")?box.location.slice(5):down.id; const ship = latest.current.view.vessels.find(v => v.id === shipId); dragging = e.button === 0 && !!ship && ["outer", "anchored"].includes(ship.call.stage); if (dragging) {
            renderer.domElement.setPointerCapture(e.pointerId);
            down.id=shipId;
            controls.enabled = false;
            renderer.domElement.style.cursor = "grabbing";
        } };
        const pointerUp = (e: PointerEvent) => {
            let id = pick(e.clientX, e.clientY);
            const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 7;
            if (dragging && moved) {
                // Empty destination rings have transparent centers; use the sea plane as a drop target.
                if (!/^(berth|anchor):/.test(id)) {
                    const hit = new THREE.Vector3();
                    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit);
                    const slots = [...positions].filter(([key]) => /^(berth|anchor):/.test(key)).sort((a, b) => a[1].distanceTo(hit) - b[1].distanceTo(hit));
                    if (slots[0] && slots[0][1].distanceTo(hit) < 55)
                        id = slots[0][0];
                }
                latest.current.onDrop({ kind: "ship", id: down.id }, id);
            }
            else if (e.button === 0 && !moved && id)
                latest.current.onSelect(id);
            if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
            dragging = false;
            controls.enabled = true;
            renderer.domElement.style.cursor = "";
        };
        const context = (e: MouseEvent) => { e.preventDefault(); const id = pick(e.clientX, e.clientY); if (id)
            latest.current.onContext(id); };
        const dragOver = (e: DragEvent) => { if (e.dataTransfer?.types.includes(PORT_DRAG_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
        } };
        const drop = (e: DragEvent) => { e.preventDefault(); const id = pick(e.clientX, e.clientY); try {
            const source = JSON.parse(e.dataTransfer?.getData(PORT_DRAG_MIME) ?? "") as PortDrag;
            if (id)
                latest.current.onDrop(source, id);
        }
        catch { /* External drags have no business command. */ } };
        const key = (e: KeyboardEvent) => { if (e.key === "Enter" && latest.current.selected)
            latest.current.onContext(latest.current.selected); };
        const lost = (e: Event) => { e.preventDefault(); setStatus("failed"); renderer.setAnimationLoop(null); };
        renderer.domElement.addEventListener("pointerdown", pointerDown);
        renderer.domElement.addEventListener("pointerup", pointerUp);
        renderer.domElement.addEventListener("contextmenu", context);
        renderer.domElement.addEventListener("dragover", dragOver);
        renderer.domElement.addEventListener("drop", drop);
        renderer.domElement.addEventListener("keydown", key);
        renderer.domElement.addEventListener("webglcontextlost", lost);
        let previousFit = 1;
        const resize = () => { const { width, height } = h.getBoundingClientRect(); if (!width || !height)
            return; renderer.setSize(width, height); camera.aspect = width / height; const fit = Math.max(1, 1.1 / camera.aspect); camera.position.sub(controls.target).multiplyScalar(fit / previousFit).add(controls.target); previousFit = fit; camera.updateProjectionMatrix(); };
        const observer = new ResizeObserver(resize);
        observer.observe(h);
        let sceneVisible = true;
        const visibilityObserver = new IntersectionObserver(entries => { sceneVisible = entries[0]?.isIntersecting ?? true; if(!sceneVisible && runtime.current) runtime.current.visible=false; });
        visibilityObserver.observe(h);
        resize();
        runtime.current = { camera, controls, positions, visible: sceneVisible };
        let lastView: PortView | null = null, anchorTime = performance.now(), frame = 0, shadow = -Infinity, lastInset = -1;
        const vesselHeading=(id:string,clock:number)=>{const c=latest.current.view.vessels.find(v=>v.id===id)!.call;return c.move?.navigation?portNavigationPose(c.move.navigation,clock-c.move.start).heading:0;};
        const vesselPoint = (id: string, clock: number) => { const v = latest.current.view.vessels.find(v => v.id === id)!; const c = v.call;
        if(c.move?.navigation){const pose=portNavigationPose(c.move.navigation,clock-c.move.start);return new THREE.Vector3(pose.x,0,pose.z);}
        if(modern&&!c.move){const pose=portLocationPose(c.berth!==null?`berth:${c.berth}`:c.anchor!==null?`anchor:${c.anchor}`:"outer",id);return new THREE.Vector3(pose.x,0,pose.z);}
        if (c.move) {
            const at = (location: string) => location.startsWith("berth:") ? berthPosition(Number(location.slice(6))) : location.startsWith("anchor:") ? anchorPosition(Number(location.slice(7))) : new THREE.Vector3(-170, 0, -320);
            const a = at(c.move.from), b = at(c.move.to);
            return a.lerp(b, THREE.MathUtils.clamp((clock - c.move.start) / (c.move.end - c.move.start), 0, 1));
        } if (c.berth !== null)
            return berthPosition(c.berth); if (c.anchor !== null)
            return anchorPosition(c.anchor); const outer = latest.current.view.vessels.filter(v => v.call.stage === "outer").findIndex(v => v.id === id); return new THREE.Vector3(-185, 0, -135 - Math.max(0, outer) * 38); };
        const point = (location: string, index = 0, clock = 0) => { const [kind, id] = location.split(":"); if (kind === "ship")
            return vesselPoint(id!, clock).add(new THREE.Vector3(-24 + index % 8 * 8, 6 + Math.floor(index / 32) * 2.8, -5.1 + Math.floor(index % 32 / 8) * 3.4).applyAxisAngle(new THREE.Vector3(0,1,0),-vesselHeading(id!,clock))); if (["yard", "handoff", "pickup"].includes(kind!)) {
            const p = positions.get(id!)?.clone() ?? new THREE.Vector3();
            return p.add(new THREE.Vector3(-8 + index % 3 * 8.2, 2.3 + Math.floor(index / 15) * 2.8, -8 + Math.floor(index % 15 / 3) * 3.4));
        } if (kind === "quay" || kind === "loading") {
            const c = latest.current.view.vessels.find(v => v.id === id)?.call;
            return new THREE.Vector3((c?.berth ? 62 : -62) - 25 + index % 7 * 8, 2.4 + Math.floor(index / 21) * 2.8, (kind === "loading" ? -35 : -28) + Math.floor(index % 21 / 7) * 3.4);
        } return new THREE.Vector3((location === "gate:in" ? 45 : -28) + index % 4 * 8, 2.4 + Math.floor(index / 16) * 2.8, 80 + Math.floor(index % 16 / 4) * 3.5); };
        renderer.setAnimationLoop(now => {
            if (document.hidden || !sceneVisible || now - frame < 33)
                return;
            frame = now;
            if (now - shadow > 750) {
                renderer.shadowMap.needsUpdate = true;
                shadow = now;
            }
            const p = latest.current, v = p.view;
            const inset = p.floatingPanel && camera.aspect < 1 ? .26 : 0;
            if (inset !== lastInset) {
                // Move the visible center above the narrow-screen operation drawer.
                if (inset) camera.setViewOffset(1000 * camera.aspect, 1000, 0, 1000 * inset, 1000 * camera.aspect, 1000);
                else camera.clearViewOffset();
                lastInset = inset;
            }
            if (v !== lastView) {
                anchorTime = now;
                lastView = v;
            }
            const clock = v.second + (v.status === "running" ? Math.min(30, (now - anchorTime) / 1000 * (v.mode === "battle" ? 60 : p.speed)) : 0);
            world.water.material.uniforms.time!.value = clock / 60;
            for (const ship of v.vessels) {
                if (!vesselModels.has(ship.id)) {
                    const g = world.ships[ship.large ? 1 : 0]!.clone(true);
                    g.traverse(o => { o.userData = { ...o.userData, entityId: ship.id }; if (o.userData.entityIds)
                        o.userData.entityIds = o.userData.entityIds.map(() => ship.id); });
                    world.root.add(g);
                    vesselModels.set(ship.id, g);
                    const label = tag(`${ship.id} · ${ship.large ? "大型船" : "普通船"}`);
                    label.userData.entityId=ship.id;
                    world.root.add(label);
                    vesselLabels.set(ship.id, label);
                }
                const model = vesselModels.get(ship.id)!, label = vesselLabels.get(ship.id)!;
                model.visible = !["approach", "departed"].includes(ship.call.stage);
                label.visible = model.visible;
                model.position.copy(vesselPoint(ship.id, clock));
                model.rotation.y=-vesselHeading(ship.id,clock);
                label.position.copy(model.position).add(new THREE.Vector3(0, 24, 0));
                positions.set(ship.id, model.position.clone());
            }
            for (const [id, model] of vesselModels)
                if (!v.vessels.some(v => v.id === id)) {
                    model.visible = false;
                    vesselLabels.get(id)!.visible = false;
                }
            if(runtime.current)runtime.current.visible=true;
            const byLocation = new Map<string, number>(), ids: string[] = [];
            let count = 0;
            const moving = new Map(v.jobs.map(j => [j.boxId, j]));
            world.vehicles.forEach((truck, i) => { truck.position.set(-115 + i % 2 * 6, 0, 35 + Math.floor(i / 2) * 9); });
            for (const box of v.boxes) {
                const b = v.batches.find(b => b.id === box.batchId)!;
                const call = v.vessels.find(v => v.id === b.callId)!.call;
                if (!box.available || box.deliveredAt !== null || box.location === "external" || box.location.startsWith("ship:") && ["approach", "departed"].includes(call.stage))
                    continue;
                const n = byLocation.get(box.location) ?? 0;
                byLocation.set(box.location, n + 1);
                const pos = point(box.location, n, clock);
                const j = moving.get(box.id);
                if (j) {
                    const t = THREE.MathUtils.clamp(1 - j.remaining + (clock - j.updatedAt) * j.rate, 0, 1), to = point(j.to, 0, clock);
                    if (j.kind === "truck") {
                        const from = point(j.from, 0, clock), via = new THREE.Vector3(to.x, from.y, from.z);
                        const first = from.distanceTo(via), second = via.distanceTo(to), d = t * (first + second);
                        pos.copy(d < first ? from.lerp(via, first ? d / first : 1) : via.lerp(to, second ? (d - first) / second : 1));
                        const truck = world.vehicles[j.resource];
                        if (truck) {
                            truck.position.copy(pos).setY(0);
                            truck.rotation.y = d < first ? Math.PI / 2 : 0;
                        }
                        pos.y = 4.2;
                    }
                    else {
                        pos.lerp(to, t);
                        pos.y += Math.sin(t * Math.PI) * (j.kind === "quay" ? 22 : 8);
                    }
                }
                dummy.rotation.y=box.location.startsWith("ship:")&&!j?-vesselHeading(b.callId,clock):0;
                dummy.position.copy(pos);
                dummy.updateMatrix();
                boxes.setMatrixAt(count, dummy.matrix);
                boxes.setColorAt(count, new THREE.Color(["open", "reported"].includes(box.issue) ? "#e99d45" : b.flow === "import" ? "#44868b" : "#b8644f"));
                ids.push(box.id);
                positions.set(box.id, pos);
                count++;
            }
            boxes.count = count;
            boxes.userData.entityIds = ids;
            boxes.instanceMatrix.needsUpdate = true;
            if (boxes.instanceColor)
                boxes.instanceColor.needsUpdate = true;
            world.cranes.forEach(({ body, trolley, index, homeX }) => { const berth = index < v.plan.equipment.dispatch.berthCranes[0] ? 0 : 1, local = berth ? index - v.plan.equipment.dispatch.berthCranes[0] : index, num = v.plan.equipment.dispatch.berthCranes[berth]; const x = local < num ? (berth ? 62 : -62) + (local - (num - 1) / 2) * 19 : -120; body.position.x = x - homeX; const j = v.jobs.find(j => j.kind === "quay" && j.resource === index); const t = j ? THREE.MathUtils.clamp(1 - j.remaining + (clock - j.updatedAt) * j.rate, 0, 1) : 0; trolley.position.set(homeX, 27 + Math.sin(t * Math.PI) * 3, -68 + t * 35); positions.set(`crane-${index}`, new THREE.Vector3(x, 0, -40)); });
            const d = v.plan.equipment.dispatch, total = d.craneOperators + d.drivers + d.yardOperators + d.gateClerks + d.technicians;
            world.people.forEach((person, i) => person.visible = i < total);
            const selected = focusedPoint(p.selected);
            const activeShip=v.vessels.find(s=>s.id===p.selected),move=activeShip?.call.move;
            const nextRoute=move?.navigation?`${activeShip!.id}:${move.start}:${move.end}`:"";
            if(nextRoute!==routeKey){routeKey=nextRoute;routeLine.geometry.dispose();const vertices:THREE.Vector3[]=[];
                if(move?.navigation) for(const segment of move.navigation.segments) {const count=Math.max(1,Math.ceil(segment.length/8));for(let i=0;i<=count;i++){const q=navigationPoint(segment,i/count);vertices.push(new THREE.Vector3(q.x,0,q.z));}}
                routeLine.geometry=new THREE.BufferGeometry().setFromPoints(vertices);routeLine.computeLineDistances();routeLine.visible=!!vertices.length;
            }
            const breath=reducedMotion.matches?1:.65+.35*(.5+.5*Math.sin(now/3000*Math.PI*2));
            coachMaterial.opacity=breath;coachRings.forEach(r=>r.scale.setScalar(1+(breath-.65)*.16));
            coachRings.forEach((ring, i) => { const id = p.highlightIds?.[i], ship = v.vessels.find(s => s.id === id), point = id ? positions.get(id) ?? focusedPoint(id) : undefined; ring.visible = !!point && !(ship && ["approach", "departed"].includes(ship.call.stage)); if (point) ring.position.copy(point).setY(1.4); });
            world.selection.visible = !!selected;
            if (selected)
                world.selection.position.copy(selected).setY(1);
            if (p.followSelected && following.current) {
                const target = focusedPoint(p.selected);
                if (target) {
                    const shift = target.clone().sub(controls.target).multiplyScalar(.22);
                    camera.position.add(shift);
                    controls.target.add(shift);
                }
            }
            controls.update();
            renderer.render(scene, camera);
        });
        setStatus("ready");
        return () => { renderer.setAnimationLoop(null); observer.disconnect(); visibilityObserver.disconnect(); controls.dispose(); renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp); renderer.domElement.removeEventListener("contextmenu", context); renderer.domElement.removeEventListener("dragover", dragOver); renderer.domElement.removeEventListener("drop", drop); renderer.domElement.removeEventListener("keydown", key); renderer.domElement.removeEventListener("webglcontextlost", lost); world.dispose(); env.dispose(); sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); runtime.current = null; };
    }, [construction, retry]);
    return <div ref={host} className="port-ops-scene" data-renderer={status}>{status !== "ready" && <div className="port-scene-state">{status === "loading" ? "正在构建三维港区…" : <><p>三维画面暂不可用，业务操作与记录仍可使用。</p><button onClick={() => setRetry(n => n + 1)}>恢复 3D</button></>}</div>}</div>;
});
