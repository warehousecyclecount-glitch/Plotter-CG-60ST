# V3 Safety Baseline

Branch: `v3-foundation`

## Scope lock for this round

Only Phase 0 and Phase 1 are allowed in this branch iteration.

Allowed:
- establish a regression baseline from the current V2 behavior
- define the V3 project/data model
- add migration/compatibility helpers from the current V2 state
- add model-level automated tests
- document risks, invariants, and the next integration gate

Not allowed in this round:
- redesign the visible UI
- change export behavior
- change Auto Arrange behavior
- add snapping
- add Save/Open UI
- add Preflight UI
- change the production `main` branch

## Current runtime source of truth

The current production page loads:
- `index.html`
- `css/app.css`
- `css/enhancements.css`
- `js/app-v2.js`

`js/app.js` is an older implementation and is not the active runtime source.

`StickerLayout-Standalone.html` is a generated/copy-style standalone deliverable and must not become a second independently maintained source of truth.

## Existing behavior that must not regress during V3 integration

1. Paper width/height and mm/cm switching
2. Multi-line text
3. Font family and normal/bold weight
4. Quantity / multiple placements
5. Optional frame around a text item
6. Independent drag of text and frame in the current V2 behavior
7. Resize handles
8. Rotation of text placements
9. Double-click / Enter inline text editing
10. Undo / Redo
11. Copy / Paste / Duplicate / Delete
12. Layers list and layer reordering
13. Arrange controls
14. Auto Arrange must not silently shrink content
15. Off-paper workspace for temporary staging
16. Dimension labels
17. SVG 1:1 export remains unchanged until the dedicated Corel compatibility phase

## V2 architectural constraint being removed

V2 stores one `item` as a text-first record with frame fields embedded in the same object. A placement also stores `textX/textY` and `frameX/frameY` in one record.

This design cannot cleanly support the real workflow where:
- a frame may exist before any text
- a frame may exist without text
- text and frame may later be combined into one production design
- quantity should duplicate a design/placement rather than duplicate unrelated layers

V3 therefore separates Project → Designs → Objects → Placements.

## Integration gate

The V3 model must not replace the active V2 runtime until all of these are true:
- model tests pass
- V2 → V3 migration preserves current geometry
- V3 can represent text-only, frame-only, and text+frame designs
- quantity changes preserve existing placement transforms
- broken references are detected by validation
- a V3 → legacy adapter can reproduce the current editable V2 shape for compatibility testing

After that, integration into the editor will happen as a separate reviewed change.
