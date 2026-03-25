# Food AI - Setup Guide

> โครงสร้างโปรเจกต์และรายละเอียดโฟลเดอร์: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## 1. เริ่มระบบ (zero-config)

หลัง clone โปรเจกต์ รันคำสั่งด้านล่างได้เลย สคริปต์จะสร้าง venv, ติดตั้ง dependencies, สร้าง `.env` ถ้ายังไม่มี ฯลฯ

```bash
cd ~/Food-AI
./start.sh
```

- **หน้าเว็บ (UI):** http://localhost:8000  
- **เอกสาร API:** http://localhost:8000/docs  

หากใช้งาน Gemini หรือบริการภายนอก ให้ใส่ API Key ใน `backend/.env` ตามที่ต้องการ

## 2. รันด้วย Docker (สำหรับอาจารย์หรือรันบนเครื่องอื่น)

หากต้องการนำไปรันบนเครื่องอื่นโดยไม่ต้องติดตั้ง Python หรือไลบรารีต่างๆ เอง สามารถใช้ Docker ได้เลย (จำเป็นต้องมี Docker และ Docker Compose บนเครื่อง)

```bash
cd Food-AI
docker compose up -d
```
- ระบบจะดาวน์โหลดและติดตั้ง dependencies ทั้งหมดใน Container 
- เข้าใช้งาน **หน้าเว็บ (UI):** http://localhost:8000
- หากต้องการดู log ใช้คำสั่ง `docker compose logs -f`
- หยุดระบบ `docker compose down`

## 3. หยุดระบบ (กรณีรันด้วย start.sh ปกติ)

```bash
cd ~/Food-AI
./stop.sh
```
