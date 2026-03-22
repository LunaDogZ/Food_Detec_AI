"""
DetectedFoodItem model for storing individual food detections
"""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import Base


class DetectedFoodItem(Base):
    """
    DetectedFoodItem model for storing individual detected food items.
    
    Each detected item represents one food item identified in an uploaded image,
    along with its nutrition information.
    
    Relationships:
        - food_log: Many-to-one relationship with FoodLog
    """
    __tablename__ = "detected_food_items"
    
    # Foreign key to FoodLog
    food_log_id = Column(Integer, ForeignKey("food_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Detected food information
    food_name = Column(String(200), nullable=False, index=True)
    
    # Detection metadata
    confidence_score = Column(Float, nullable=True)  # AI model confidence (0-1)
    
    # Bounding box coordinates (optional, for visualization)
    bbox_x = Column(Float, nullable=True)
    bbox_y = Column(Float, nullable=True)
    bbox_width = Column(Float, nullable=True)
    bbox_height = Column(Float, nullable=True)
    
    # Quantity estimation
    estimated_weight_grams = Column(Float, nullable=False)  # Estimated weight in grams
    
    # Nutrition information (per the estimated weight)
    calories = Column(Float, nullable=False)  # kcal
    protein_grams = Column(Float, nullable=False)  # g
    carbs_grams = Column(Float, nullable=False)  # g
    fat_grams = Column(Float, nullable=False)  # g
    
    # Optional additional nutrition info
    fiber_grams = Column(Float, nullable=True)  # g
    sugar_grams = Column(Float, nullable=True)  # g
    sodium_mg = Column(Float, nullable=True)  # mg
    
    # Optional: Store raw nutrition API response or additional metadata
    nutrition_metadata = Column(Text, nullable=True)  # Can store JSON
    
    # Relationships
    food_log = relationship("FoodLog", back_populates="detected_items")
    
    def __repr__(self):
        return f"<DetectedFoodItem(id={self.id}, food_name='{self.food_name}', calories={self.calories})>"
    
    @property
    def total_macros(self) -> dict:
        """Calculate total macronutrients"""
        return {
            "protein": self.protein_grams,
            "carbs": self.carbs_grams,
            "fat": self.fat_grams,
            "total_grams": self.protein_grams + self.carbs_grams + self.fat_grams
        }
