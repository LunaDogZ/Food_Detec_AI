# 🥗 Food & Nutrition Analysis System (AI ตรวจจับและวิเคราะห์สารอาหาร)

ระบบวิเคราะห์สารอาหารจากรูปภาพโดยใช้ **YOLO (Local Detection)** ร่วมกับ **Google Gemini AI (Nutritional Analysis)** 
โปรเจกต์นี้ถูกออกแบบมาให้รันได้ง่ายบนเครื่องส่วนตัว (Local) และรองรับการดึงข้อมูลโภชนาการแบบละเอียด

---

## 🏗️ โครงสร้างโปรเจกต์
- **`backend/`**: พัฒนาด้วย FastAPI (Python) ทำหน้าที่ประมวลผลรูปภาพด้วย YOLO และเรียก Gemini API
- **`frontend/`**: พัฒนาด้วย React (Vite + TypeScript) สำหรับหน้าจอผู้ใช้งานที่สวยงามและใช้งานง่าย
- **`start.sh` / `stop.sh`**: สคริปต์สำหรับเริ่มและหยุดระบบทั้งหมดในทีเดียว

---

## 🚀 วิธีการเริ่มใช้งาน (Quick Start)

### 1. เตรียมความพร้อม
- ติดตั้ง **Python 3.10+** และ **Node.js**
- สร้าง API Key สำหรับ Gemini ที่ [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. ตั้งค่าระบบ (Configuration)
ไปที่โฟลเดอร์ `backend/` และแก้ไขไฟล์ `.env` (หากไม่มีให้ก๊อปปี้จาก `.env.example`):
```bash
# ใส่ API Key ของคุณ
GEMINI_API_KEY=AIzaSy...
# แนะนำให้ใช้รุ่นล่าสุด
GEMINI_MODEL=gemini-flash-latest
```

### 3. รันระบบ (วิธีที่แนะนำ)
หากคุณใช้ Linux หรือ macOS (รวมถึง WSL บน Windows):
```bash
./start.sh
```
*สคริปต์จะทำการสร้าง Virtual Environment, ติดตั้งไลบรารีทั้ง Backend/Frontend และรันระบบให้โดยอัตโนมัติ*

### 4. รันระบบ (วิธีแบบแยกส่วน - Manual)
**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🖥️ การเข้าใช้งาน
- **หน้าเว็บโปรเจกต์:** [http://localhost:5173](http://localhost:5173) (หรือตามที่ Vite แจ้ง)
- **เอกสาร API (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ การแก้ปัญหาเบื้องต้น (Troubleshooting)

### ❌ Gemini ไม่ตอบกลับ / ข้อมูลไม่แม่นยำ
- **ตรวจสอบ API Key:** ตรวจสอบใน `backend/.env` ว่าใส่คีย์ถูกต้องและไม่มีช่องว่างเกิน
- **โควตาเต็ม (429 Error):** หากรันบ่อยเกินไป (ฟรีเทียร์จำกัด 15 ครั้ง/นาที) ระบบจะใช้ระบบคำนวณสำรอง (Fallback) ให้แทนชั่วคราว แนะนำให้รอ 1 นาทีแล้วลองใหม่
- **ชื่อโมเดล:** หากคีย์ของคุณเข้าถึงโมเดลใหม่ๆ ไม่ได้ ให้ลองเปลี่ยน `GEMINI_MODEL` เป็น `gemini-1.5-flash`

### ❌ YOLO หาไฟล์โมเดลไม่เจอ
- ตรวจสอบว่าไฟล์ `best.pt` อยู่ในโฟลเดอร์ root ของโปรเจกต์ หรือตั้งค่าพาธใน `backend/.env` ให้ถูกต้อง

### ❌ รันหน้าเว็บไม่ขึ้น
- ตรวจสอบว่าได้รัน `npm install` ในโฟลเดอร์ `frontend` หรือยัง

---

## 📖 หมายเหตุการพัฒนา
โปรเจกต์นี้มีการใช้ระบบ **Heuristic Fallback** ในกรณีที่ Gemini API ใช้งานไม่ได้ เพื่อให้ผู้ใช้ยังคงเห็นข้อมูลโภชนาการโดยประมาณ (เช่น ผลไม้จะบอกว่ามีวิตามิน/เกลือแร่ทันที) เพื่อไม่ให้ระบบค้าง

---
**จัดทำโดย:** [ชื่อทีม/ชื่อของคุณ]
