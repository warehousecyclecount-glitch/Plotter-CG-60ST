# V3 Design / “ชุดงาน” Behavior

## Goal

ให้ `Design` เป็นหน่วยงานผลิตที่ผู้ใช้เข้าใจง่ายว่าเป็น “ชุด” โดยไม่ต้องเรียนศัพท์ Group/Ungroup แต่ยังสามารถปรับ Text และ Frame ภายในได้เมื่อจำเป็น

## User-facing rule

### Text only
- ลากข้อความ = ย้ายงาน
- หมุนข้อความ = หมุนงาน
- Resize = เปลี่ยนขนาดข้อความ

### Frame only
- ลากกรอบ = ย้ายงาน
- หมุนกรอบ = หมุนงาน
- Resize = เปลี่ยนขนาดกรอบ

### Text + Frame
กรอบทำหน้าที่เป็น container ของป้าย:
- ลากกรอบ = ย้ายทั้ง Text + Frame
- หมุนกรอบ = หมุนทั้ง Text + Frame โดยรักษาตำแหน่งสัมพัทธ์
- ลากข้อความ = ปรับตำแหน่งข้อความภายในกรอบ
- หมุนข้อความ = ปรับเฉพาะข้อความ
- Resize Frame = เปลี่ยนเฉพาะขนาดกรอบ
- Resize Text = เปลี่ยนเฉพาะขนาดข้อความ

ผู้ใช้จึงไม่ต้องมีปุ่ม Group/Ungroup ใน workflow ปกติ

## Arrange rule

`Auto Arrange` และคำสั่งจัดตำแหน่งกับกระดาษต้องทำงานระดับ Placement ทั้งชุด:
- ย้ายทุก object ใน Placement ด้วย delta เดียวกัน
- ไม่จัด Text กลับเข้ากลาง Frame เอง
- ไม่ลบ offset ที่ผู้ใช้ตั้งไว้
- ไม่เปลี่ยน rotation โดยไม่ขอ

การจัดข้อความเข้ากลางกรอบเป็นคำสั่งแยก:

> จัดข้อความกลางกรอบ

เพราะการจัดกระดาษกับการจัดองค์ประกอบภายในป้ายเป็นคนละหน้าที่

## Quantity rule

Object content/size เป็นของ Design และใช้ร่วมกันทุก copy

Placement เป็นตำแหน่งจริงของแต่ละ copy ดังนั้น:
- เปลี่ยนข้อความ / Font / Width / Height = ทุก copy ใช้ geometry เดียวกัน
- Move Placement = กระทบ copy ที่เลือกเท่านั้น
- Auto Arrange = จัดแต่ละ copy แต่ไม่เปลี่ยน layout ภายใน Design
- การสร้าง copy ใหม่ต้องรักษา layout Text/Frame ของต้นฉบับ ไม่ควรสร้าง relative geometry ใหม่แบบสุ่ม

## Resize invariant

เนื่องจาก object size ใช้ร่วมกันทุก Quantity การลาก Resize จากมุมใดมุมหนึ่งต้องใช้ anchor rule เดียวกันทุก Placement ของ Design

ตัวอย่าง Resize จากด้านซ้าย:
- Width ใหม่ใช้กับทุก copy
- X ของ object ชนิดเดียวกันในทุก Placement ต้องขยับด้วย delta เดียวกัน เพื่อให้ขอบขวายังคงเป็น anchor แบบเดียวกัน

ห้ามเกิดกรณี copy ที่เลือกยึดขอบขวา แต่ copy อื่นยึดขอบซ้ายโดยไม่ตั้งใจ

## Geometry layer

`js/design-ops-v3.js` รับผิดชอบ geometry ระดับ Placement:
- rotated bounds
- translate placement
- move placement by bounds
- rotate placement แบบ rigid
- copy placement geometry
- center text in frame

แยกจาก `model-v3.js` เพื่อไม่ให้ persistence/schema ปนกับ interaction geometry

## Promotion gate

ก่อนใช้ behavior นี้กับ Production ต้องผ่าน:
1. Node geometry tests
2. existing V3 model tests
3. Browser smoke: frame-first workflow
4. Browser smoke: drag frame moves whole Text+Frame
5. Browser smoke: text can still move independently inside Frame
6. Auto Arrange preserves internal Text/Frame offset
7. Resize anchor consistency across Quantity
8. `validateProject().ok === true`

Production `main` ยังไม่เปลี่ยนจนกว่า gate เหล่านี้ผ่าน
