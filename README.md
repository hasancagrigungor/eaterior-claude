# Eatery Plan for Claude

A Claude plugin and skill for [Eatery Plan](https://github.com/hasancagrigungor/eatery-plan), the open JSON
format for restaurant, cafe and bar floor plans.

With it, Claude can:

- turn a floor plan **image or sketch** into a validated Eatery Plan file
- **create** and **edit** plans from plain-language requests while keeping table ids stable
- **validate** plans, live table state and sensor data
- **render** a preview (SVG/HTML) and upgrade legacy CafePlan files

## Install in Claude Code

```
/plugin marketplace add hasancagrigungor/eatery-plan-claude
/plugin install eatery-plan@eatery-plan-marketplace
```

The skill uses the `eateryplan` command-line tool. Claude offers to install it the first time
(`pip install "git+https://github.com/hasancagrigungor/eatery-plan@v1.3.0#subdirectory=python"`); previews use the
renderer from the main repository (Node.js 18+).

Update later with `/plugin update eatery-plan@eatery-plan-marketplace`.

## Install in Claude apps (claude.ai)

Download `eatery-plan-skill.zip` from the latest [release](https://github.com/hasancagrigungor/eatery-plan-claude/releases)
and upload it in the Skills settings. The archive contains the `eatery-plan/` skill folder.

## Try it

- "Convert this floor plan photo into an Eatery Plan file."
- "Create a plan for a 15 × 9 m cafe with 10 four-person tables, a bar along the back wall and a door on the left."
- "Move table A3 next to the window and add two bar stools to the counter."
- "Validate plan.json and show me a preview."

## Privacy

This plugin collects nothing and sends nothing anywhere. It contains instructions only, with no bundled code,
MCP servers or hooks. The files you work on stay where they are; Claude reads and writes them with the tools you
allow. With your permission, Claude runs two kinds of commands:

- the open-source `eateryplan` CLI, installed from https://github.com/hasancagrigungor/eatery-plan at a pinned
  release; it runs locally and makes no network requests
- optionally, the reference renderer from the same repository (Node.js), also local

No account, API key or telemetry is involved.

## Türkçe

Bu eklenti, Claude'un [Eatery Plan](https://github.com/hasancagrigungor/eatery-plan) dosyalarını oluşturmasını,
çizim veya fotoğraftan dönüştürmesini, düzenlemesini, doğrulamasını ve önizlemesini sağlar.
Claude Code'da yukarıdaki iki komutla kurulur.

## License

[MIT](LICENSE)
