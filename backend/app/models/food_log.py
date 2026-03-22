"""
FoodLog model for tracking food analysis sessions
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import Base


class FoodLog(Base):
    """
    FoodLog model for storing uploaded image analysis records.
    
    Each FoodLog represents one image upload/analysis session.
    
    Relationships:
        - user: Many-to-one relationship with User
        - detected_items: One-to-many relationship with DetectedFoodItem
    """
    __tablename__ = "food_logs"
    
    # Foreign key to User
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Image storage path (could be local path or cloud storage URL)
    image_path = Column(String(500), nullable=False)
    
    # Optional: Store original filename
    original_filename = Column(String(255), nullable=True)
    
    # Optional: Store analysis metadata (model version, processing time, etc.)
    analysis_metadata = Column(Text, nullable=True)  # Can store JSON
    
    # Relationships
    user = relationship("User", back_populates="food_logs")
    detected_items = relationship("DetectedFoodItem", back_populates="food_log", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<FoodLog(id={self.id}, user_id={self.user_id}, created_at={self.created_at})>"
