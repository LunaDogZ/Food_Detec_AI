"""
Base model with common fields and utilities
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.ext.declarative import declared_attr

from app.db.session import Base as SQLAlchemyBase


class Base(SQLAlchemyBase):
    """
    Base model class with common fields for all models
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    @declared_attr
    def __tablename__(cls) -> str:
        """Auto-generate table name from class name"""
        return cls.__name__.lower()


# Example model (commented out for now):
# from sqlalchemy import Column, String, Text
# 
# class FoodAnalysis(Base):
#     """Food analysis result model"""
#     image_path = Column(String(255), nullable=False)
#     analysis_result = Column(Text, nullable=True)
#     status = Column(String(50), default="pending")
