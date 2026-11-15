// The whole-game PIXEL LOOK's shared state (set by the Engine on every resize).
//   ART.on      : the 3D world is rendered at a low art resolution and upscaled with crisp nearest filtering
//   ART.rows    : art rows (about 300-360), ART.w / ART.h the art buffer size
//   ART.k       : art pixels per drawing-buffer pixel (< 1 when pixelated). Anything that sizes itself in device pixels
//                 while drawing into the WORLD (gl_PointSize, screen-space strokes) multiplies by ART.k so it keeps its
//                 on-screen size. UI-scene objects render at full resolution and must NOT use it.
//   ART.pointK  : the same factor as a shared shader uniform (point sprites reference it directly)
export const ART = { on: false, rows: 0, w: 1, h: 1, k: 1, block: 1, pointK: { value: 1 } };
