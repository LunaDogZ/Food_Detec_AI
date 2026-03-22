"""
Abstract base class for nutrition data providers
"""
from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel, Field


class NutritionData(BaseModel):
    """
    Standardized nutrition data model.
    
    This model represents nutrition information for a given food item
    at a specific quantity.
    """
    food_name: str = Field(..., description="Name of the food item")
    quantity_grams: float = Field(..., description="Quantity in grams")
    
    # Macronutrients (required)
    calories: float = Field(..., description="Energy in kcal")
    protein_grams: float = Field(..., description="Protein in grams")
    carbs_grams: float = Field(..., description="Carbohydrates in grams")
    fat_grams: float = Field(..., description="Fat in grams")
    
    # Additional nutrients (optional)
    fiber_grams: Optional[float] = Field(None, description="Dietary fiber in grams")
    sugar_grams: Optional[float] = Field(None, description="Sugar in grams")
    sodium_mg: Optional[float] = Field(None, description="Sodium in milligrams")
    vitamins: Optional[list[str]] = Field(default_factory=list, description="Key vitamins")
    minerals: Optional[list[str]] = Field(default_factory=list, description="Key minerals")
    
    # Metadata
    source: Optional[str] = Field(None, description="Source of nutrition data (API name, database, etc.)")
    confidence: Optional[float] = Field(None, description="Confidence score if applicable")
    food_group: Optional[str] = Field(None, description="Primary food group (Protein, Carbs, Veg, Fruit, Fat)")
    
    # Gemini Text
    health_benefits: Optional[list[str]] = Field(None, description="Health benefits in Thai")
    warnings: Optional[list[str]] = Field(None, description="Warnings in Thai")
    daily_recommendations: Optional[list[str]] = Field(None, description="Recommendations for the next meals in Thai")
    
    class Config:
        json_schema_extra = {
            "example": {
                "food_name": "Grilled Chicken Breast",
                "quantity_grams": 100.0,
                "calories": 165.0,
                "protein_grams": 31.0,
                "carbs_grams": 0.0,
                "fat_grams": 3.6,
                "fiber_grams": 0.0,
                "sugar_grams": 0.0,
                "sodium_mg": 74.0,
                "source": "USDA Database",
                "confidence": 0.95
            }
        }


class NutritionProvider(ABC):
    """
    Abstract base class for nutrition data providers.
    
    This interface defines the contract that all nutrition providers
    (mock, USDA API, Nutritionix API, etc.) must implement.
    
    Example implementations:
        - MockNutritionProvider: Returns hardcoded data for testing
        - USDANutritionProvider: Queries USDA FoodData Central API
        - NutritionixProvider: Queries Nutritionix API
        - DatabaseNutritionProvider: Queries local nutrition database
    """
    
    @abstractmethod
    async def get_nutrition_info(
        self, 
        food_name: str, 
        quantity_grams: float,
        image_bytes: Optional[bytes] = None
    ) -> Optional[NutritionData]:
        """
        Get nutrition information for a specific food item and quantity.
        
        Args:
            food_name: Name of the food item (e.g., "apple", "chicken breast")
            quantity_grams: Quantity in grams
            
        Returns:
            NutritionData object with nutrition information, or None if not found
            
        Raises:
            Exception: If the API call fails or encounters an error
        """
        pass
    
    @abstractmethod
    async def search_food(self, query: str, limit: int = 5) -> list[dict]:
        """
        Search for food items by name.
        
        This is useful for autocomplete or when the exact food name
        from AI detection needs to be matched to database entries.
        
        Args:
            query: Search query string
            limit: Maximum number of results to return
            
        Returns:
            List of food items with basic info (name, ID, etc.)
        """
        pass
    
    def get_provider_name(self) -> str:
        """
        Get the name of this provider.
        
        Returns:
            Provider name (e.g., "Mock", "USDA", "Nutritionix")
        """
        return self.__class__.__name__
