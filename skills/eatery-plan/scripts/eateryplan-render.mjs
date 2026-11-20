/**
 * Eatery Plan reference renderer.
 *
 * buildScene() turns a plan into a flat, platform-neutral display list:
 *   { type: "path",  d, fill, stroke, strokeWidth, dash, opacity, layer, ref }
 *   { type: "text",  x, y, text, fontSize, fill, rotation, weight, layer, ref }
 *   { type: "image", href, x, y, width, height, opacity, rotation, layer }
 * Every geometry is an SVG path string in floor units, so the same list can be drawn by
 * SVG on the web, react-native-svg on mobile, or Canvas via new Path2D(d).
 * The scene viewBox is "0 0 width height"; scale it to the screen with "xMidYMid meet".
 *
 * No dependencies. Works in browsers, Node >= 18, React Native.
 */

export const LAYERS = ["background", "zones", "fixtures", "walls", "openings", "tables", "chairs",
  "climate", "sensors", "labels", "review"];

export const DEFAULT_THEME = {
  background: "#FFFFFF",
  zone: {
    dining: "#EEF6EE", terrace: "#EAF2FB", bar: "#F8F0E3", kitchen: "#F6ECEC", storage: "#F1F1F1",
    restroom: "#EEF0F8", corridor: "#F5F5F5", entrance: "#F3F7EC", staff: "#F2EEF6", outdoor: "#EDF5F2",
    other: "#F4F4F4",
  },
  zoneStroke: "#C9CED6",
  zoneText: "#6B7280",
  wall: { solid: "#2F343B", external: "#1F2328", partition: "#6B7280", glass: "#7FB3D5", half_height: "#9CA3AF" },
  window: "#7FB3D5",
  door: "#6B7280",
  fixture: { fill: "#E5E1DA", stroke: "#8C857B" },
  table: { fill: "#FFFFFF", stroke: "#4B5563", text: "#111827" },
  chair: { fill: "#D1D5DB", stroke: "#9CA3AF" },
  status: {
    available: "#D1FAE5", occupied: "#FECACA", reserved: "#FDE68A",
    blocked: "#E5E7EB", cleaning: "#BFDBFE", unknown: "#F3F4F6",
  },
  climate: { fill: "#E0F2FE", stroke: "#0284C7", text: "#0369A1" },
  sensor: { fill: "#0EA5E9", stroke: "#FFFFFF", text: "#0F172A" },
  label: "#374151",
  dimension: "#6B7280",
  review: "#F59E0B",
};

const CLIMATE_CODE = {
  air_conditioner: "AC", hvac_indoor_unit: "HVAC", hvac_outdoor_unit: "ODU", ventilation_fan: "FAN",
  exhaust_hood: "HOOD", air_supply_vent: "SUP", air_return_vent: "RET", air_purifier: "AIR", heater: "HEAT",
  radiator: "RAD", underfloor_heating: "UFH", thermostat: "T", humidifier: "HUM", dehumidifier: "DHUM", other: "",
};

// ------------------------------------------------------------------ math
const f = (n) => (Math.round(n * 100) / 100).toString();
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

function rot(p, deg, c) {
  if (!deg) return p;
  const r = (deg * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r);
  return [c[0] + (p[0] - c[0]) * cs - (p[1] - c[1]) * sn, c[1] + (p[0] - c[0]) * sn + (p[1] - c[1]) * cs];
}

