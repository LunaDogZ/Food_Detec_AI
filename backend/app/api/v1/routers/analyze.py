"""
Food analysis router - Image upload and analysis endpoints
"""
import os
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.food_analysis_service import FoodAnalysisService
from app.schemas.analyze_schemas import FoodAnalysisResponse, ErrorResponse
from app.config import get_settings

router = APIRouter(prefix="/analyze", tags=["Food Analysis"])
settings = get_settings()


def validate_image_file(file: UploadFile) -> None:
    """
    Validate uploaded image file.
    
    Args:
        file: Uploaded file
        
    Raises:
        HTTPException: If file is invalid
    """
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    # Check content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )


@router.post(
    "/image",
    response_model=FoodAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze food image",
    description="Upload an image to detect food items and get nutrition information"
)
async def analyze_food_image(
    file: UploadFile = File(..., description="Food image file (JPG, PNG, WEBP)"),
    db: AsyncSession = Depends(get_db)
) -> FoodAnalysisResponse:
    """
    Analyze a food image to detect food items and calculate nutrition.
    
    This endpoint:
    1. Validates the uploaded image
    2. Processes it through the food analysis service
    3. Returns detected food items with nutrition information
    
    Args:
        file: Uploaded image file
        db: Database session (injected via dependency)
        
    Returns:
        FoodAnalysisResponse with detected foods and nutrition info
        
    Raises:
        HTTPException: If file validation fails or processing error occurs
    """
    # Validate file
    validate_image_file(file)
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )
    
    # Process image using service layer (with dependency injection)
    service = FoodAnalysisService(db)
    
    try:
        result = await service.process_food_image(
            image_data=file.file,
            filename=file.filename
        )
        return result
    except Exception as e:
        # Log error in production
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )
    finally:
        await file.close()


@router.get(
    "/history",
    response_model=list,
    summary="Get analysis history",
    description="Retrieve previous food analysis results"
)
async def get_analysis_history(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
) -> list:
    """
    Get analysis history from database.
    
    Args:
        limit: Maximum number of records to return
        db: Database session (injected via dependency)
        
    Returns:
        List of previous analysis results
    """
    service = FoodAnalysisService(db)
    history = await service.get_analysis_history(limit=limit)
    return history
