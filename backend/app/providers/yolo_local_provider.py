"""
Local YOLO inference provider for food detection.

Uses a locally-trained ultralytics YOLO model (best.pt) instead of
calling an external API, making detection fully offline and free.
"""
import base64
import io
import logging
from pathlib import Path
from typing import List, Optional, Tuple, BinaryIO

from app.config import get_settings
from app.schemas.analyze_schemas import DetectedFood

logger = logging.getLogger(__name__)
settings = get_settings()


class YoloLocalProvider:
    """
    Provider for local YOLO model inference.

    Loads a custom-trained YOLO model (best.pt) and runs food
    detection locally without any external API calls.
    """

    def __init__(self):
        """
        Initialize the local YOLO provider.

        Loads the model from the path configured via YOLO_MODEL_PATH.
        """
        self.model = None
        self.confidence_threshold = settings.YOLO_CONFIDENCE_THRESHOLD
        model_path = Path(settings.YOLO_MODEL_PATH)

        if not model_path.exists():
            logger.error(
                f"❌ YOLO model not found at '{model_path.resolve()}'. "
                "Set YOLO_MODEL_PATH in .env to the correct path."
            )
            return

        try:
            from ultralytics import YOLO  # Lazy import to avoid startup errors

            self.model = YOLO(str(model_path))
            logger.info(
                f"✅ YOLO model loaded from '{model_path.resolve()}' "
                f"(confidence threshold: {self.confidence_threshold})"
            )
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO model: {e}")
            self.model = None

    async def detect_food(
        self, image_data: BinaryIO
    ) -> Tuple[List[DetectedFood], Optional[str]]:
        """
        Detect food items in an image using the local YOLO model.

        Args:
            image_data: Binary image data (file-like object)

        Returns:
            Tuple of:
              - List of DetectedFood objects with name, confidence, and bounding box.
              - Base64-encoded JPEG data URI of the annotated image with bounding boxes,
                or None if inference failed.
        """
        if self.model is None:
            logger.warning("⚠️ YOLO model not loaded. Returning MOCK DATA for UI testing.")
            mock_food = DetectedFood(
                name="ข้าวผัด (Mock)",
                confidence=0.95,
                bounding_box={"x": 50, "y": 50, "width": 100, "height": 100},
            )
            return [mock_food], None

        try:
            # Read image bytes
            if hasattr(image_data, "seek"):
                image_data.seek(0)
            image_bytes = image_data.read()

            # Run YOLO inference on raw bytes via PIL
            from PIL import Image
            import cv2

            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

            # Run synchronous inference (YOLO SDK is sync; runs in-process)
            results = self.model.predict(
                source=pil_image,
                conf=self.confidence_threshold,
                verbose=False,
            )

            detected_foods: List[DetectedFood] = []

            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue

                for box in boxes:
                    class_id = int(box.cls[0].item())
                    confidence = float(box.conf[0].item())
                    label = result.names.get(class_id, f"class_{class_id}")

                    # Bounding box in xyxy format → convert to {x, y, w, h}
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    bbox = {
                        "x": round(x1),
                        "y": round(y1),
                        "width": round(x2 - x1),
                        "height": round(y2 - y1),
                    }

                    detected_foods.append(
                        DetectedFood(
                            name=label,
                            confidence=round(confidence, 4),
                            bounding_box=bbox,
                        )
                    )

            # --- Generate annotated image with bounding boxes ---
            # Same technique as friend's app.py: results[0].plot() → BGR numpy array
            annotated_image_b64: Optional[str] = None
            if results:
                annotated_bgr = results[0].plot()          # numpy BGR array
                annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
                pil_out = Image.fromarray(annotated_rgb)
                buffer = io.BytesIO()
                pil_out.save(buffer, format="JPEG", quality=85)
                b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
                annotated_image_b64 = f"data:image/jpeg;base64,{b64}"

            logger.info(f"✅ YOLO detected {len(detected_foods)} item(s)")
            return detected_foods, annotated_image_b64

        except Exception as e:
            logger.error(f"❌ YOLO inference error: {e}")
            return [], None
