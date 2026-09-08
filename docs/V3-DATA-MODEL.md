# V3 Data Model

## Design goal

The model must represent the real production workflow without forcing the UI to expose technical concepts.

A user may create:
1. text only
2. frame only
3. text + frame
4. multiple copies of the same design

The UI can call a design a “ชุด” while the data layer uses `design` internally.

## Schema

```text
Project
├── paper
├── layout
├── objects[]
│   ├── text
│   └── frame
├── designs[]
│   └── objectIds[]
└── placements[]
    └── transforms[objectId]
```

### Project

Persistent project-level settings:
- `schemaVersion`
- `meta`
- `unit`
- `paper`
- `layout`
- `objects`
- `designs`
- `placements`

UI-only state such as selected object, open tab, mouse position, history stack, and inline-editor focus does not belong in the persistent project model.

### Object

An object is actual editable content.

Text object:
```json
{
  "id": "obj-1",
  "type": "text",
  "text": "WAREHOUSE",
  "font": { "family": "Arial", "weight": "700" },
  "size": { "w": 200, "h": 50 },
  "visible": true
}
```

Frame object:
```json
{
  "id": "obj-2",
  "type": "frame",
  "size": { "w": 220, "h": 70 },
  "visible": true
}
```

A frame does not require a text object.

### Design

A design is the production unit that quantity and future Auto Arrange should operate on.

```json
{
  "id": "design-1",
  "name": "WAREHOUSE",
  "objectIds": ["obj-1", "obj-2"],
  "qty": 10,
  "padding": { "x": 10, "y": 10 },
  "visible": true
}
```

Examples:
- text only: one text object
- frame only: one frame object
- text + frame: both objects in the same design

### Placement

A placement is one physical copy of a design on the workspace.

```json
{
  "id": "pl-1",
  "designId": "design-1",
  "copy": 0,
  "transforms": {
    "obj-1": { "x": 20, "y": 20, "rotation": 0 },
    "obj-2": { "x": 10, "y": 10, "rotation": 0 }
  }
}
```

Object size is shared by the design while placement position/rotation is per copy. This matches the current behavior where resizing a text item changes all copies, while each copy can have its own position.

## Why transforms are stored per object inside a placement

The V2 editor allows text and frame positions to differ. Preserving that ability during migration is important.

A single design-level X/Y would lose the existing geometry. Therefore each placement stores one transform per object.

Later, when the UX introduces “รวมเป็นชุด”, the editor can move all object transforms together without changing this schema.

## Quantity rule

`design.qty` is the requested production count.

`ensurePlacements()` must:
- create missing copies
- preserve existing placement transforms
- remove extra placements when quantity decreases
- never silently resize the design

## Migration rule from V2

For each V2 `item`:
- create one text object
- create a frame object only when `item.frame === true`
- create one design containing those object IDs
- copy `qty` to the design
- copy `padX/padY` to design padding

For each V2 placement:
- `textX/textY/rotation` → text transform
- `frameX/frameY` → frame transform

The V3 model also provides a V3 → legacy adapter strictly for parity and regression testing during migration.

## Validation invariants

A valid V3 project must satisfy:
- schema version is supported
- paper width/height > 0
- object IDs are unique
- design IDs are unique
- every design object reference exists
- quantity >= 1
- every placement references an existing design
- every placement has transforms for all objects in that design
- no duplicate `designId + copy` placement pair

## Explicit non-goals for Phase 1

Phase 1 does not decide:
- CorelDRAW SVG compatibility
- text-to-path conversion
- machine cutting conditions
- 586 mm machine-area enforcement
- snapping behavior
- final UI terminology or layout

Those require separate evidence and integration testing.
