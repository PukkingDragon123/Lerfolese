// Tree IMPOSTORS: far trees as camera-facing cards baked from the REAL flora models (models/flora.js: branching wood
// and pixel-art leaf-spray cards), so a forest of thousands of trees costs one draw call and still reads as the same
// species seen up close (never cones or blobs).
//   - bake: each species / variant is rendered once, side-on, by an orthographic camera into two atlas cells: its
//     albedo (lit by a flat ambient, so the leaf cards' baked crown occlusion is kept) and its normals (the crowns'
//     "inflated" leaf normals, so far crowns still turn broad, clean light and shadow sides to the sun);
//   - draw: one InstancedMesh of quads billboarded round their vertical axis in the vertex shader, lit as a real
//     MeshStandardMaterial (sun, sky, fog: the same light as everything else) with the baked normal per pixel;
//     an alpha boost by mip level keeps distant crowns full instead of thinning out, and a texture LOD bias softens
//     the farthest trees a touch (a painter's soft distance, no post blur).
//   const IM = bakeImpostors(renderer, [{ kind: 'oak', v: 0 }, ...]);  const mesh = impostorForest(IM, items)
//   items: [{ x, y, z, s, cell }] (cell = index into the baked list)
import * as THREE from 'three';
import { tree } from '../models/flora.js';

