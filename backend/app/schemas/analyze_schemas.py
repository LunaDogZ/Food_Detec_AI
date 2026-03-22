"""
Pydantic schemas for food analysis endpoints
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class DetectedFood(BaseModel):
    """Schema for a single detected food item"""
    name: str = Field(..., description="Name of the detected food item")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0-1)")
    bounding_box: Optional[dict] = Field(None, description="Bounding box coordinates {x, y, width, height}")
    food_group: Optional[str] = Field(None, description="Food group classification (Protein, Veg, etc.)")


class NutritionInfo(BaseModel):
    """Schema for nutrition information"""
    calories: float = Field(..., description="Calories in kcal")
    protein: float = Field(..., description="Protein in grams")
    carbs: float = Field(..., description="Carbohydrates in grams")
    fat: float = Field(..., description="Fat in grams")
    fiber: Optional[float] = Field(None, description="Fiber in grams")
    sugar: Optional[float] = Field(None, description="Sugar in grams")
    vitamins: List[str] = Field(default_factory=list, description="List of key vitamins")
    minerals: List[str] = Field(default_factory=list, description="List of key minerals")


class FoodAnalysisResponse(BaseModel):
    """Schema for the image analysis response"""
    success: bool = Field(..., description="Whether the analysis was successful")
    detected_foods: List[DetectedFood] = Field(default_factory=list, description="List of detected food items")
    total_nutrition: Optional[NutritionInfo] = Field(None, description="Aggregated nutrition information")
    gemini_explanation: Optional[str] = Field(None, description="Conversational explanation from Gemini in Thai")
    annotated_image: Optional[str] = Field(None, description="Base64-encoded JPEG of the image with bounding boxes drawn by YOLO")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    message: Optional[str] = Field(None, description="Additional message or error details")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "detected_foods": [
                    {
                        "name": "Apple",
                        "confidence": 0.95,
                        "bounding_box": {"x": 100, "y": 150, "width": 200, "height": 220}
                    },
                    {
                        "name": "Banana",
                        "confidence": 0.88,
                        "bounding_box": {"x": 320, "y": 180, "width": 180, "height": 200}
                    }
                ],
                "total_nutrition": {
                    "calories": 180.0,
                    "protein": 2.5,
                    "carbs": 45.0,
                    "fat": 0.5,
                    "fiber": 6.0
                },
                "processing_time_ms": 342.5,
                "message": "Analysis completed successfully"
            }
        }


class ErrorResponse(BaseModel):
    """Schema for error responses"""
    success: bool = False
    message: str
    error_code: Optional[str] = None
