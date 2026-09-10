# CG-60ST Sticker Job Builder

เว็บช่วยเตรียม Layout งานตัดสติ๊กเกอร์สำหรับ **Mimaki CG-60ST** โดยให้เว็บทำงานออกแบบ/จัดวางให้มากที่สุด แล้วใช้ CorelDRAW + FineCut เป็นขั้นตอนส่งต่อไปเครื่องตัด

## Production

- **GitHub repository** ใช้เก็บ Source Code และ Version Control
- **Cloudflare Pages** เป็น Production ที่ผู้ใช้เปิดใช้งานจริง
- Production URL: `https://plotter-cg-60st.pages.dev/`
- Cloudflare Pages ดึง Production จาก branch `main`
- V4 Canvas Interaction ถูก Promote เข้า `main` แล้ว
- Hotfix การคลิก/ลากกรอบหลัง Promote ถูก Merge เข้า Production แล้วที่ commit `3a6e651e2ba014204f87253f102ff5ec411d054e`
- หลัง Hotfix: **V3 Production CI ผ่าน** และ **GitHub Pages build/deployment ผ่าน**

GitHub Pages ไม่ใช่ Production หลักของโปรเจกต์นี้

## V3/V4 ที่ทำเสร็จแล้ว

- Text only / Frame only / Text + Frame
- สร้างกรอบก่อน แล้วใส่ข้อความภายหลัง
- Quantity ระดับชุดงาน
- ลาก / Resize / Rotate / Undo / Redo / Copy / Paste / Duplicate / Delete
- ลบชิ้นงานสุดท้ายได้ และงานใหม่เริ่มจากกระดาษเปล่า
- Double-click แก้ข้อความตรง Canvas
- Layers + Arrange + Auto Arrange โดยไม่ย่อขนาด
- X / Y / W / H / Rotation แบบกรอกตัวเลข
- Arrow 1 mm / Shift+Arrow 10 mm
- Snap ขอบ/กึ่งกลางกระดาษและชิ้นงานอื่น พร้อม Alt เพื่อปิด Snap ชั่วคราว
- Middle mouse drag และ Space + drag สำหรับ Pan พื้นที่ทำงาน
- Sidebar ซ้าย/ขวาปรับความกว้างได้และจำค่าล่าสุดใน Browser
- เปิดเว็บ / งานใหม่ / เปิดไฟล์ / พอดีหน้าจอ แล้วกระดาษอยู่กึ่งกลาง Workspace
- Font Picker แสดงตัวอย่างฟอนต์ และ Hover Preview บน Canvas ก่อนเลือกจริง
- Preflight ตรวจโครงสร้าง, งานนอกกระดาษ, งานซ้อนกัน
- Export `SVG 1:1` สำหรับ workflow เดิม
- Export `ส่งไปแก้ต่อใน Corel` โดยคง SVG text และลด attribute ที่รบกวนการแก้ข้อความ
- Export `ไฟล์พร้อมตัด` แปลงข้อความเป็น Curve/Path ด้วยโครงร่างฟอนต์จริงจากเครื่องผู้ใช้บน Edge/Chrome Desktop; ถ้า Browser อ่านฟอนต์ในเครื่องไม่ได้ ระบบให้เลือกไฟล์ .ttf/.otf/.woff จากเครื่องเป็น fallback
- การสร้าง Curve/Path ประมวลผลใน Browser เท่านั้น ไม่อัปโหลดหรือฝังไฟล์ฟอนต์ลง SVG/Repository
- ไฟล์ Calibration 100×100 mm สำหรับเช็กสเกลจริงใน Corel
- Save Project เป็น `.cg60st.json`
- Open Project และรองรับ legacy V2 state ที่มี `items/placements`
- Autosave ทำงานเบื้องหลัง และผู้ใช้เลือก `กู้คืนงานล่าสุด` จากเมนู `ไฟล์` เมื่อต้องการ
- `Ctrl+S` ดาวน์โหลด Project
- Generated single-file `StickerLayout-V3-Standalone.html` จาก source ชุดเดียว

## V4 Canvas Interaction

V4 เพิ่มพฤติกรรม Canvas ให้ใกล้เครื่องมือออกแบบที่ผู้ใช้คุ้นเคย โดยยังคง workflow งานตัดเดิม:

- 8 resize handles
- Multi-select / Marquee select
- Shift / Ctrl / Alt modifiers ระหว่างลากและ Resize
- Object locking
- Right-click context menu
- Zoom / Pan
- Rulers และ draggable guides
- Aspect-ratio locking
- Floating selection toolbar
- Smart Guide / equal-spacing hints
- Keyboard-shortcut panel

