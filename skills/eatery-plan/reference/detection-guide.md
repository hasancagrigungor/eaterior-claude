# Filling detection.json

All coordinates are **image pixels**, origin at the top-left of the image. Every key is required; use `null`
for unknown values and `[]` for empty lists. Do not add keys that the schema does not define.

## image
`widthPx`, `heightPx`: exact pixel size of the image you are reading.

## scale
- `pixelsPerMeter`: only when a scale bar or a written dimension lets you compute it. Otherwise `null`.
- `evidence`: `"scale_bar"`, `"dimension_label"`, `"user_input"` or `null`.
- Prefer adding written dimensions to `labels[].dimension`; the importer derives the scale from them.

## rooms
One entry per enclosed area: `name` (as written, or `null`), `kind` (`dining`, `terrace`, `bar`, `kitchen`,
`storage`, `restroom`, `corridor`, `entrance`, `staff`, `outdoor`, `other`), `polygon` (outline corners in order,
at least 3), `confidence`.

## walls
- One entry per **straight** segment along the wall's centre line: `x1, y1, x2, y2`.
- End points should meet where walls meet. Split a wall where it changes direction.
- Draw a wall continuously through doors and windows; openings are listed separately.
- `thicknessPx` if visible, else `null`. `kind`: `external`, `solid`, `partition`, `glass`, `half_height`.

## openings
Centre point `x, y` on the wall, `widthPx` of the gap, `kind` (`door`, `window`, `archway`), `swing`
(`left`, `right`, `double`, `sliding`, `none`, or `null` if not drawn).

## tables
`shape` (`round`, `oval`, `rect`), centre `cx, cy`, `width`, `height` of the **table top**, `rotationDeg`
(clockwise), `label` (number as written, or `null`), `seats` (only if chairs are drawn or a count is written),
`kind` (`standard`, `high`, `bar_stool`, `booth`, `sofa`, `communal`, `outdoor`, `other`, or `null`).
Do not count chairs as separate fixtures.

## fixtures
Counters, bar counters, sofas, stairs, columns, sinks, stoves, fridges, toilets, POS terminals, plants,
equipment: `kind`, `shape`, centre box, optional `name`.

## climateDevices
Only devices drawn or labelled (AC units, vents, hoods, heaters, radiators, thermostats…): `kind`, centre box,
`mount` (`wall`, `ceiling`, `floor`, `window`, `duct`, `other`, or `null`).

## labels
- Room names and notes: `text`, `x, y`, `dimension: null`. Room names inside an unnamed room become its name.
- Written dimensions: `text` as written ("5.40 m"), position of the text, and
  `dimension: {x1, y1, x2, y2, valueMeters}` for the measured segment's end points.

## confidence and notes
- 0.9+: clearly drawn. 0.6–0.9: probably right. Below 0.6: faint, partly hidden or guessed.
- Put every ambiguity in `notes` (for example "door swing not visible", "right wall cut off").

## Minimal example

```json
{
  "image": {"widthPx": 800, "heightPx": 500},
  "scale": {"pixelsPerMeter": null, "evidence": null},
  "rooms": [{"name": "Hall", "kind": "dining",
             "polygon": [{"x": 20, "y": 20}, {"x": 780, "y": 20}, {"x": 780, "y": 480}, {"x": 20, "y": 480}],
             "confidence": 0.9}],
  "walls": [
    {"x1": 20, "y1": 20, "x2": 780, "y2": 20, "thicknessPx": 8, "kind": "external", "confidence": 0.95},
    {"x1": 780, "y1": 20, "x2": 780, "y2": 480, "thicknessPx": 8, "kind": "external", "confidence": 0.95},
    {"x1": 780, "y1": 480, "x2": 20, "y2": 480, "thicknessPx": 8, "kind": "external", "confidence": 0.95},
    {"x1": 20, "y1": 480, "x2": 20, "y2": 20, "thicknessPx": 8, "kind": "external", "confidence": 0.95}],
  "openings": [{"kind": "door", "x": 400, "y": 480, "widthPx": 70, "swing": "right", "confidence": 0.9}],
  "tables": [{"label": "1", "shape": "round", "cx": 200, "cy": 200, "width": 80, "height": 80, "rotationDeg": 0,
              "seats": 4, "kind": null, "confidence": 0.9}],
  "fixtures": [], "climateDevices": [], "labels": [], "notes": []
}
```
