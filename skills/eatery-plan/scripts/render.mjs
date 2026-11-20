#!/usr/bin/env node
// Render an Eatery Plan file to SVG or HTML.
// usage: node render.mjs plan.json out.svg|out.html [--state table-state.json] [--telemetry t.json] [--floor id]
import { readFileSync, writeFileSync } from "node:fs";
import { buildScene, toSvg } from "./eateryplan-render.mjs";

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const statePath = opt("--state"), telPath = opt("--telemetry"), floorId = opt("--floor");
const [planPath, outPath] = args;
if (!planPath || !outPath) {
  console.error("usage: node render.mjs plan.json out.svg|out.html [--state s.json] [--telemetry t.json] [--floor id]");
  process.exit(2);
}
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const plan = load(planPath);
const tel = telPath ? load(telPath) : null;
const scene = buildScene(plan, {
  floorId,
  tableStates: statePath ? load(statePath) : null,
  readings: tel ? { [tel.sensorId]: tel } : null,
  showBackground: false,
});
const svg = toSvg(scene, { title: plan.name });
const out = outPath.endsWith(".html")
  ? `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${plan.name.replace(/</g, "&lt;")}</title><body style="margin:0;padding:16px;background:#fff">` +
    `<div style="max-width:1200px;margin:auto">${svg}</div></body>`
  : svg;
writeFileSync(outPath, out);
const floor = plan.floors.find((f) => f.id === scene.floorId);
console.log(`rendered ${floor.name}: ${floor.tables.length} tables, ${floor.walls.length} walls -> ${outPath}`);
