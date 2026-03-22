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

## 2. หยุดระบบ

```bash
cd ~/Food-AI
./stop.sh
```
