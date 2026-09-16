import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createSceneGesture } from "./scene-gesture";
import { TERMINAL_SCENARIOS, terminalLiveRates, terminalMetrics, terminalVesselProgress, type TerminalState } from "@edu/port-simulation-core";
import { createTerminalWorld, sampleTerminalPath, TERMINAL_CAMERAS, type TerminalCamera, type TerminalWorld } from "./terminal-3d-world";

export interface TerminalSceneHandle { camera: (preset: TerminalCamera) => void; focus: (id: string) => void; zoom: (direction: number) => void }
interface Props {
  state: TerminalState; playing: boolean; speed: number; selected: string;
  labels: boolean; routes: boolean; planning: boolean; quality: "balanced" | "high";
  onSelect: (id: string) => void;
}
export const TerminalScene3D = forwardRef<TerminalSceneHandle, Props>(function TerminalScene3D(props, ref) {
  const hostRef = useRef<HTMLDivElement>(null); const latest = useRef(props); latest.current = props;
  const runtime = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; world: TerminalWorld; renderer: THREE.WebGLRenderer; goal?: { position: THREE.Vector3; target: THREE.Vector3 } } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading"); const [attempt, setAttempt] = useState(0);
  // Dispatch and simulation ticks update the projection without reconstructing the world.
  const { dispatch: _dispatch, ...construction } = props.state.setup;
  const constructionKey = JSON.stringify(construction);
  useImperativeHandle(ref, () => ({
    camera(preset) {
      const r = runtime.current; if (!r) return;
      const view = TERMINAL_CAMERAS[preset];
      const target = new THREE.Vector3(...view.target);
      r.goal = { position: new THREE.Vector3(...view.position).sub(target).multiplyScalar(Math.max(1, 1.25 / r.camera.aspect)).add(target), target };
    },
    focus(id) {
      const r = runtime.current; if (!r) return;
      const target = r.world.facilityPositions.get(id); if (!target) return;
      r.goal = { target: target.clone(), position: target.clone().add(new THREE.Vector3(58, 62, -68)) };
    },
    zoom(direction) {
      const r = runtime.current; if (!r) return;
      const offset = r.camera.position.clone().sub(r.controls.target).multiplyScalar(direction > 0 ? 0.8 : 1.25);
      offset.clampLength(r.controls.minDistance, r.controls.maxDistance); r.goal = { target: r.controls.target.clone(), position: r.controls.target.clone().add(offset) };
    }
  }), []);
  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    setStatus("loading");
    let renderer: THREE.WebGLRenderer;
    // Retain the last frame for classroom capture and when offscreen rendering is suspended.
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" }); }
    catch { setStatus("failed"); return; }
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#769da9"); scene.fog = new THREE.Fog("#769da9", 440, 1200);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, props.quality === "high" ? 1.6 : 1.15));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = props.quality === "high";
    const environment = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer); const envMap = pmrem.fromScene(environment, 0.04);
    scene.environment = envMap.texture; scene.environmentIntensity = 0.28; environment.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight("#c4dfed", "#627676", 1.6));
    const sun = new THREE.DirectionalLight("#ffedca", 2.5); sun.position.set(-90, 170, -80); sun.castShadow = true;
    sun.shadow.mapSize.setScalar(props.quality === "high" ? 2048 : 1024); sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 160; sun.shadow.camera.bottom = -160; sun.shadow.camera.near = 10; sun.shadow.camera.far = 440;
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.2; scene.add(sun);
    const initialView = latest.current.planning ? TERMINAL_CAMERAS.plan : TERMINAL_CAMERAS.overview;
    const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1800); camera.position.set(...initialView.position as [number, number, number]);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 13);
    controls.target.set(...initialView.target as [number, number, number]); controls.enableDamping = true; controls.dampingFactor = 0.1; controls.minDistance = 28; controls.maxDistance = 900;
    controls.maxPolarAngle = Math.PI / 2.15; controls.minPolarAngle = 0; controls.screenSpacePanning = true; controls.update();
    controls.touches.ONE = THREE.TOUCH.ROTATE; controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    const world = createTerminalWorld(latest.current.state.setup); scene.add(world.root);
    const r = { camera, controls, world, renderer, goal: undefined as { position: THREE.Vector3; target: THREE.Vector3 } | undefined }; runtime.current = r;
    renderer.domElement.setAttribute("aria-label", "三维港区，可拖动旋转、滚轮缩放、点击设施；也可使用视角按钮和设施列表操作");
    renderer.domElement.setAttribute("role", "img"); renderer.domElement.tabIndex = 0; host.appendChild(renderer.domElement);
    let previousFit = 1;
    const resize = () => { const rect = host.getBoundingClientRect(); if (rect.width && rect.height) {
      renderer.setSize(rect.width, rect.height); camera.aspect = rect.width / rect.height;
      const fit = Math.max(1, 1.25 / camera.aspect); camera.position.sub(controls.target).multiplyScalar(fit / previousFit).add(controls.target);
      if (r.goal) r.goal.position.sub(r.goal.target).multiplyScalar(fit / previousFit).add(r.goal.target);
      previousFit = fit;
      camera.updateProjectionMatrix();
    } };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const pointer = new THREE.Vector2(); const raycaster = new THREE.Raycaster(); const gesture = createSceneGesture();
    const pointerDown = (event: PointerEvent) => { gesture.down(event); r.goal = undefined; };
    const pointerMove = (event: PointerEvent) => gesture.move(event);
    const pointerCancel = (event: PointerEvent) => gesture.cancel(event);
    const pointerUp = (event: PointerEvent) => {
      if (!gesture.up(event)) return;
      const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObject(world.root, true)) {
        if (!hit.object.visible || (world.lots.children.includes(hit.object) && !latest.current.planning)) continue;
        let id = hit.instanceId !== undefined ? hit.object.userData.entityIds?.[hit.instanceId] : hit.object.userData.entityId;
        let parent = hit.object.parent; while (!id && parent) { id = parent.userData.entityId; parent = parent.parent; }
        if (id && id !== "land" && (!String(id).startsWith("lot:") || latest.current.planning)) { latest.current.onSelect(id); break; }
      }
    };
    const keyDown = (event: KeyboardEvent) => {
      const keys: Record<string, [number, number]> = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
      if (keys[event.key]) { event.preventDefault(); r.goal = undefined; const [x, z] = keys[event.key]!; camera.position.add(new THREE.Vector3(x, 0, z)); controls.target.add(new THREE.Vector3(x, 0, z)); }
    };
    const lost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); setStatus("failed"); };
    renderer.domElement.addEventListener("pointerdown", pointerDown); renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointermove", pointerMove); renderer.domElement.addEventListener("pointercancel", pointerCancel);
    renderer.domElement.addEventListener("lostpointercapture", pointerCancel);
    renderer.domElement.addEventListener("keydown", keyDown); renderer.domElement.addEventListener("webglcontextlost", lost);
    let minuteAnchor = performance.now(); let lastMinute = latest.current.state.minute; let lastPlaying = latest.current.playing;
    let visible = true; let previousFrame = 0; let lastShadow = -Infinity;
    const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; }); intersection.observe(host);
    renderer.setAnimationLoop(now => {
      if (!visible || document.hidden || now - previousFrame < (props.quality === "high" ? 16 : 30)) return;
      previousFrame = now;
      if (now - lastShadow > 500) { renderer.shadowMap.needsUpdate = true; lastShadow = now; }
      const p = latest.current; const state = p.state;
      if (state.minute !== lastMinute || p.playing !== lastPlaying) { minuteAnchor = now; lastMinute = state.minute; lastPlaying = p.playing; }
      const clock = state.minute + (p.playing ? Math.min(1, (now - minuteAnchor) / 1000 * p.speed) / 60 : 0);
      const m = terminalMetrics(state.setup, state.minute, state.repairWork); const live = terminalLiveRates(state);
      const projectionHours = (clock - state.minute) / 60;
      world.labels.visible = p.labels; world.routes.visible = p.routes; world.lots.visible = p.planning;
      world.water.material.uniforms.time!.value = clock;
      const target = world.facilityPositions.get(p.selected);
      world.selection.visible = Boolean(target); if (target) world.selection.position.set(target.x, 1, target.z);
      world.ships.forEach((ship, i) => {
        const progress = terminalVesselProgress(state, i as 0 | 1, clock * 60);
        ship.position.z = -70 - (1 - progress) * (i === 0 ? 24 : 44);
        ship.position.x = (i === 0 ? -62 : 62) - (1 - progress) * 12;
        const remaining = 1 - state.unloaded[i as 0 | 1] / TERMINAL_SCENARIOS[state.setup.scenario].cargo[i as 0 | 1];
        ship.getObjectByName("vessel-cargo")?.children.forEach(mesh => { (mesh as THREE.InstancedMesh).count = Math.ceil(mesh.userData.fullCount * Math.max(0, remaining)); });
        world.facilityPositions.get(i === 0 ? "vessel-a" : "vessel-b")?.copy(ship.position);
        world.labels.children.filter(child => child.userData.vesselIndex === i).forEach(child => child.position.copy(ship.position).add(new THREE.Vector3(0, 22, 0)));
      });
      world.cranes.forEach(({ body, trolley, index, homeX }) => {
        const berth = index < state.setup.dispatch.berthCranes[0] ? 0 : 1;
        const assigned = state.setup.dispatch.berthCranes[berth];
        const localIndex = berth === 0 ? index : index - state.setup.dispatch.berthCranes[0];
        const inService = localIndex < assigned;
        const x = inService ? (berth === 0 ? -62 : 62) + (localIndex - (assigned - 1) / 2) * Math.min(20, 80 / Math.max(1, assigned)) : -119 + (index - state.setup.dispatch.berthCranes[0] - state.setup.dispatch.berthCranes[1]) * 12;
        body.position.x = x - homeX;
        world.facilityPositions.get(`crane-${index}`)?.set(x, 0, -39);
        const work = state.engine === "legacy" ? state.unloaded[berth] / Math.max(1, assigned) : state.equipmentWork.cranes[index]!;
        // Position is a projection of completed work, so stop/resume never teleports to a home pose.
        const phase = (Math.sin((work + (inService ? live[berth] * projectionHours / Math.max(1, assigned) : 0)) * Math.PI * 2 + index) + 1) / 2;
        trolley.position.set(homeX, 27 + Math.sin(phase * Math.PI) * 3, -68 + phase * 35);
      });
      world.vehicles.forEach((vehicle, i) => {
        const work = state.engine === "legacy" ? (state.unloaded[0] + state.unloaded[1] - state.queues[0]) / Math.max(1, state.setup.vehicles) : state.equipmentWork.vehicles[i]!;
        const projected = i < m.activeVehicles ? live[2] * projectionHours / Math.max(1, m.activeVehicles) : 0;
        const frame = sampleTerminalPath(world.vehiclePaths[i]!, work + projected + i / Math.max(1, state.setup.vehicles));
        vehicle.position.copy(frame.position); vehicle.rotation.y = frame.rotation;
      });
      world.people.forEach((person, i) => { person.visible = i < m.personnel; person.position.x = -117 + i * 9 + Math.sin(clock / 5 + i) * 1.5; });
      if (r.goal) {
        camera.position.lerp(r.goal.position, 0.12); controls.target.lerp(r.goal.target, 0.12);
        if (camera.position.distanceTo(r.goal.position) < 0.08) { camera.position.copy(r.goal.position); controls.target.copy(r.goal.target); r.goal = undefined; }
      }
      controls.update(); renderer.render(scene, camera);
    });
    setStatus("ready");
    return () => {
      renderer.setAnimationLoop(null); observer.disconnect(); intersection.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown); renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointermove", pointerMove); renderer.domElement.removeEventListener("pointercancel", pointerCancel);
      renderer.domElement.removeEventListener("lostpointercapture", pointerCancel);
      renderer.domElement.removeEventListener("keydown", keyDown); renderer.domElement.removeEventListener("webglcontextlost", lost);
      world.dispose(); envMap.dispose(); sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove(); if (runtime.current === r) runtime.current = null;
    };
  }, [constructionKey, props.quality, attempt]);
  return <div className="terminal-scene" ref={hostRef} data-renderer={status}>
    {status === "loading" && <div className="terminal-scene-message" role="status"><span className="terminal-loader" /><strong>正在构建三维港区</strong><span>船舶 · 岸桥 · 堆场 · 作业道路</span></div>}
    {status === "failed" && <div className="terminal-scene-message" role="alert"><strong>3D 画面暂不可用</strong><span>请开启浏览器硬件加速，或重试恢复画面。当前试验进度仍保留。</span><button type="button" onClick={() => setAttempt(a => a + 1)}>重新载入 3D 场景</button></div>}
  </div>;
});
