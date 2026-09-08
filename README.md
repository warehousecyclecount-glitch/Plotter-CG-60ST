# CG-60ST Sticker Job Builder

เว็บช่วยเตรียม Layout งานตัดสติ๊กเกอร์สำหรับ workflow ที่ใช้ **Mimaki CG-60ST** โดยให้เว็บรับผิดชอบการสร้าง/จัดวางงาน และใช้ CorelDRAW / FineCut เป็นขั้นตอนต่อก่อนส่งไปเครื่องตัด

## Production runtime ปัจจุบัน

`main` ยังใช้ V2 และยังไม่ถูกเปลี่ยนโดยงาน V3

ไฟล์ที่เป็น runtime ปัจจุบัน:

```text
index.html
css/app.css
css/enhancements.css
js/app-v2.js
```

`js/app.js` เป็น implementation เก่าที่ไม่ได้ถูก `index.html` เรียกใช้งานแล้ว

`StickerLayout-Standalone.html` เป็นไฟล์ใช้งานแบบ HTML ไฟล์เดียวสำหรับกรณีที่ไม่ต้องการโฟลเดอร์ `css/` และ `js/`

## ความสามารถของ V2 ปัจจุบัน

- กำหนดขนาดกระดาษและสลับหน่วย mm / cm
- หลายข้อความใน Canvas เดียว
- ข้อความหลายบรรทัด
- Font / Normal / Bold
- กำหนด Width / Height / Quantity
- กรอบแบบผูกกับข้อความ
- ลากข้อความและกรอบ
- Resize / Rotate
- Double-click แก้ข้อความบน Canvas
- Undo / Redo / Copy / Paste / Duplicate / Delete
- Layers / Arrange
- Auto Arrange โดยไม่ย่อชิ้นงานเอง
- วางชิ้นงานนอกกระดาษเป็นพื้นที่พักได้
- Export SVG 1:1

## ข้อจำกัดสำคัญของ V2

โครงสร้างข้อมูล V2 ยังเป็นแบบ **Text-first**: กรอบเป็น property ของข้อความ และ placement หนึ่งตัวเก็บทั้งตำแหน่งข้อความกับตำแหน่งกรอบไว้ด้วยกัน

จึงยังไม่เหมาะกับ workflow ที่ต้องการ:
- สร้างกรอบก่อนข้อความ
- มีกรอบอย่างเดียว
- รวมข้อความ + กรอบเป็นหนึ่งชุดงานอย่างเป็นระบบ
- ให้ Quantity / Auto Arrange ทำงานระดับชุดงาน

SVG Export ปัจจุบันยังใช้ SVG `<text>` / `<tspan>` และยังไม่ได้ผ่าน Compatibility Gate กับ CorelDRAW สำหรับ requirement “เปิดแล้วแก้ข้อความต่อได้อย่างแน่นอน” ดังนั้นยังไม่ถือเป็น Cut Ready Path/Curve

## V3 Foundation

งาน V3 พัฒนาใน branch:

```text
v3-foundation
```

รอบ Phase 0 + Phase 1 มีเฉพาะ foundation และยังไม่เปลี่ยน UI production

เพิ่ม:

```text
js/model-v3.js
tests/model-v3.test.js
docs/V3-BASELINE.md
docs/V3-DATA-MODEL.md
```

Data Model V3 แยกเป็น:

```text
Project
├── Objects
│   ├── Text
│   └── Frame
├── Designs
└── Placements
```

จุดประสงค์คือรองรับได้อย่างถูกต้องทั้ง:
- Text only
- Frame only
- Text + Frame
- หลาย Placement ของ Design เดียว

มี migration layer สำหรับแปลง state จาก V2 → V3 และ adapter V3 → V2 สำหรับ regression/parity test ระหว่างช่วงเปลี่ยนระบบ

## Test

Model test รันด้วย Node:

```bash
node tests/model-v3.test.js
```

ครอบคลุม:
- schema/defaults
- V2 → V3 migration
- text + frame แยกเป็น object จริง
- roundtrip geometry กลับรูปแบบ V2
- frame-only design
- เพิ่ม frame ให้ text ภายหลัง
- quantity โดยไม่ทำตำแหน่งเดิมหาย
- validation ของ reference ที่เสีย

## Development rule

ห้ามสลับ production runtime จาก V2 ไป V3 จนกว่า migration/integration regression จะผ่านก่อน

ลำดับงานต่อจาก foundation:

1. Integrate V3 model เข้ากับ editor โดยรักษาพฤติกรรม V2
2. เพิ่ม Frame object แบบอิสระใน UI
3. ทำ Text + Frame workflow / “ชุด”
4. Snap / Position controls
5. Auto Arrange ระดับ Design
6. CorelDRAW compatibility gate
7. Save/Open + Autosave
8. Preflight
9. Generate Standalone จาก source เดียว

รายละเอียด safety baseline และ invariants ดูที่ `docs/V3-BASELINE.md` และ `docs/V3-DATA-MODEL.md`
