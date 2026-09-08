# V3 Editor Integration Gate

## Goal

เชื่อม `js/model-v3.js` เข้ากับ Editor โดยรักษาพฤติกรรม V2 เดิมก่อนเปิดฟังก์ชันใหม่ให้ผู้ใช้

Production `main` ยังไม่ถูกเปลี่ยน และ `index.html` ยังใช้ `js/app-v2.js`

V3 integration ใช้หน้าแยก:

```text
v3-preview.html
```

โดยโหลดตามลำดับ:

```text
js/model-v3.js
js/app-v3.js
```

## Source of Truth

`app-v3.js` เก็บ state หลักเป็น:

```text
state.project
```

ซึ่งเป็น Project schema V3 โดยตรง

Editor ไม่ใช้ `state.items` / `state.placements` แบบ V2 เป็นแหล่งข้อมูลหลักอีกต่อไป

Mapping หลัก:

- Text editor → `TextObject`
- Frame toggle เดิม → เพิ่ม/ลบ `FrameObject` ใน Design
- Quantity → `Design.qty` + `Placement[]`
- Canvas position/rotation → `Placement.transforms[objectId]`
- Layers เดิม → แสดงระดับ `Design`
- Undo/Redo → snapshot Project V3
- Copy/Paste/Duplicate → clone Design + Objects + Placement transforms
- Auto Arrange → จัดระดับ Design โดยใช้ Frame เป็น outer bounds ถ้ามี
- Export → อ่าน geometry จาก Project V3

## Scope Lock รอบนี้

ยังไม่เพิ่ม UI ใหม่:

- ไม่มีปุ่ม `เพิ่มกรอบ`
- ไม่มี Group/Ungroup UI
- ไม่มี Snap ใหม่
- ไม่มี Position X/Y/W/H UI ใหม่
- ไม่เปลี่ยน SVG compatibility strategy
- ไม่ทำ Save/Open
- ไม่เปลี่ยน Production `index.html`

เหตุผล: ต้องแยกความเสี่ยงของ Data Model integration ออกจาก UX/feature ใหม่

## Regression invariants

V3 Preview ต้องรักษาพฤติกรรมเดิมอย่างน้อย:

1. เพิ่มข้อความ
2. แก้ข้อความหลายบรรทัด
3. ปรับ Width / Height
4. Font / Bold
5. Quantity
6. เปิด/ปิดกรอบแบบเดิม
7. ปรับกรอบ / Padding / Fit frame
8. Drag Text และ Frame แยกกัน
9. Resize Text และ Frame
10. Rotate Text
11. Double-click inline edit
12. Undo / Redo
13. Copy / Paste / Duplicate
14. Delete
15. Layers reorder
16. Arrange selected
17. Auto Arrange โดยไม่ย่อขนาด
18. วางชิ้นงานนอกกระดาษได้
19. mm / cm
20. Export SVG 1:1 พฤติกรรมเดิม

## Diagnostics

`app-v3.js` เปิด diagnostic API เฉพาะสำหรับ preview/testing:

```js
__StickerV3Diagnostics.validate()
__StickerV3Diagnostics.getProject()
```

`validate()` ต้องคืน `ok: true` หลัง operation ปกติ

## Verification status

### EXECUTED

- `node --check` สำหรับ source `app-v3.js` ผ่านก่อนอัปโหลด
- Model V3 tests จาก Phase 1 เคยรันผ่าน 8/8 ก่อน Integration

### STATICALLY VERIFIED

- `v3-preview.html` โหลด `model-v3.js` ก่อน `app-v3.js`
- V3 Preview ไม่โหลด `app-v2.js`
- `app-v3.js` ใช้ Project V3 เป็น state หลัก
- `main` production runtime ไม่ถูกเปลี่ยน

### NOT VERIFIED YET

ยังไม่ได้รัน Browser regression แบบ interactive บน Corel/company PC ดังนั้นยังไม่อนุญาตให้สลับ `index.html` ไป V3 หรือ merge เข้า `main`

## Promotion Gate

ก่อนเปลี่ยน Production ต้องผ่าน:

1. เปิด `v3-preview.html` ใน Browser จริง
2. ทดสอบ regression invariants 1–20
3. `__StickerV3Diagnostics.validate().ok === true`
4. Export ตัวอย่างแล้ว geometry ไม่เปลี่ยนจาก V2 โดยไม่ตั้งใจ
5. ไม่มี blocker bug

เมื่อผ่านทั้งหมดจึงค่อยเปิด Phase ถัดไป: Frame Object แบบอิสระใน UI


## Precision / Snap phase

V3 Preview เพิ่มเครื่องมือความแม่นยำโดยไม่เปลี่ยน Production `main`:

- X / Y / W / H / Rotation สำหรับสิ่งที่เลือก
- เมื่อเลือก Frame ที่มี Text: X / Y / Rotation ย้ายทั้งชุด แต่ W / H ปรับ Frame เท่านั้น
- Arrow = 1 mm, Shift+Arrow = 10 mm
- Snap ไปที่ขอบ/กึ่งกลางกระดาษและชิ้นงานอื่น
- Text ภายใน Frame สามารถ Snap กับ Frame เดียวกันได้
- Alt ขณะลากปิด Snap ชั่วคราว
- Snap guide เป็น UI-only state ไม่บันทึกลง Project schema
- การกรอก W/H ใช้ shared-object resize ที่รักษา anchor ของทุก Quantity

Regression gate ของ phase นี้ต้องรัน Model tests, Geometry tests และ Browser suite (`v3-browser-smoke`, `v3-design-behavior`, `v3-precision`) พร้อมกันก่อนถือว่าผ่าน
