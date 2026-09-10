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
- ไฟล์ Calibration 100×100 mm สำหรับเช็กสเกลจริงใน Corel
- Save Project เป็น `.cg60st.json`
- Open Project และรองรับ legacy V2 state ที่มี `items/placements`
- Autosave + กู้คืนงานล่าสุดหลัง Reload
- `Ctrl+S` บันทึก Project
- Generated single-file `StickerLayout-V3-Standalone.html` จาก source V3 ชุดเดียว

## สิ่งที่ตั้งใจไม่ทำแบบเดาสุ่ม

V3 ยัง **ไม่เรียกไฟล์ข้อความว่า Cut Ready Curve/Path** เพราะ Browser ไม่สามารถดึง glyph outline ของ Arial/Tahoma/Verdana/Impact จาก system font ออกมาเป็น path ได้อย่างถูกต้องโดยไม่มี font outline source จริง และไม่ควรฝังไฟล์ฟอนต์ proprietary ลง repo

ดังนั้น workflow ที่ปลอดภัยตอนนี้คือ:

1. ออกแบบ/จัด Layout ในเว็บ
2. ใช้ `ส่งไปแก้ต่อใน Corel` ถ้าต้องแก้ข้อความต่อ
3. ตรวจขนาดด้วย Calibration 100 mm
4. Convert to Curves ใน Corel ก่อน FineCut เมื่อจำเป็น
5. FineCut → Mimaki CG-60ST

## Verification อัตโนมัติ

CI ของ `v3-foundation` ตรวจ:

- JavaScript syntax
- Model V3 regression
- Geometry / set behavior
- Frame-first browser workflow
- Precision / Snap
- Corel-editable SVG structure + Preflight
- Save/Open + Autosave
- Generated Standalone แบบไฟล์เดียว

## User Acceptance ที่ยังต้องทดสอบจริง

สิ่งเดียวที่ automated browser test ยืนยันแทนเครื่องบริษัทไม่ได้คือพฤติกรรมของ **CorelDRAW / FineCut / CG-60ST จริง**

Checklist อยู่ที่ `docs/V3-USER-ACCEPTANCE.md`

V3 ถูก Deploy เข้า `main` แล้ว แต่ Compatibility กับ CorelDRAW / FineCut / CG-60ST จริงยังต้องยืนยันจากเครื่องใช้งานจริงตาม checklist นี้
