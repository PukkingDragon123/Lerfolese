// The prologue garden's camera guard (shared by the prologue beats and the tutorial battle).
/** THE GARDEN GUARD: the prologue / tutorial camera never turns away from the old apple garden. The garden (hero tree,
 *  orchard rows, the teacher's bench, the study) lies toward -z; +z is the open lane and the map's edge. A framing that
 *  would face out (|yaw| from -z over yawMax), up into empty sky or straight down is orbited about its look-at point to
 *  the nearest allowed angle, so the subject stays centred and the garden is always behind it. Mutates p and l. */
const D2R = Math.PI / 180, cl = (v, a, b) => Math.max(a, Math.min(b, v));
export function gardenFrame(p, l, { yawMax = 68, yawLeft = yawMax, pitchMin = -40, pitchMax = 6, zMax = 15, hAt = null } = {}) {
  l.x = cl(l.x, -13, 12); l.y = cl(l.y, 0.05, 5.5); l.z = cl(l.z, -16, 8.5); // look-at targets stay inside the garden
  p.x = cl(p.x, -16, 15); p.z = Math.min(p.z, 15);
  let dx = l.x - p.x, dz = l.z - p.z; const hd = Math.max(0.4, Math.hypot(dx, dz)); const yaw = Math.atan2(dx, -dz), ym = yawMax * D2R;
  const yl = yawLeft * D2R; if (yaw > ym || yaw < -yl) { const ny = yaw > 0 ? ym : -yl; p.x = l.x - Math.sin(ny) * hd; p.z = l.z + Math.cos(ny) * hd; }
  const pitch = Math.atan2(l.y - p.y, hd);
  if (pitch > pitchMax * D2R) p.y = l.y - Math.tan(pitchMax * D2R) * hd; else if (pitch < pitchMin * D2R) p.y = l.y + Math.tan(-pitchMin * D2R) * hd;
  if (p.z > zMax) p.z = zMax; // never back out past the lane onto the map's edge
  if (hAt) { const g = hAt(p.x, p.z) + 0.3; if (p.y < g) p.y = g; } return p;
}
