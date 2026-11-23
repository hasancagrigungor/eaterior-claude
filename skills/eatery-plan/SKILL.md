---
name: eatery-plan
description: Create, convert, edit, validate and render Eatery Plan floor plans (restaurant, cafe and bar layouts as JSON), including turning a floor plan image or sketch into a validated plan.
---

# Eatery Plan

Eatery Plan is an open JSON format for the physical layout of restaurants, cafes and bars: floors, zones, walls,
doors and windows, tables, furniture, HVAC equipment and sensors. Specification and schemas:
https://github.com/hasancagrigungor/eatery-plan

Use this skill when the user wants to:

- turn a floor plan **image, photo, scan or sketch** into an Eatery Plan file
- **create** a plan from a description ("12 tables, a bar on the left, a terrace")
- **edit** a plan ("move A3 next to the window", "add 4 two-person tables to the terrace")
- **validate**, **render/preview**, or **upgrade** (legacy CafePlan) a plan, or check live table state / sensor data

## Setup (once per environment)

1. Check the CLI: `eateryplan --help`. If it is missing, tell the user it is needed and, with their OK, install it:
   `pip install "git+https://github.com/hasancagrigungor/eatery-plan@v1.3.0#subdirectory=python"` (Python 3.10+).
2. The schemas ship with the package. Print their folder with
   `python3 -c "import eateryplan, pathlib; print(pathlib.Path(eateryplan.__file__).parent / 'schemas')"`.
3. Previews are optional and need Node.js 18+ and the reference renderer. With the user's OK, fetch the pinned
   release once: `git clone --depth 1 --branch v1.3.0 https://github.com/hasancagrigungor/eatery-plan`
   and use `node <clone>/js/bin/render.mjs`. If the user already has the repository, use theirs.

## Hard rules

- Never save or hand over a plan that fails `eateryplan validate`. Fix it first.
- Only describe what exists. Do not add tables, doors, devices or rooms that are not in the image or the request.
- Never invent the real-world scale. Use it only from a scale bar, a written dimension, or the user.
- Never invent device capacities, sensor readings or POS ids.
- Everything you generate gets `"source": "ai"` and a `confidence` (0–1). Anything uncertain gets
  `"needsReview": true`, and you list it for the user at the end.
- Keep existing `id`s, `number`s and `externalTableId`s when editing; they link the plan to POS and live data.
  Never change objects with `"locked": true` unless the user explicitly asks.
- Custom data goes in `extensions` with namespaced keys (`vendor.field`).

## A. Image or sketch → plan

Do the uncertain part (reading the drawing) in pixels and let the importer do the exact part (geometry).

1. Get the image size in pixels (for example `python3 -c "from PIL import Image; print(Image.open('f.png').size)"`,
   `sips -g pixelWidth -g pixelHeight f.png` on macOS, or `identify f.png`).
2. Read `detection.schema.json` from the schema folder and `reference/detection-guide.md` in this skill.
3. Look at the image carefully and write `detection.json`, in **image pixel coordinates** (origin top-left).
   Every field is required; use `null` when unknown.
4. Convert and validate:
   `eateryplan import detection.json plan.json --image <image> --name "<venue>" --tool "eatery-plan skill"`
   Add `--json` to get machine-readable issues. If it fails, fix `detection.json` and run it again
   (at most 3 attempts; then explain what is still wrong).
5. If the renderer is available, preview: `node <clone>/js/bin/render.mjs plan.json plan.svg`. Compare the
   preview with the image. If walls, doors or tables are clearly misplaced, correct `detection.json` once and
   re-import.
6. Report to the user: rooms, tables and seats, doors and windows, whether a scale was found, the importer's
   `provenance.notes`, and every object with `needsReview`. Ask them to confirm or correct those.

## B. Create or edit from a description

Edit the plan JSON directly, then validate.

- New plan: start from https://github.com/hasancagrigungor/eatery-plan/blob/main/examples/plan.json as a
  structural template. Keep `coordinateSpace` in the real aspect ratio (e.g. a 15 m × 9 m room → `1000 × 600`).
  Set `realWorldScale.metersPerUnit` only when the user gave real dimensions.
- Sizes: when `metersPerUnit` is known, convert from metres using the table below. When it is not, keep sizes
  proportional to the room and other tables.
- Every edit: new ids must be unique (`table_<n>`, `zone_<name>`…), `floorId` must match the floor, `revision`
  +1, `updatedAt` = now (RFC 3339, UTC `Z`).
- Openings belong to a wall: `wallId`, `position` (0–1 centre along the wall), `width`.
- After editing: `eateryplan validate plan.json`, fix all errors, mention warnings, and render a preview if the
  renderer is available.

- Looks: give zones an `appearance.floor` (`wood_planks`, `wood_herringbone`, `tile_checker`, `tile_square`, `marble`,
  `terrazzo`, `concrete`, `carpet`, `terrace_deck`, `grass`, `stone`) and colours; tables a `material`, optional
  `tablecloth` and `tableSetting`, and a `chairStyle` (`chair`, `armchair`, `stool`, `bench`, `booth`). Walls may
  have `heightMeters`. Outdoor and climate kinds include `pergola`, `palm_tree`, `parasol`, `tree`,
  `patio_heater`, `wall_heater`, `ceiling_cassette` and `ventilation_duct`. Pergolas take `appearance.roof`
  (`slatted`, `louvered`, `glass`, `fabric`, `solid`); glass balconies are walls of kind `glass_folding` or
  `glass_sliding`, with or without a pergola. Describe what
  things are; never put drawing instructions in the plan.

| Item | Typical size |
|---|---|
| 2-person table | 0.7 × 0.7 m |
| 4-person table | 0.8 × 0.8 m (square) or ⌀ 0.9 m (round) |
| 6-person table | 1.8 × 0.9 m |
| Bar stool spacing | 0.6 m |
| Chair depth behind a table | 0.45 m |
| Main aisle | ≥ 1.2 m; between tables ≥ 0.9 m |
| Door | 0.9 m (single), 1.6 m (double) |
| Wall thickness | 0.1–0.25 m (internal), 0.25–0.4 m (external) |

## C. Validate, upgrade, live data

```bash
eateryplan validate plan.json [--json]
eateryplan migrate old-cafeplan.json plan.json
eateryplan check-state plan.json table-state.json
eateryplan check-telemetry plan.json telemetry.json
```

Errors block saving. Warnings (overlapping tables, a table blocking a door, low confidence, over capacity…)
should be shown to the user.

## D. Render

```bash
node <clone>/js/bin/render.mjs plan.json plan.html [--state table-state.json] [--telemetry telemetry.json]
```

`.svg` or `.html` output. Add `--style illustrated` for the colourful top-down illustration (floor textures, furniture
symbols, shadows, walls with 3D depth) or leave it out for the plain plan. With `--state`, tables are coloured by live status. For apps, point developers to the
renderer and React Native example in the main repository.
