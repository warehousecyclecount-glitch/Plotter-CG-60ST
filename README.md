เว็บตัดสติกเกอร์ ห้ามเข้ามายุ่งเด็ดขาด
# CG-60ST Sticker Job Builder — V1

เว็บช่วยเตรียมงานตัดสติ๊กเกอร์ตัวอักษรสำหรับ workflow ที่ใช้ **Mimaki CG-60ST** โดยออกแบบให้เว็บไม่ต้องเชื่อม Driver หรือพอร์ตของเครื่องโดยตรง เหมาะกับคอมบริษัทที่มีข้อจำกัดการติดตั้งโปรแกรมเพิ่ม

## สิ่งที่มีใน V1

- เครื่องหลักล็อกเป็น Mimaki CG-60ST
- กำหนดวัสดุแบบ Roll / Sheet และขนาดเป็น mm
- พื้นที่ตัดอ้างอิง 586 mm และ Safe Area บน Canvas
- พิมพ์ข้อความ เลือก Font / Bold / ความสูงจริง / จำนวน / Gap / Mirror
- Auto Arrange เลือก 0° หรือ 90° เพื่อใช้ความยาววัสดุน้อยลง
- Canvas หน่วย mm พร้อมลากชิ้นงานและแก้ X/Y รายชิ้น
- Material Profile: CUT1–CUT5, Speed, Press, Offset (ผู้ใช้กรอกค่าจริงเอง)
- Preflight ตรวจขนาดวัสดุ พื้นที่ตัด ข้อความ และสถานะ Font
- Export SVG ขนาด 1:1
- ดาวน์โหลด Job Sheet (.txt)
- บันทึก/เปิดโปรเจกต์เป็น `.cg60st.json`
- Troubleshooting Assistant สำหรับ:
  - ขนาดตัดไม่ตรง + คำนวณ DIST.COMP
  - ตัดยาวแล้วเบี้ยว
  - ตัดไม่ขาด
  - ตัดลึก/ทะลุ
  - มุมตัวอักษรผิด
  - งานอยู่ผิดตำแหน่ง
  - OFF SCALE

## วิธีใช้

เปิด `index.html` ด้วย Browser ได้ทันที หรือ deploy เป็น Static Site / GitHub Pages

1. กำหนดขนาดวัสดุ
2. กรอกข้อความและขนาดตัวอักษร
3. กด **จัด Layout อัตโนมัติ**
4. ปรับตำแหน่งบน Canvas หากต้องการ
5. ใส่ Material Profile ที่ใช้งานจริง
6. กด **ตรวจงาน / Export**
7. Export SVG 1:1
8. เปิด SVG ใน CorelDRAW / FineCut ตาม workflow เดิมของบริษัท

## ข้อจำกัดสำคัญของ V1

SVG V1 ยังเก็บข้อความเป็น SVG `<text>` และ **ยังไม่ Convert Font เป็น Curve/Outline อัตโนมัติ** ดังนั้นก่อนส่งตัดควร Convert to Curves/Outline ใน CorelDRAW หากคอมปลายทางไม่มี Font เดียวกัน

ค่าประเภท Speed / Press / Offset ไม่มี Default ที่ระบบเดาให้ ผู้ใช้ต้องบันทึกค่าที่ทดสอบแล้วกับวัสดุและใบมีดจริง

## โครงสร้าง

```text
index.html
css/app.css
js/app.js
README.md
```

## แนวทาง V2

- Convert text → vector path ใน Browser
- เพิ่มหลาย Text Job ใน Canvas เดียว
- Nesting ที่ซับซ้อนขึ้น
- Export PDF/SVG พร้อม Job metadata
- Calibration history แยกตามวัสดุ/ใบมีด