const NV = `varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const leafNormalMat = (map) => new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { map: { value: map } }, vertexShader: NV,
  fragmentShader: 'uniform sampler2D map; varying vec3 vN; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a < 0.5) discard; vec3 n = normalize(vN); gl_FragColor = vec4(n * 0.5 + 0.5, 1.0); }' });
const woodNormalMat = () => new THREE.ShaderMaterial({ vertexShader: NV, fragmentShader: 'varying vec3 vN; void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * 0.5 + 0.5, 1.0); }' });

/** bake the listed trees into colour + normal atlases. list: [{ kind, v = 0, lod = 0, yaw = 0 }] */
export function bakeImpostors(renderer, list, { cell = 256 } = {}) {
  const n = list.length; const cols = Math.min(4, n), rows = Math.ceil(n / cols); const W = cols * cell, H = rows * cell;
  const opt = { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
  const colRT = new THREE.WebGLRenderTarget(W, H, opt); colRT.texture.colorSpace = THREE.SRGBColorSpace;
  const nrmRT = new THREE.WebGLRenderTarget(W, H, opt);
  const sc = new THREE.Scene(); sc.add(new THREE.AmbientLight(0xffffff, Math.PI)); // albedo x baked occlusion
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const prevRT = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha(), prevAuto = renderer.autoClear;
  const rects = []; renderer.autoClear = false;
  for (let i = 0; i < n; i++) {
    const it = list[i]; const g = tree(it.kind, { v: it.v ?? 0, lod: it.lod ?? 0 }); g.rotation.y = it.yaw ?? 0; g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g); const hw = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) * 1.02 + 0.05; const h = box.max.y - Math.min(0, box.min.y) + 0.1; const y0 = Math.min(0, box.min.y) - 0.05;
    const span = Math.max(hw * 2, h); // a square cell; the tree sits on its bottom edge, centred
    cam.left = -span / 2; cam.right = span / 2; cam.bottom = y0; cam.top = y0 + span; cam.position.set(0, 0, 50); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    const cx = (i % cols) * cell, cy = (rows - 1 - Math.floor(i / cols)) * cell;
    sc.add(g);
    for (const [rt, normals] of [[colRT, false], [nrmRT, true]]) {
      rt.viewport.set(cx, cy, cell, cell); rt.scissor.set(cx, cy, cell, cell); rt.scissorTest = true; renderer.setRenderTarget(rt);
      if (normals) { renderer.setClearColor(0x7f7fff, 0); g.traverse((o) => { if (!o.isMesh) return; o.userData._m = o.material; o.material = o.material.alphaTest > 0 ? leafNormalMat(o.material.map) : woodNormalMat(); }); }
      else renderer.setClearColor(0x232a14, 0); // transparent texels carry a dark foliage colour, so mips never fringe grey
      renderer.clear(); renderer.render(sc, cam);
      if (normals) g.traverse((o) => { if (o.isMesh && o.userData._m) { o.material.dispose(); o.material = o.userData._m; delete o.userData._m; } });
    }
    sc.remove(g);
    // uv rect of the tree inside its cell, and its world size (width, height, base offset)
    const u0 = (cx + cell * (0.5 - hw / span)) / W, u1 = (cx + cell * (0.5 + hw / span)) / W, v0 = cy / H, v1 = (cy + cell * (h / span)) / H;
    rects.push({ uv: new THREE.Vector4(u0, v0, u1, v1), size: new THREE.Vector3(hw * 2, h, y0) });
  }
  for (const rt of [colRT, nrmRT]) { rt.scissorTest = false; rt.viewport.set(0, 0, W, H); rt.scissor.set(0, 0, W, H); }
  renderer.setRenderTarget(prevRT); renderer.setClearColor(prevClear, prevA); renderer.autoClear = prevAuto;
  return { color: colRT.texture, normal: nrmRT.texture, rects, size: new THREE.Vector2(W, H), list, dispose() { colRT.dispose(); nrmRT.dispose(); } };
}

/** one InstancedMesh for every far tree. items: [{ x, y, z, s = 1, cell }]; opts.soft: [start, end] distance of the soft-focus bias */
export function impostorForest(IM, items, { soft = [260, 1100], softK = 1.4, tint = null } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
  const cellA = new Float32Array(items.length); items.forEach((it, i) => (cellA[i] = it.cell)); geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellA, 1));
  const N = IM.rects.length; const U = { uNrm: { value: IM.normal }, uRect: { value: IM.rects.map((r) => r.uv) }, uSize: { value: IM.rects.map((r) => r.size) }, uAtlas: { value: IM.size }, uSoft: { value: new THREE.Vector3(soft[0], soft[1], softK) } };
  const mat = new THREE.MeshStandardMaterial({ map: IM.color, alphaTest: 0.5, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `#define IMP_N ${N}\nattribute float aCell; uniform vec4 uRect[IMP_N]; uniform vec3 uSize[IMP_N]; uniform vec3 uSoft; varying vec3 vImpR; varying vec3 vImpU; varying vec3 vImpF; varying float vImpBias;\n` + sh.vertexShader
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n int ic = int(aCell + 0.5); vec4 iRect = uRect[ic]; vec3 iSize = uSize[ic];\n #ifdef USE_MAP\n vMapUv = mix(iRect.xy, iRect.zw, uv);\n #endif')
      .replace('#include <project_vertex>', `vec3 iP = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; float iS = length(instanceMatrix[0].xyz);
        vec3 iF = cameraPosition - iP; iF.y = 0.0; iF = normalize(iF + vec3(1e-4, 0.0, 0.0)); vec3 iR = vec3(iF.z, 0.0, -iF.x);
        vec3 iW = iP + iR * (position.x * iSize.x * iS) + vec3(0.0, 1.0, 0.0) * ((position.y * iSize.y + iSize.z) * iS);
        vec4 mvPosition = viewMatrix * vec4(iW, 1.0); gl_Position = projectionMatrix * mvPosition;
        vImpR = normalize((viewMatrix * vec4(iR, 0.0)).xyz); vImpU = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); vImpF = normalize((viewMatrix * vec4(iF, 0.0)).xyz);
        vImpBias = smoothstep(uSoft.x, uSoft.y, length(mvPosition.xyz)) * uSoft.z;`)
      .replace('#include <worldpos_vertex>', 'vec4 worldPosition = vec4(iW, 1.0);');
    sh.fragmentShader = 'uniform sampler2D uNrm; uniform vec2 uAtlas; varying vec3 vImpR; varying vec3 vImpU; varying vec3 vImpF; varying float vImpBias;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `vec4 sampledDiffuseColor = texture2D(map, vMapUv, vImpBias); diffuseColor *= sampledDiffuseColor;
        { vec2 tx = vMapUv * uAtlas; float lod = 0.5 * log2(max(max(dot(dFdx(tx), dFdx(tx)), dot(dFdy(tx), dFdy(tx))), 1.0)) + vImpBias; diffuseColor.a = min(1.0, diffuseColor.a * (1.0 + lod * 0.32)); }`)
      .replace('#include <normal_fragment_begin>', `float faceDirection = 1.0; vec3 nbk = texture2D(uNrm, vMapUv, vImpBias).xyz * 2.0 - 1.0;
        vec3 normal = normalize(vImpR * nbk.x + vImpU * nbk.y + vImpF * max(nbk.z, 0.05)); vec3 nonPerturbedNormal = normal;`);
  };
  mat.customProgramCacheKey = () => 'impostor' + N;
  const im = new THREE.InstancedMesh(geo, mat, items.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  items.forEach((it, i) => { m4.compose(p.set(it.x, it.y, it.z), q, s.setScalar(it.s ?? 1)); im.setMatrixAt(i, m4); const j = Math.sin(it.x * 7.1 + it.z * 3.3) * 0.5 + 0.5; col.setRGB(1, 1, 1).offsetHSL((j - 0.5) * 0.03, (j - 0.5) * 0.08, (j - 0.5) * 0.06); if (tint) col.multiply(tint); im.setColorAt(i, col); });
  im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = 'impostorForest'; im.userData.noInk = true; im.userData.noAO = true;
  return im;
}