function bboxCenter(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

/** Pivot used for rotation and as the visual centre of a shape (same rule as the Python reference). */
export function shapeCenter(s) {
  switch (s.kind) {
    case "rect": return [s.x + s.width / 2, s.y + s.height / 2];
    case "ellipse": return [s.cx, s.cy];
    case "polygon": return bboxCenter(s.points.map((p) => [p.x, p.y]));
    default: {
      const pts = [];
      for (const c of s.commands) {
        for (const [kx, ky] of [["x", "y"], ["cx", "cy"], ["c1x", "c1y"], ["c2x", "c2y"]]) {
          if (kx in c && ky in c) pts.push([c[kx], c[ky]]);
        }
      }
      return bboxCenter(pts);
    }
  }
}

/** Horizontal centre and top edge of a shape's (unrotated) outline, used to place zone names. */
function shapeTop(s) {
  const [cx] = shapeCenter(s);
  if (s.kind === "rect") return [cx, s.y];
  if (s.kind === "ellipse") return [cx, s.cy - s.ry];
  const pts = s.kind === "polygon" ? s.points : s.commands.filter((c) => "y" in c);
  return [cx, Math.min(...pts.map((p) => p.y))];
}

/** Shape -> SVG path data, rotation baked into the coordinates. */
export function shapeToPath(s) {
  const deg = s.rotationDeg || 0;
  const c = shapeCenter(s);
  const P = (x, y) => { const q = rot([x, y], deg, c); return `${f(q[0])} ${f(q[1])}`; };
  switch (s.kind) {
    case "rect": {
      const { x, y, width: w, height: h } = s;
      const r = Math.min(s.cornerRadius || 0, w / 2, h / 2);
      if (!r) return `M${P(x, y)} L${P(x + w, y)} L${P(x + w, y + h)} L${P(x, y + h)} Z`;
      const A = (ex, ey) => `A${f(r)} ${f(r)} 0 0 1 ${P(ex, ey)}`;
      return `M${P(x + r, y)} L${P(x + w - r, y)} ${A(x + w, y + r)} L${P(x + w, y + h - r)} ${A(x + w - r, y + h)} ` +
        `L${P(x + r, y + h)} ${A(x, y + h - r)} L${P(x, y + r)} ${A(x + r, y)} Z`;
    }
    case "ellipse": {
      const { cx, cy, rx, ry } = s;
      return `M${P(cx + rx, cy)} A${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${P(cx - rx, cy)} ` +
        `A${f(rx)} ${f(ry)} ${f(deg)} 1 1 ${P(cx + rx, cy)} Z`;
    }
    case "polygon":
      return s.points.map((p, i) => `${i ? "L" : "M"}${P(p.x, p.y)}`).join(" ") + " Z";
    default: {
      const out = s.commands.map((k) => {
        switch (k.cmd) {
          case "M": case "L": return `${k.cmd}${P(k.x, k.y)}`;
          case "Q": return `Q${P(k.cx, k.cy)} ${P(k.x, k.y)}`;
          case "C": return `C${P(k.c1x, k.c1y)} ${P(k.c2x, k.c2y)} ${P(k.x, k.y)}`;
          case "A": return `A${f(k.rx)} ${f(k.ry)} ${f((k.xAxisRotationDeg || 0) + deg)} ` +
            `${k.largeArc ? 1 : 0} ${k.sweep ? 1 : 0} ${P(k.x, k.y)}`;
          default: return "Z";
        }
      }).join(" ");
      return s.closed && !/Z$/.test(out) ? out + " Z" : out;
    }
  }
}

/** Straight or curved wall; t in [0,1] from a to b. Mirrors python/eateryplan/geometry.py WallGeom. */
export class WallGeom {
  constructor(w) {
    this.a = [w.a.x, w.a.y]; this.b = [w.b.x, w.b.y];
    this.thickness = w.thickness;
    this.chord = dist(this.a, this.b);
    this.bulge = w.bulge || 0;
    this.curved = !!this.bulge && this.chord > 0;
    if (!this.curved) { this.length = this.chord; return; }
    const theta = 4 * Math.atan(this.bulge);
    this.radius = this.chord / (2 * Math.sin(Math.abs(theta) / 2));
    this.length = Math.abs(theta) * this.radius;
    const ux = (this.b[0] - this.a[0]) / this.chord, uy = (this.b[1] - this.a[1]) / this.chord;
    const nx = -uy, ny = ux;
    const mx = (this.a[0] + this.b[0]) / 2, my = (this.a[1] + this.b[1]) / 2;
    const sagitta = Math.abs(this.bulge) * this.chord / 2;
    const sign = this.bulge > 0 ? 1 : -1;
    const d = this.radius - sagitta;
    this.center = [mx - sign * nx * d, my - sign * ny * d];
    this.a0 = Math.atan2(this.a[1] - this.center[1], this.a[0] - this.center[0]);
    const apex = [mx + sign * nx * sagitta, my + sign * ny * sagitta];
    this.sweep = Math.abs(theta);
    if (dist(this.atAngle(this.a0 + this.sweep / 2), apex) > 1e-6 * Math.max(1, this.chord)) this.sweep = -Math.abs(theta);
  }
  atAngle(a) { return [this.center[0] + this.radius * Math.cos(a), this.center[1] + this.radius * Math.sin(a)]; }
  pointAt(t) {
    if (!this.curved) return [this.a[0] + (this.b[0] - this.a[0]) * t, this.a[1] + (this.b[1] - this.a[1]) * t];
    return this.atAngle(this.a0 + this.sweep * t);
  }
  tangentAt(t) {
    if (!this.curved) return this.chord ? [(this.b[0] - this.a[0]) / this.chord, (this.b[1] - this.a[1]) / this.chord] : [1, 0];
    const a = this.a0 + this.sweep * t, s = this.sweep > 0 ? 1 : -1;
    return [-Math.sin(a) * s, Math.cos(a) * s];
  }
  /** Path of the wall centre line between t0 and t1. */
  segmentPath(t0, t1, extendStart = 0, extendEnd = 0) {
    let p0 = this.pointAt(t0), p1 = this.pointAt(t1);
    if (!this.curved) {
      const [tx, ty] = this.tangentAt(0);
      p0 = [p0[0] - tx * extendStart, p0[1] - ty * extendStart];
      p1 = [p1[0] + tx * extendEnd, p1[1] + ty * extendEnd];
      return `M${f(p0[0])} ${f(p0[1])} L${f(p1[0])} ${f(p1[1])}`;
    }
    const span = this.sweep * (t1 - t0);
    return `M${f(p0[0])} ${f(p0[1])} A${f(this.radius)} ${f(this.radius)} 0 ${Math.abs(span) > Math.PI ? 1 : 0} ` +
      `${span > 0 ? 1 : 0} ${f(p1[0])} ${f(p1[1])}`;
  }
}

function circlePath(cx, cy, r) {
  return `M${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 1 ${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 1 ${f(cx + r)} ${f(cy)} Z`;
}

function autoChairs(t, unit) {
  const s = t.shape, n = t.seats, deg = s.rotationDeg || 0;
  if (s.kind === "ellipse") {
    const cr = Math.max(unit * 0.8, Math.min(s.rx, s.ry) * 0.28);
    return Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2;
      const p = [s.cx + (s.rx + cr * 1.3) * Math.cos(a), s.cy + (s.ry + cr * 1.3) * Math.sin(a)];
      return { p: rot(p, deg, [s.cx, s.cy]), r: cr };
    });
  }
  if (s.kind === "rect") {
    const c = [s.x + s.width / 2, s.y + s.height / 2], w = s.width, h = s.height;
    // sides: [length, start point, direction, outward normal]; chairs shared out by side length
    const sides = [[w, [s.x, s.y], [1, 0], [0, -1]], [h, [s.x + w, s.y], [0, 1], [1, 0]],
      [w, [s.x + w, s.y + h], [-1, 0], [0, 1]], [h, [s.x, s.y + h], [0, -1], [-1, 0]]];
    const perim = 2 * (w + h);
    const counts = sides.map(([len]) => Math.floor((n * len) / perim));
    const rest = sides.map(([len], i) => [(n * len) / perim - counts[i], i]).sort((p, q) => q[0] - p[0]);
    for (let k = 0; counts.reduce((a, b) => a + b, 0) < n; k++) counts[rest[k % 4][1]]++;
    const cr = Math.max(unit * 0.8, Math.min(Math.min(w, h) * 0.14, (perim / Math.max(1, n)) * 0.25));
    const out = [];
    sides.forEach(([len, p0, dir, nrm], i) => {
      for (let j = 0; j < counts[i]; j++) {
        const a = (len * (j + 0.5)) / counts[i];
        const p = [p0[0] + dir[0] * a + nrm[0] * cr * 1.3, p0[1] + dir[1] * a + nrm[1] * cr * 1.3];
        out.push({ p: rot(p, deg, c), r: cr });
      }
    });
    return out;
  }
  return [];
}

