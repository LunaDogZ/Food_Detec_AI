"""
Food analysis service - Business logic for processing food images
"""
import time
from typing import BinaryIO
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.analyze_schemas import FoodAnalysisResponse, DetectedFood, NutritionInfo
from app.config import get_settings

settings = get_settings()


class FoodAnalysisService:
    """
    Service layer for food image analysis.
    
    This service handles the business logic for processing food images,
    including calling the AI microservice, storing results, and formatting responses.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the service with a database session.
        
        Args:
            db: Async SQLAlchemy database session
        """
        self.db = db
        # Initialize providers
        from app.providers.yolo_local_provider import YoloLocalProvider
        from app.providers.gemini_nutrition_provider import GeminiNutritionProvider
        
        self.yolo_provider = YoloLocalProvider()
        self.gemini_provider = GeminiNutritionProvider()
    
    async def process_food_image(self, image_data: BinaryIO, filename: str) -> FoodAnalysisResponse:
        """
        Process a food image and return detected food items with nutrition info.
        
        Args:
            image_data: Binary image data
            filename: Original filename
            
        Returns:
            FoodAnalysisResponse with detected foods and nutrition info
        """
        start_time = time.time()
        
        try:
            # 1. Detect food items using Roboflow
            # We need to read the file, but it might be read already.
            # reset cursor just in case
            if hasattr(image_data, 'seek'):
                image_data.seek(0)
            
            image_bytes = image_data.read()
            
            # Reset cursor again for YOLO if it reads from file
            if hasattr(image_data, 'seek'):
                image_data.seek(0)

            detected_foods, annotated_image = await self.yolo_provider.detect_food(image_data)
            
            # If no food detected, return early
            if not detected_foods:
                return FoodAnalysisResponse(
                    success=False,
                    detected_foods=[],
                    total_nutrition=None,
                    annotated_image=annotated_image,
                    processing_time_ms=round((time.time() - start_time) * 1000, 2),
                    message="No food items detected in the image.",
                    food_detected=False,
                    meal_recommendations=[],
                )
            
            # 2. Get nutrition info for each detected food
            # For now, we assume a standard portion of 100g for estimation
            # In a real app, we might try to estimate volume from bounding box or ask user
            DEFAULT_PORTION_GRAMS = 100.0
            
            total_nutrition = NutritionInfo(
                calories=0,
                protein=0,
                carbs=0,
                fat=0,
                fiber=0,
                sugar=0,
                vitamins=[],
                minerals=[]
            )
            
            processed_foods = []
            all_benefits = []
            all_warnings = []
            all_recommendations = []
            
            # One Gemini multimodal call for all labels (avoids N× RPM / quota hits per image)
            label_names = [f.name for f in detected_foods]
            nutrition_list, plate_recommendations = await self.gemini_provider.get_nutrition_batch(
                label_names,
                DEFAULT_PORTION_GRAMS,
                image_bytes,
            )
            if plate_recommendations:
                all_recommendations.extend(plate_recommendations)

            for food, nutrition in zip(detected_foods, nutrition_list):
                if nutrition:
                    # Accumulate totals
                    total_nutrition.calories += nutrition.calories
                    total_nutrition.protein += nutrition.protein_grams
                    total_nutrition.carbs += nutrition.carbs_grams
                    total_nutrition.fat += nutrition.fat_grams
                    if nutrition.fiber_grams:
                        total_nutrition.fiber = (total_nutrition.fiber or 0) + nutrition.fiber_grams
                    if nutrition.sugar_grams:
                        total_nutrition.sugar = (total_nutrition.sugar or 0) + nutrition.sugar_grams
                        
                    # Aggregate vitamins and minerals (set union; tolerate None / non-str from APIs)
                    current_vitamins = {str(x).strip() for x in (total_nutrition.vitamins or []) if str(x).strip()}
                    for x in nutrition.vitamins or []:
                        s = str(x).strip()
                        if s:
                            current_vitamins.add(s)
                    total_nutrition.vitamins = sorted(current_vitamins)

                    current_minerals = {str(x).strip() for x in (total_nutrition.minerals or []) if str(x).strip()}
                    for x in nutrition.minerals or []:
                        s = str(x).strip()
                        if s:
                            current_minerals.add(s)
                    total_nutrition.minerals = sorted(current_minerals)

                    # Assign food group if available
                    if nutrition.food_group:
                        food.food_group = nutrition.food_group
                        
                    # Collect explanations
                    if nutrition.health_benefits:
                        all_benefits.extend(nutrition.health_benefits)
                    if nutrition.warnings:
                        all_warnings.extend(nutrition.warnings)
                    if nutrition.daily_recommendations:
                        all_recommendations.extend(nutrition.daily_recommendations)
                
                processed_foods.append(food)
            
            processing_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Construct Gemini Explanation
            explanation_parts = []
            
            # 1. Detected Foods and Groups
            foods_list_str = "\n".join([f"- {f.name} ({f.food_group or 'ไม่ระบุหมวดหมู่'})" for f in processed_foods])
            if foods_list_str:
                explanation_parts.append(f"🔍 **รายการอาหารที่พบ:**\n{foods_list_str}")
                
            # 2. Approximate Macros
            macros_str = (
                f"- พลังงาน: {round(total_nutrition.calories)} kcal\n"
                f"- โปรตีน: {round(total_nutrition.protein)} g\n"
                f"- คาร์บ: {round(total_nutrition.carbs)} g\n"
                f"- ไขมัน: {round(total_nutrition.fat)} g"
            )
            explanation_parts.append(f"📊 **ข้อมูลโภชนาการโดยประมาณ:**\n{macros_str}")
            
            # 3. Benefits and Warnings
            if all_benefits:
                explanation_parts.append("✨ **ประโยชน์ที่ได้รับ:**\n" + "\n".join([f"- {b}" for b in set(all_benefits)]))
            if all_warnings:
                explanation_parts.append("⚠️ **ข้อควรระวัง:**\n" + "\n".join([f"- {w}" for w in set(all_warnings)]))
                
            # 4. Daily Recommendations
            meal_recommendations = list(dict.fromkeys(all_recommendations))
            if meal_recommendations:
                explanation_parts.append(
                    "💡 **คำแนะนำมื้อต่อไป:**\n" + "\n".join([f"- {r}" for r in meal_recommendations])
                )
            
            gemini_explanation = "\n\n".join(explanation_parts) if explanation_parts else "ไม่พบข้อมูลโภชนาการเพิ่มเติม"
            
            # LOGGING THE ANNOTATED IMAGE LENGTH TO PROVE IT IS SENT
            import logging
            sys_logger = logging.getLogger(__name__)
            if annotated_image:
                sys_logger.info(f"YOLO SENDING annotated_image WITH LENGTH: {len(annotated_image)}")
            else:
                sys_logger.info("YOLO SENDING annotated_image AS NULL!")
            
            return FoodAnalysisResponse(
                success=True,
                detected_foods=processed_foods,
                total_nutrition=total_nutrition,
                gemini_explanation=gemini_explanation,
                annotated_image=annotated_image,
                processing_time_ms=round(processing_time, 2),
                message=f"Successfully analyzed {len(processed_foods)} food items.",
                food_detected=len(processed_foods) > 0,
                meal_recommendations=meal_recommendations,
            )
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error processing food image: {str(e)}")
            return FoodAnalysisResponse(
                success=False,
                processing_time_ms=round((time.time() - start_time) * 1000, 2),
                message=f"Error analyzing image: {str(e)}",
                food_detected=False,
                meal_recommendations=[],
            )
    
    async def get_analysis_history(self, limit: int = 10) -> list:
        """
        Retrieve analysis history from database.
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            List of analysis records
        """
        # TODO: Implement database query
        # Example:
        # result = await self.db.execute(
        #     select(FoodAnalysis).order_by(FoodAnalysis.created_at.desc()).limit(limit)
        # )
        # return result.scalars().all()
        
        return []  # Placeholder
