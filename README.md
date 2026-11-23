# Eaterior for Claude

A Claude plugin and skill for [Eaterior](https://github.com/hasancagrigungor/eaterior), the open JSON
format for restaurant, cafe and bar floor plans.

With it, Claude can:

- turn a floor plan **image or sketch** into a validated Eaterior file
- **create** and **edit** plans from plain-language requests while keeping table ids stable
- **validate** plans, live table state and sensor data
- **render** a preview (SVG/HTML) and upgrade legacy CafePlan files

## Install in Claude Code

```
/plugin marketplace add hasancagrigungor/eaterior-claude
/plugin install eaterior@eaterior-marketplace
```

The skill uses the `eaterior` command-line tool. Claude offers to install it the first time
(`pip install "git+https://github.com/hasancagrigungor/eaterior@v1.8.0#subdirectory=python"`); previews use the
renderer from the main repository (Node.js 18+).

Update later with `/plugin update eaterior@eaterior-marketplace`.

## Install in Claude apps (claude.ai)

Download `eaterior-skill.zip` from the latest [release](https://github.com/hasancagrigungor/eaterior-claude/releases)
and upload it in the Skills settings. The archive contains the `eaterior/` skill folder.

## Try it

- "Convert this floor plan photo into an Eaterior file."
- "Create a plan for a 15 × 9 m cafe with 10 four-person tables, a bar along the back wall and a door on the left."
- "Move table A3 next to the window and add two bar stools to the counter."
- "Validate plan.json and show me a preview."

## Privacy

This plugin collects nothing and sends nothing anywhere. It contains instructions only, with no bundled code,
MCP servers or hooks. The files you work on stay where they are; Claude reads and writes them with the tools you
allow. With your permission, Claude runs two kinds of commands:

- the open-source `eaterior` CLI, installed from https://github.com/hasancagrigungor/eaterior at a pinned
  release; it runs locally and makes no network requests
- optionally, the reference renderer from the same repository (Node.js), also local

No account, API key or telemetry is involved.

## Türkçe

Bu eklenti, Claude'un [Eaterior](https://github.com/hasancagrigungor/eaterior) dosyalarını oluşturmasını,
çizim veya fotoğraftan dönüştürmesini, düzenlemesini, doğrulamasını ve önizlemesini sağlar.
Claude Code'da yukarıdaki iki komutla kurulur.

## License

[MIT](LICENSE)
