## Coin Detector (FastAPI + YOLO)

สรุปสั้น ๆ
- เว็บ UI สำหรับตรวจจับเหรียญ (Single capture / Realtime) ใช้ FastAPI เป็น backend และโมเดล YOLO (Ultralytics) สำหรับการทำนาย

Checklist (สิ่งที่ไฟล์นี้ครอบคลุม)
- การติดตั้ง dependencies
- การรันเซิร์ฟเวอร์ (development)
- การใช้งาน UI (single / realtime)
- แก้ไข PREDICT_URL / พาธโมเดล

ไฟล์สำคัญ
- `main.py` — FastAPI app ที่ serve หน้า `static/index.html` และ endpoint `/predict`
- `static/index.html` — หน้า UI (เพื่อทดสอบในเบราว์เซอร์)
- `static/style.css`, `static/script.js` — CSS และ JavaScript ของ UI
- `static/assets/` — รูปภาพหรือ asset อื่นๆ
- โมเดล: โดยค่าเริ่มต้น `main.py` โหลดจาก `runs/detect/train/weights/best.pt` (แก้ไขได้)

ความต้องการระบบ (แนะนำ)
- Python 3.9+ (ใช้เวอร์ชันที่ติดตั้งแพ็กเกจ ultralytics ได้)

ติดตั้ง dependencies
1. สร้าง virtualenv แล้ว activate (แนะนำ):

```bash
python -m venv .venv
source .venv/Scripts/activate  # Windows (bash.exe)
```

2. ติดตั้งแพ็กเกจ

```bash
pip install -r requirements.txt
```

รันเซิร์ฟเวอร์ (development)

```bash
uvicorn main:app --reload --port 8000
```

แล้วเปิดเบราว์เซอร์ไปที่:

- http://localhost:8000/  (หน้า UI)

การใช้งาน UI เบื้องต้น
- โหมด Single Capture: เลือก `Single Capture` → กด `เลือกภาพ` → เลือกรูป → กด `ประมวลผล` เพื่อส่งไปยัง `/predict`
- โหมด Realtime Background: เลือก `Realtime Background` → กด `Start` เพื่อเปิดกล้อง (ต้องอนุญาตกล้อง) → ระบบจะจับภาพทุก 3 วินาทีแล้วส่งไป `/predict`
- ปุ่ม `ยกเลิกโหมด` จะหยุดกระบวนการและรีเซ็ตหน้าให้เป็นค่าเริ่มต้น

ปรับแต่ง
- เปลี่ยนพาธโมเดลใน `main.py` ถ้าต้องการใช้ไฟล์ `.pt` อื่น
  - ตัวอย่าง: `model = YOLO("yolov8n.pt")` หรือพาธไปยัง `runs/detect/.../best.pt`
- ถ้า UI อยู่ที่โดเมนอื่นหรือรันแยก ให้แก้ `PREDICT_URL` ใน `static/app.js` ให้ชี้มายัง endpoint ที่ถูกต้อง

ข้อสังเกต / Troubleshooting
- 404 บน `/static/style.css` หรือ `/static/app.js`: ตรวจสอบว่า `main.py` มี `app.mount("/static", StaticFiles(directory="static"), name="static")` และไฟล์จริงอยู่ที่โฟลเดอร์ `static/` ในโฟลเดอร์โปรเจค
- ถ้าเบราว์เซอร์ยังเห็นโค้ดเก่า ให้ลอง hard refresh (Ctrl+F5) หรือเปิดใน incognito
- โมเดล YOLO อาจใช้ GPU/CPU ขึ้นกับการติดตั้ง `ultralytics` และไดรเวอร์

---