หลัง Promote พบ regression ที่ Floating Toolbar สามารถซ้อนทับขอบกรอบเมื่อเลือกข้อความด้านใน ทำให้ Pointer ไปตกที่ Toolbar แทน Frame จุดนี้แก้แล้วโดยวาง Toolbar อ้างอิงขอบเขตของ **ทั้ง Placement (Frame + Text)** และเอา `frame-hit` overlay ที่ซ้ำซ้อนออก จากนั้นรัน Focused Regression และ Full Browser Regression ผ่านก่อน Merge เข้า `main`

## UX Workspace

Header จัดกลุ่มงานตามความหมายแทนการวางทุกปุ่มไว้ในระดับเดียวกัน:

- `ไฟล์` — งานใหม่, เปิดไฟล์งาน, ดาวน์โหลดไฟล์งาน, กู้คืน Autosave
- `ตรวจงาน` — Preflight ก่อนส่งออก
- `ส่งออก` — ไฟล์พร้อมตัด, แก้ต่อใน Corel, SVG 1:1, Calibration 100 mm

เมื่อ Project ว่าง ระบบแสดง Empty State พร้อม `+ ข้อความ` และ `▭ กรอบ` โดยไม่สร้างตัวอย่าง WAREHOUSE/EXIT ให้อัตโนมัติ

## Export Final

มีสอง workflow หลักที่แยกชัดเจน:

1. `ส่งไปแก้ต่อใน Corel` — ข้อความยังเป็น Text เพื่อแก้คำ/ฟอนต์ต่อได้
2. `ไฟล์พร้อมตัด` — ข้อความถูกแปลงเป็น SVG Curve/Path จาก glyph outline ของฟอนต์จริงในเครื่องผู้ใช้ แล้วจึงส่ง Corel/FineCut โดยไม่ต้อง Convert to Curves ซ้ำ

สำหรับ Edge/Chrome Desktop เว็บใช้ Local Font Access API หลังผู้ใช้อนุญาตสิทธิ์อ่านฟอนต์ หาก API ใช้ไม่ได้หรือฟอนต์หาไม่เจอ ระบบจะเปิดตัวเลือกไฟล์ฟอนต์จากเครื่องเป็น fallback ข้อมูลฟอนต์ถูกอ่านเฉพาะใน Browser และไม่ถูกอัปโหลดหรือฝังลงไฟล์ผลลัพธ์

Workflow ที่แนะนำ:

1. ตั้งขนาดกระดาษ
2. เพิ่มข้อความหรือกรอบ
3. จัด Layout ในเว็บ
4. กด `ตรวจงาน`
5. ถ้าต้องแก้ข้อความต่อ เลือก `ส่งออก → แก้ต่อใน Corel`
6. ถ้าจัดงานเสร็จแล้ว เลือก `ส่งออก → ไฟล์พร้อมตัด`
7. FineCut → Mimaki CG-60ST

## Verification อัตโนมัติ

Production CI ตรวจ:

- JavaScript syntax
- Model V3 regression
- Geometry / set behavior
- Frame-first browser workflow
- Text + Frame behavior
- Precision / Snap
- Corel-editable SVG structure + Preflight
- Cut Ready Curve/Path export pipeline + local font outline resolution
- Save/Open + explicit Autosave recovery
- UX empty project / centered canvas
- Sidebar resize
- Middle-mouse / Space Pan
- Font Hover Preview
- Generated Standalone แบบไฟล์เดียว
- V4 8-point resize / selection / locking / context menu / zoom / rulers / guides / floating toolbar / shortcut interactions

## สิ่งที่ยังต้องทดสอบจริง

Automated browser tests ตรวจระบบเว็บได้ แต่ไม่สามารถแทนการทดสอบ **CorelDRAW / FineCut / CG-60ST จริง** บนเครื่องบริษัทได้

Checklist อยู่ที่ `docs/V3-USER-ACCEPTANCE.md`

สิ่งที่ยังต้องยืนยันจากเครื่องจริง:

- Calibration 100×100 mm เข้า CorelDRAW แล้วยังเป็น 100×100 mm
- `แก้ต่อใน Corel` ยังแก้ข้อความได้ตาม CorelDRAW เวอร์ชันของบริษัท
- ฟอนต์ไม่ถูกแทนแบบที่ทำให้ขนาดงานเปลี่ยน
- `ไฟล์พร้อมตัด` เข้า FineCut แล้วเส้น/Path ครบ
- ขนาดงานจริงหลังตัดตรงกับไฟล์
- Frame/เส้นช่วยแกะและตัวอักษรถูกตัดครบ

ถ้าผลบนเครื่องจริงต่างจาก Browser Preview ให้เก็บค่าที่เห็นจริงและแก้จาก Runtime Evidence แทนการเดา
