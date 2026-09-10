# CG-60ST Sticker Job Builder

เว็บช่วยเตรียม Layout งานตัดสติ๊กเกอร์สำหรับ **Mimaki CG-60ST** โดยให้เว็บทำงานออกแบบ/จัดวางให้มากที่สุด แล้วใช้ CorelDRAW + FineCut เป็นขั้นตอนส่งต่อไปเครื่องตัด

## Production

`main` ใช้ V3 เป็น Production runtime แล้ว โดย GitHub Pages เปิดจาก `index.html`

branch `v3-foundation` ยังคงเป็นสายพัฒนาสำหรับตรวจสอบย้อนหลังและการแก้ไขต่อไป

## V3 ที่ทำเสร็จแล้ว

- Text only / Frame only / Text + Frame
- สร้างกรอบก่อน แล้วใส่ข้อความภายหลัง
- Quantity ระดับชุดงาน
- ลาก / Resize / Rotate / Undo / Redo / Copy / Paste / Duplicate / Delete
- Double-click แก้ข้อความตรง Canvas
- Layers + Arrange + Auto Arrange โดยไม่ย่อขนาด
- X / Y / W / H / Rotation แบบกรอกตัวเลข
- Arrow 1 mm / Shift+Arrow 10 mm
- Snap ขอบ/กึ่งกลางกระดาษและชิ้นงานอื่น พร้อม Alt เพื่อปิด Snap ชั่วคราว
- Preflight ตรวจโครงสร้าง, งานนอกกระดาษ, งานซ้อนกัน
- Export `SVG 1:1` สำหรับ workflow เดิม
- Export `ส่งไปแก้ต่อใน Corel` โดยคง SVG text และลด attribute ที่รบกวนการแก้ข้อความ
- Export `ไฟล์พร้อมตัด` แปลงข้อความเป็น Curve/Path ด้วยโครงร่างฟอนต์จริงจากเครื่องผู้ใช้บน Edge/Chrome Desktop; ถ้า Browser อ่านฟอนต์ในเครื่องไม่ได้ ระบบให้เลือกไฟล์ .ttf/.otf/.woff จากเครื่องเป็น fallback
- การสร้าง Curve/Path ประมวลผลใน Browser เท่านั้น ไม่อัปโหลดหรือฝังไฟล์ฟอนต์ลง SVG/Repository
- ไฟล์ Calibration 100×100 mm สำหรับเช็กสเกลจริงใน Corel
- Save Project เป็น `.cg60st.json`
- Open Project และรองรับ legacy V2 state ที่มี `items/placements`
- Autosave + กู้คืนงานล่าสุดหลัง Reload
- `Ctrl+S` บันทึก Project
- Generated single-file `StickerLayout-V3-Standalone.html` จาก source V3 ชุดเดียว

## Export Final

V3 มีสอง workflow หลักที่แยกชัดเจน:

1. `ส่งไปแก้ต่อใน Corel` — ข้อความยังเป็น Text เพื่อแก้คำ/ฟอนต์ต่อได้
2. `ไฟล์พร้อมตัด` — ข้อความถูกแปลงเป็น SVG Curve/Path จาก glyph outline ของฟอนต์จริงในเครื่องผู้ใช้ แล้วจึงส่ง Corel/FineCut โดยไม่ต้อง Convert to Curves ซ้ำ

สำหรับ Edge/Chrome Desktop เว็บใช้ Local Font Access API หลังผู้ใช้อนุญาตสิทธิ์อ่านฟอนต์ หาก API ใช้ไม่ได้หรือฟอนต์หาไม่เจอ ระบบจะเปิดตัวเลือกไฟล์ฟอนต์จากเครื่องเป็น fallback ข้อมูลฟอนต์ถูกอ่านเฉพาะใน Browser และไม่ถูกอัปโหลดหรือฝังลงไฟล์ผลลัพธ์

Workflow ที่แนะนำ:

1. ออกแบบ/จัด Layout ในเว็บ
2. กด `ตรวจงาน`
3. ถ้าต้องแก้ข้อความต่อ เลือก `ส่งไปแก้ต่อใน Corel`
4. ถ้าจัดงานเสร็จแล้ว เลือก `ไฟล์พร้อมตัด`
5. FineCut → Mimaki CG-60ST

## Verification อัตโนมัติ

CI ของ `v3-foundation` ตรวจ:

- JavaScript syntax
- Model V3 regression
- Geometry / set behavior
- Frame-first browser workflow
- Precision / Snap
- Corel-editable SVG structure + Preflight
- Cut Ready Curve/Path export pipeline + local font outline resolution
- Save/Open + Autosave
- Generated Standalone แบบไฟล์เดียว

## User Acceptance ที่ยังต้องทดสอบจริง

สิ่งเดียวที่ automated browser test ยืนยันแทนเครื่องบริษัทไม่ได้คือพฤติกรรมของ **CorelDRAW / FineCut / CG-60ST จริง**

Checklist อยู่ที่ `docs/V3-USER-ACCEPTANCE.md`

V3 ถูก Deploy เข้า `main` แล้ว แต่ Compatibility กับ CorelDRAW / FineCut / CG-60ST จริงยังต้องยืนยันจากเครื่องใช้งานจริงตาม checklist นี้


## UX Workspace Final

- Header แยก `ไฟล์` และ `ส่งออก` เป็นเมนูชัดเจน ลดปุ่มที่แย่งความสนใจบนแถบบน
- งานใหม่เริ่มจากกระดาษเปล่า ไม่สร้าง WAREHOUSE/EXIT ให้อัตโนมัติ และลบชิ้นงานสุดท้ายได้
- Autosave ทำงานเบื้องหลัง; การกู้คืนอยู่ในเมนู `ไฟล์` โดยผู้ใช้เป็นคนเลือก
- Sidebar ซ้าย/ขวาลากปรับความกว้างได้และจำขนาดใน Browser; double-click ตัวแบ่งเพื่อคืนค่า 300 px
- Middle mouse drag ใช้ Pan พื้นที่ทำงานแบบเครื่องมือ Diagram/CAD
- เปิดเว็บ/งานใหม่/เปิดไฟล์/พอดีหน้าจอ จัดกระดาษให้อยู่กึ่งกลาง Workspace
- Font Picker แสดงตัวอย่างฟอนต์ในรายการ และ hover จะ Preview บน Canvas ก่อนคลิกยืนยัน
- Empty state บอกทางเริ่มงานจาก `+ ข้อความ` หรือ `▭ กรอบ` โดยไม่บังคับว่าต้องมีชิ้นงานอย่างน้อย 1 ชิ้น