function formatReadings(r) {
  if (!r) return null;
  const parts = [];
  if (r.temperatureC != null) parts.push(`${r.temperatureC.toFixed(1)}°C`);
  if (r.relativeHumidityPct != null) parts.push(`${Math.round(r.relativeHumidityPct)}%`);
  if (r.co2Ppm != null) parts.push(`${Math.round(r.co2Ppm)} ppm`);
  if (r.pm25UgM3 != null) parts.push(`PM2.5 ${r.pm25UgM3}`);
  return parts.length ? parts.join(" · ") : null;
}

function asMap(x, key) {
  if (!x) return new Map();
  if (x instanceof Map) return x;
  if (Array.isArray(x)) return new Map(x.map((e) => [e[key], e]));
  if (Array.isArray(x.tables)) return new Map(x.tables.map((e) => [e[key], e]));
  return new Map(Object.entries(x));
}

// ------------------------------------------------------------------ scene
/**
 * @param plan      Eatery Plan document
 * @param options   floorId, tableStates (table-state document, array or map by tableId),
 *                  readings (map sensorId -> readings object), theme (partial override),
 *                  resolveAsset(asset) -> href | null, showBackground, showChairs, showZoneNames,
 *                  highlightReview
 */
export function buildScene(plan, options = {}) {
  const floor = plan.floors.find((x) => x.id === options.floorId) || plan.floors[0];
  const theme = { ...DEFAULT_THEME, ...(options.theme || {}) };
  const states = asMap(options.tableStates, "tableId");
  const readings = asMap(options.readings, "sensorId");
  const { width: W, height: H } = floor.coordinateSpace;
  const unit = Math.min(W, H) / 100;
  const items = [];
  const vis = (o) => o.visible !== false;
  const ordered = (arr) => (arr || []).filter(vis).map((o, i) => [o, i])
    .sort((p, q) => (p[0].zIndex || 0) - (q[0].zIndex || 0) || p[1] - q[1]).map((p) => p[0]);
  const ref = (type, o) => ({ type, id: o.id });
  const review = (d, o, type) => {
    if (options.highlightReview !== false && o.needsReview) {
      items.push({ type: "path", d, fill: "none", stroke: theme.review, strokeWidth: unit * 0.5,
        dash: [unit * 1.2, unit * 0.8], layer: "review", ref: ref(type, o) });
    }
  };

  // background
  if (floor.background && options.showBackground !== false) {
    const asset = (plan.assets || []).find((a) => a.id === floor.background.assetId);
    const href = asset && (options.resolveAsset ? options.resolveAsset(asset) : asset.url);
    const tr = floor.background.transform || { x: 0, y: 0, width: W, height: H };
    if (href && /^image\//.test(asset.mimeType)) {
      items.push({ type: "image", href, x: tr.x, y: tr.y, width: tr.width, height: tr.height,
        rotation: tr.rotationDeg || 0, opacity: floor.background.opacity ?? 1, layer: "background" });
    }
  }

  // zones (+ name)
  for (const z of ordered(floor.zones)) {
    const d = shapeToPath(z.shape);
    items.push({ type: "path", d, fill: z.style?.fill || theme.zone[z.kind] || theme.zone.other,
      stroke: z.style?.stroke || theme.zoneStroke, strokeWidth: z.style?.strokeWidth ?? unit * 0.15,
      opacity: z.style?.opacity ?? 1, layer: "zones", ref: ref("zone", z) });
    review(d, z, "zone");
    if (options.showZoneNames !== false && z.name) {
      const [cx, top] = shapeTop(z.shape);
      items.push({ type: "text", x: cx, y: top + unit * 2.6, text: z.name, fontSize: unit * 1.9, weight: 500,
        fill: theme.zoneText, rotation: 0, layer: "labels", ref: ref("zone", z) });
    }
  }

  // fixtures
  for (const fx of ordered(floor.fixtures)) {
    const d = shapeToPath(fx.shape);
    items.push({ type: "path", d, fill: fx.style?.fill || theme.fixture.fill, stroke: fx.style?.stroke || theme.fixture.stroke,
      strokeWidth: unit * 0.2, layer: "fixtures", ref: ref("fixture", fx) });
    review(d, fx, "fixture");
  }

  // walls with openings cut out, then opening symbols
  const openingsByWall = new Map();
  for (const o of ordered(floor.openings)) {
    if (!openingsByWall.has(o.wallId)) openingsByWall.set(o.wallId, []);
    openingsByWall.get(o.wallId).push(o);
  }
  for (const w of ordered(floor.walls)) {
    const g = new WallGeom(w);
    if (g.length <= 0) continue;
    const gaps = (openingsByWall.get(w.id) || []).map((o) => {
      const c = o.position * g.length, h = o.width / 2;
      return [Math.max(0, (c - h) / g.length), Math.min(1, (c + h) / g.length), o];
    }).sort((p, q) => p[0] - q[0]);
    const color = w.style?.stroke || theme.wall[w.kind] || theme.wall.solid;
    let t = 0;
    const solid = [];
    for (const [t0, t1] of gaps) { if (t0 > t) solid.push([t, t0]); t = Math.max(t, t1); }
    if (t < 1) solid.push([t, 1]);
    for (const [t0, t1] of solid) {
      const ext0 = t0 === 0 ? w.thickness / 2 : 0, ext1 = t1 === 1 ? w.thickness / 2 : 0;
      items.push({ type: "path", d: g.segmentPath(t0, t1, ext0, ext1), fill: "none", stroke: color,
        strokeWidth: w.thickness, dash: w.kind === "half_height" ? [w.thickness, w.thickness * 0.6] : null,
        layer: "walls", ref: ref("wall", w) });
    }
    if (w.needsReview) review(g.segmentPath(0, 1), w, "wall");

    for (const [t0, t1, o] of gaps) {
      const p0 = g.pointAt(t0), p1 = g.pointAt(t1);
      if (o.kind === "window") {
        items.push({ type: "path", d: g.segmentPath(t0, t1), fill: "none", stroke: theme.window,
          strokeWidth: Math.max(unit * 0.3, w.thickness * 0.35), layer: "openings", ref: ref("opening", o) });
      } else if (o.kind === "door" && o.swing !== "none") {
        const outward = o.opensToward === "outside" ? -1 : 1;
        const sw = Math.max(unit * 0.2, w.thickness * 0.18);
        const leaf = (hinge, jamb, tHinge, len) => {
          const [tx, ty] = g.tangentAt(tHinge);
          const n = [-ty * outward, tx * outward];
          const end = [hinge[0] + n[0] * len, hinge[1] + n[1] * len];
          const v1 = [end[0] - hinge[0], end[1] - hinge[1]], v2 = [jamb[0] - hinge[0], jamb[1] - hinge[1]];
          const sweep = v1[0] * v2[1] - v1[1] * v2[0] > 0 ? 1 : 0;
          items.push({ type: "path", d: `M${f(hinge[0])} ${f(hinge[1])} L${f(end[0])} ${f(end[1])}`, fill: "none",
            stroke: theme.door, strokeWidth: sw, layer: "openings", ref: ref("opening", o) });
          items.push({ type: "path", d: `M${f(end[0])} ${f(end[1])} A${f(len)} ${f(len)} 0 0 ${sweep} ${f(jamb[0])} ${f(jamb[1])}`,
            fill: "none", stroke: theme.door, strokeWidth: sw * 0.7, dash: [unit * 0.6, unit * 0.4],
            layer: "openings", ref: ref("opening", o) });
        };
        if (o.swing === "double") {
          const mid = g.pointAt((t0 + t1) / 2), half = dist(p0, p1) / 2;
          leaf(p0, mid, t0, half); leaf(p1, mid, t1, half);
        } else if (o.swing === "sliding") {
          const [tx, ty] = g.tangentAt((t0 + t1) / 2), off = w.thickness * 0.6 * outward;
          const n = [-ty * off, tx * off];
          items.push({ type: "path", d: `M${f(p0[0] + n[0])} ${f(p0[1] + n[1])} L${f(p1[0] + n[0])} ${f(p1[1] + n[1])}`,
            fill: "none", stroke: theme.door, strokeWidth: sw * 1.4, layer: "openings", ref: ref("opening", o) });
        } else if (o.hinge === "end") {
          leaf(p1, p0, t1, dist(p0, p1));
        } else {
          leaf(p0, p1, t0, dist(p0, p1));
        }
      }
      if (o.needsReview) review(circlePath(...g.pointAt((t0 + t1) / 2), o.width / 2), o, "opening");
    }
  }

  // tables, chairs, numbers
  for (const t of ordered(floor.tables)) {
    const st = states.get(t.id);
    const d = shapeToPath(t.shape);
    const chairs = t.chairs?.length ? t.chairs.map((c) => ({ p: [c.x, c.y], r: unit * 1.1 }))
      : options.showChairs === false ? [] : autoChairs(t, unit);
    for (const c of chairs) {
      items.push({ type: "path", d: circlePath(c.p[0], c.p[1], c.r), fill: theme.chair.fill, stroke: theme.chair.stroke,
        strokeWidth: unit * 0.12, layer: "chairs", ref: ref("table", t) });
    }
    items.push({ type: "path", d, fill: st ? theme.status[st.status] || theme.status.unknown : (t.style?.fill || theme.table.fill),
      stroke: t.style?.stroke || theme.table.stroke, strokeWidth: unit * 0.25, layer: "tables", ref: ref("table", t),
      status: st?.status ?? null });
    const [cx, cy] = shapeCenter(t.shape);
    items.push({ type: "text", x: cx, y: cy, text: t.number, fontSize: unit * 2.4, weight: 600, fill: theme.table.text,
      rotation: 0, layer: "tables", ref: ref("table", t) });
    review(d, t, "table");
  }

  // climate devices
  for (const dv of ordered(floor.climateDevices)) {
    const d = shapeToPath(dv.shape);
    items.push({ type: "path", d, fill: theme.climate.fill, stroke: theme.climate.stroke, strokeWidth: unit * 0.2,
      dash: [unit * 0.8, unit * 0.4], layer: "climate", ref: ref("climateDevice", dv) });
    const [cx, cy] = shapeCenter(dv.shape);
    const code = CLIMATE_CODE[dv.kind] ?? "";
    if (code) items.push({ type: "text", x: cx, y: cy, text: code, fontSize: unit * 1.5, weight: 600,
      fill: theme.climate.text, rotation: 0, layer: "climate", ref: ref("climateDevice", dv) });
    if (dv.airflowDirectionDeg != null) {
      const a = (dv.airflowDirectionDeg * Math.PI) / 180, len = unit * 6;
      const s = [cx + Math.cos(a) * unit * 2, cy + Math.sin(a) * unit * 2], e = [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
      const h1 = [e[0] - Math.cos(a - 0.5) * unit * 1.5, e[1] - Math.sin(a - 0.5) * unit * 1.5];
      const h2 = [e[0] - Math.cos(a + 0.5) * unit * 1.5, e[1] - Math.sin(a + 0.5) * unit * 1.5];
      items.push({ type: "path", d: `M${f(s[0])} ${f(s[1])} L${f(e[0])} ${f(e[1])} M${f(h1[0])} ${f(h1[1])} L${f(e[0])} ${f(e[1])} L${f(h2[0])} ${f(h2[1])}`,
        fill: "none", stroke: theme.climate.stroke, strokeWidth: unit * 0.3, layer: "climate", ref: ref("climateDevice", dv) });
    }
    review(d, dv, "climateDevice");
  }

  // sensors (+ live readings)
  for (const s of ordered(floor.environmentalSensors)) {
    const { x, y } = s.position;
    items.push({ type: "path", d: circlePath(x, y, unit * 1.2), fill: theme.sensor.fill, stroke: theme.sensor.stroke,
      strokeWidth: unit * 0.3, layer: "sensors", ref: ref("sensor", s) });
    const r = readings.get(s.id);
    const text = formatReadings(r?.readings ?? r);
    if (text) items.push({ type: "text", x, y: y + unit * 3, text, fontSize: unit * 1.6, weight: 500,
      fill: theme.sensor.text, rotation: 0, layer: "sensors", ref: ref("sensor", s) });
  }

  // labels and dimensions
  for (const lb of ordered(floor.labels)) {
    const fontSize = lb.fontSize || unit * 2;
    let rotation = lb.rotationDeg || 0;
    if (lb.kind === "dimension") {
      const a = [lb.a.x, lb.a.y], b = [lb.b.x, lb.b.y], L = dist(a, b) || 1;
      const n = [-(b[1] - a[1]) / L * unit, (b[0] - a[0]) / L * unit];
      items.push({ type: "path", d: `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} ` +
        `M${f(a[0] - n[0])} ${f(a[1] - n[1])} L${f(a[0] + n[0])} ${f(a[1] + n[1])} ` +
        `M${f(b[0] - n[0])} ${f(b[1] - n[1])} L${f(b[0] + n[0])} ${f(b[1] + n[1])}`,
        fill: "none", stroke: theme.dimension, strokeWidth: unit * 0.15, layer: "labels", ref: ref("label", lb) });
      if (!lb.rotationDeg) {
        rotation = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        if (rotation > 90) rotation -= 180; else if (rotation < -90) rotation += 180;
      }
    }
    items.push({ type: "text", x: lb.position.x, y: lb.position.y, text: lb.text, fontSize, weight: 500,
      fill: lb.kind === "dimension" ? theme.dimension : theme.label, rotation, layer: "labels", ref: ref("label", lb) });
  }

  const order = new Map(LAYERS.map((l, i) => [l, i]));
  const sorted = items.map((it, i) => [it, i]).sort((p, q) => order.get(p[0].layer) - order.get(q[0].layer) || p[1] - q[1])
    .map((p) => p[0]);
  return { floorId: floor.id, width: W, height: H, viewBox: `0 0 ${f(W)} ${f(H)}`, background: theme.background, items: sorted };
}

// ------------------------------------------------------------------ SVG adapter
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Scene -> standalone SVG string. Elements carry data-ref-type / data-ref-id for hit testing. */
export function toSvg(scene, { title, className } = {}) {
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${scene.viewBox}" preserveAspectRatio="xMidYMid meet"` +
    `${className ? ` class="${esc(className)}"` : ""} role="img">`];
  if (title) out.push(`<title>${esc(title)}</title>`);
  out.push(`<rect x="0" y="0" width="${f(scene.width)}" height="${f(scene.height)}" fill="${esc(scene.background)}"/>`);
  for (const it of scene.items) {
    const data = it.ref ? ` data-ref-type="${esc(it.ref.type)}" data-ref-id="${esc(it.ref.id)}"` : "";
    if (it.type === "path") {
      out.push(`<path d="${it.d}" fill="${esc(it.fill)}" stroke="${esc(it.stroke)}" stroke-width="${f(it.strokeWidth)}"` +
        `${it.dash ? ` stroke-dasharray="${it.dash.map(f).join(" ")}"` : ""}${it.opacity != null && it.opacity !== 1 ? ` opacity="${f(it.opacity)}"` : ""}` +
        ` stroke-linejoin="round"${data}/>`);
    } else if (it.type === "text") {
      out.push(`<text x="${f(it.x)}" y="${f(it.y)}" font-size="${f(it.fontSize)}" font-weight="${it.weight || 400}" fill="${esc(it.fill)}"` +
        ` text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"` +
        `${it.rotation ? ` transform="rotate(${f(it.rotation)} ${f(it.x)} ${f(it.y)})"` : ""}${data}>${esc(it.text)}</text>`);
    } else if (it.type === "image") {
      const cx = it.x + it.width / 2, cy = it.y + it.height / 2;
      out.push(`<image href="${esc(it.href)}" x="${f(it.x)}" y="${f(it.y)}" width="${f(it.width)}" height="${f(it.height)}"` +
        ` opacity="${f(it.opacity)}" preserveAspectRatio="none"${it.rotation ? ` transform="rotate(${f(it.rotation)} ${f(cx)} ${f(cy)})"` : ""}/>`);
    }
  }
  out.push("</svg>");
  return out.join("\n");
}
