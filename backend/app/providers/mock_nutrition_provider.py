"""
Mock implementation of NutritionProvider for testing
"""
from typing import Optional
import asyncio

from app.providers.nutrition_provider import NutritionProvider, NutritionData


class MockNutritionProvider(NutritionProvider):
    """
    Mock nutrition provider that returns hardcoded nutrition data.
    
    This is useful for:
    - Testing without external API dependencies
    - Development before API integration
    - Demonstrations and prototyping
    
    The mock data is based on USDA nutritional values per 100g,
    then scaled to the requested quantity.
    """
    
    # Hardcoded nutrition data per 100g
    NUTRITION_DATABASE = {
        "apple": {
            "calories": 52.0,
            "protein_grams": 0.3,
            "carbs_grams": 14.0,
            "fat_grams": 0.2,
            "fiber_grams": 2.4,
            "sugar_grams": 10.4,
            "sodium_mg": 1.0,
        },
        "banana": {
            "calories": 89.0,
            "protein_grams": 1.1,
            "carbs_grams": 23.0,
            "fat_grams": 0.3,
            "fiber_grams": 2.6,
            "sugar_grams": 12.2,
            "sodium_mg": 1.0,
        },
        "chicken_breast": {
            "calories": 165.0,
            "protein_grams": 31.0,
            "carbs_grams": 0.0,
            "fat_grams": 3.6,
            "fiber_grams": 0.0,
            "sugar_grams": 0.0,
            "sodium_mg": 74.0,
        },
        "broccoli": {
            "calories": 34.0,
            "protein_grams": 2.8,
            "carbs_grams": 7.0,
            "fat_grams": 0.4,
            "fiber_grams": 2.6,
            "sugar_grams": 1.7,
            "sodium_mg": 33.0,
        },
        "rice": {
            "calories": 130.0,
            "protein_grams": 2.7,
            "carbs_grams": 28.0,
            "fat_grams": 0.3,
            "fiber_grams": 0.4,
            "sugar_grams": 0.1,
            "sodium_mg": 1.0,
        },
        "pasta": {
            "calories": 131.0,
            "protein_grams": 5.0,
            "carbs_grams": 25.0,
            "fat_grams": 1.1,
            "fiber_grams": 1.8,
            "sugar_grams": 0.6,
            "sodium_mg": 1.0,
        },
        "salad": {
            "calories": 15.0,
            "protein_grams": 1.4,
            "carbs_grams": 2.9,
            "fat_grams": 0.2,
            "fiber_grams": 1.3,
            "sugar_grams": 0.8,
            "sodium_mg": 28.0,
        },
        "burger": {
            "calories": 295.0,
            "protein_grams": 17.0,
            "carbs_grams": 24.0,
            "fat_grams": 14.0,
            "fiber_grams": 1.5,
            "sugar_grams": 5.0,
            "sodium_mg": 497.0,
        },
        "pizza": {
            "calories": 266.0,
            "protein_grams": 11.0,
            "carbs_grams": 33.0,
            "fat_grams": 10.0,
            "fiber_grams": 2.3,
            "sugar_grams": 3.8,
            "sodium_mg": 598.0,
        },
        "orange": {
            "calories": 47.0,
            "protein_grams": 0.9,
            "carbs_grams": 12.0,
            "fat_grams": 0.1,
            "fiber_grams": 2.4,
            "sugar_grams": 9.4,
            "sodium_mg": 0.0,
        },
    }
    
    async def get_nutrition_info(
        self, 
        food_name: str, 
        quantity_grams: float
    ) -> Optional[NutritionData]:
        """
        Get mock nutrition information for a food item.
        
        Args:
            food_name: Name of the food (case-insensitive)
            quantity_grams: Quantity in grams
            
        Returns:
            NutritionData scaled to the requested quantity, or None if not found
        """
        # Simulate async API call with small delay
        await asyncio.sleep(0.1)
        
        # Normalize food name (lowercase, remove extra spaces)
        normalized_name = food_name.lower().strip().replace(" ", "_")
        
        # Look up nutrition data
        base_nutrition = self.NUTRITION_DATABASE.get(normalized_name)
        
        if not base_nutrition:
            # Try without underscores
            normalized_name = normalized_name.replace("_", "")
            base_nutrition = self.NUTRITION_DATABASE.get(normalized_name)
        
        if not base_nutrition:
            # Food not found in mock database
            return None
        
        # Scale nutrition values from 100g to requested quantity
        scale_factor = quantity_grams / 100.0
        
        return NutritionData(
            food_name=food_name,
            quantity_grams=quantity_grams,
            calories=round(base_nutrition["calories"] * scale_factor, 1),
            protein_grams=round(base_nutrition["protein_grams"] * scale_factor, 1),
            carbs_grams=round(base_nutrition["carbs_grams"] * scale_factor, 1),
            fat_grams=round(base_nutrition["fat_grams"] * scale_factor, 1),
            fiber_grams=round(base_nutrition["fiber_grams"] * scale_factor, 1),
            sugar_grams=round(base_nutrition["sugar_grams"] * scale_factor, 1),
            sodium_mg=round(base_nutrition["sodium_mg"] * scale_factor, 1),
            source="MockNutritionProvider",
            confidence=1.0
        )
    
    async def search_food(self, query: str, limit: int = 5) -> list[dict]:
        """
        Search for food items in the mock database.
        
        Args:
            query: Search query (case-insensitive)
            limit: Maximum number of results
            
        Returns:
            List of matching food items
        """
        # Simulate async API call
        await asyncio.sleep(0.05)
        
        query_lower = query.lower()
        results = []
        
        for food_name in self.NUTRITION_DATABASE.keys():
            if query_lower in food_name or food_name in query_lower:
                results.append({
                    "name": food_name.replace("_", " ").title(),
                    "id": food_name,
                    "source": "mock"
                })
                
                if len(results) >= limit:
                    break
        
        return results
    
    def get_provider_name(self) -> str:
        """Get provider name"""
        return "Mock Nutrition Provider"
