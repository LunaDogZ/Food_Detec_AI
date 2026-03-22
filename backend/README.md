# Food & Nutrition Analysis System - Backend API

Backend service for the Food & Nutrition Analysis System built with FastAPI, PostgreSQL, and async SQLAlchemy.

## 🏗️ Architecture

This backend follows a **clean architecture** pattern with clear separation of concerns:

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration management
│   ├── api/
│   │   └── v1/
│   │       └── routers/     # API endpoints (controllers)
│   │           └── analyze.py
│   ├── services/            # Business logic layer
│   │   └── food_analysis_service.py
│   ├── schemas/             # Pydantic models for validation
│   │   └── analyze_schemas.py
│   ├── models/              # SQLAlchemy database models
│   │   └── base.py
│   └── db/                  # Database configuration
│       └── session.py       # Async session management
├── requirements.txt
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL 14+

### Installation

1. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run the application:**
   ```bash
   # From the backend directory
   python -m app.main
   
   # Or using uvicorn directly
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Access the API:**
   - API Documentation (Swagger): http://localhost:8000/docs
   - Alternative Documentation (ReDoc): http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health

## 📡 API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Detailed health check

### Food Analysis (v1)
- `POST /api/v1/analyze/image` - Upload and analyze food image
- `GET /api/v1/analyze/history` - Get analysis history

## 🧪 Testing the Image Upload

### Using cURL
```bash
curl -X POST "http://localhost:8000/api/v1/analyze/image" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/food-image.jpg"
```

### Using Python
```python
import requests

url = "http://localhost:8000/api/v1/analyze/image"
files = {"file": open("food-image.jpg", "rb")}
response = requests.post(url, files=files)
print(response.json())
```

### Expected Response (Dummy Data)
```json
{
  "success": true,
  "detected_foods": [
    {
      "name": "Grilled Chicken Breast",
      "confidence": 0.94,
      "bounding_box": {"x": 150, "y": 200, "width": 300, "height": 280}
    },
    {
      "name": "Steamed Broccoli",
      "confidence": 0.89,
      "bounding_box": {"x": 480, "y": 220, "width": 180, "height": 200}
    },
    {
      "name": "Brown Rice",
      "confidence": 0.92,
      "bounding_box": {"x": 100, "y": 500, "width": 250, "height": 180}
    }
  ],
  "total_nutrition": {
    "calories": 450.0,
    "protein": 45.0,
    "carbs": 48.0,
    "fat": 8.5,
    "fiber": 6.0
  },
  "processing_time_ms": 12.34,
  "message": "Successfully analyzed image: food-image.jpg (DUMMY DATA)"
}
```

## 🔧 Key Features

### Dependency Injection
The application uses FastAPI's dependency injection system for database sessions:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

@router.post("/analyze/image")
async def analyze_food_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)  # Injected database session
):
    service = FoodAnalysisService(db)
    result = await service.process_food_image(file.file, file.filename)
    return result
```

### Async Everything
- Async FastAPI endpoints
- Async SQLAlchemy with asyncpg driver
- Async database session management
- Ready for async HTTP calls to AI microservice

### Clean Separation of Concerns
- **Routers (Controllers)**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Schemas**: Pydantic models for validation
- **Models**: Database table definitions

## 🔜 Next Steps

The current implementation includes placeholder/dummy data. To complete the system:

1. **Set up PostgreSQL database**
2. **Create database migrations with Alembic**
3. **Implement actual AI service integration** in `food_analysis_service.py`
4. **Add image storage** (local filesystem or cloud storage)
5. **Implement authentication/authorization**
6. **Add comprehensive error handling and logging**
7. **Write unit and integration tests**

## 📝 Development Notes

- **Database**: Currently returns dummy data. Configure `DATABASE_URL` in `.env` to connect to PostgreSQL
- **AI Service**: Placeholder implementation. Update `AI_SERVICE_URL` and implement actual HTTP calls
- **File Upload**: Validates file type and size, but doesn't persist images yet

## 🛠️ Tech Stack

- **Framework**: FastAPI 0.109+
- **Server**: Uvicorn
- **Database**: PostgreSQL + async SQLAlchemy
- **Validation**: Pydantic v2
- **Migrations**: Alembic (to be set up)
- **HTTP Client**: httpx (for AI service calls)
