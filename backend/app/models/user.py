"""
User model
"""
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.models.base import Base


class User(Base):
    """
    User model for storing user information.
    
    Relationships:
        - food_logs: One-to-many relationship with FoodLog
    """
    __tablename__ = "users"
    
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    
    # Relationships
    food_logs = relationship("FoodLog", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"
