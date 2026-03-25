"""
Gemini AI-powered nutrition provider
Migrated to google-genai SDK (replaces deprecated google-generativeai)
"""
import asyncio
import json
import logging
import re
from typing import Optional

from app.providers.nutrition_provider import NutritionProvider, NutritionData
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_GEMINI_MAX_RETRIES = 4
_GEMINI_BASE_DELAY_SEC = 1.2


class GeminiNutritionProvider(NutritionProvider):
    """
    Nutrition provider powered by Google Gemini AI.

    This provider uses Gemini to analyze food items and provide:
    - Detailed nutrition information
    - Health benefits (in Thai)
    - Warnings and considerations (in Thai)
    - Vitamin and mineral content

    Uses the new `google-genai` SDK (google.genai).
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini provider.

        Args:
            api_key: Google AI API key. If not provided, will use GEMINI_API_KEY from settings
        """
        self.api_key = api_key or getattr(settings, 'GEMINI_API_KEY', None)
        self.client = None
        self._model_name = getattr(settings, 'GEMINI_MODEL', None) or 'gemini-2.5-flash'

        if not self.api_key:
            logger.warning("⚠️  Gemini API key not found. Set GEMINI_API_KEY in .env file")
        else:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("✅ Gemini AI (google-genai SDK) initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Gemini client: {e}")
                self.client = None

    async def get_nutrition_info(
        self,
        food_name: str,
        quantity_grams: float,
        image_bytes: Optional[bytes] = None
    ) -> Optional[NutritionData]:
        """
        Get nutrition information using Gemini AI.

        Args:
            food_name: Generic name of the food item detected by another model (e.g. Veg, Meat)
            quantity_grams: Quantity in grams
            image_bytes: Original image for detailed analysis

        Returns:
            NutritionData object with comprehensive nutrition info, or None on failure
        """
        if not self.client:
            logger.error("Cannot get nutrition info: Gemini client not initialized")
            return None

        try:
            prompt = self._create_nutrition_prompt(food_name, quantity_grams)

            logger.info(f"🤖 Asking Gemini ({self._model_name}) about: {food_name} ({quantity_grams}g)")

            response = await self._generate_with_retries(prompt, image_bytes)

            # Parse JSON response
            nutrition_data = self._parse_gemini_response(response, food_name, quantity_grams)

            logger.info(f"✅ Got nutrition data: {nutrition_data.calories} kcal")
            return nutrition_data

        except Exception as e:
            err_str = str(e)
            logger.error(f"❌ Gemini API error: {err_str}")

            # Rate limits / quota (per-minute and daily differ from "remaining" in AI Studio UI)
            if self._is_likely_quota_or_rate_limit(err_str):
                logger.warning(
                    "⚠️ Gemini unavailable after retries — using heuristic fallback nutrition"
                )
                return self._make_fallback_nutrition(food_name, quantity_grams)

            return None

    async def get_nutrition_batch(
        self,
        food_names: list[str],
        quantity_grams: float,
        image_bytes: Optional[bytes] = None,
    ) -> tuple[list[NutritionData], list[str]]:
        """
        One Gemini call for all YOLO labels on the same image (reduces RPM / quota usage vs N calls).
        Returns (per-label nutrition, plate-level recommendation strings in Thai).
        On quota or API failure, returns heuristic fallbacks for every label (same as sequential path).
        """
        if not food_names:
            return [], []
        if not self.client:
            logger.error("Cannot get nutrition batch: Gemini client not initialized")
            return [self._make_fallback_nutrition(n, quantity_grams) for n in food_names], []

        try:
            prompt = self._create_batch_nutrition_prompt(food_names, quantity_grams)
            logger.info(
                "🤖 Asking Gemini (%s) batch for %s item(s): %s",
                self._model_name,
                len(food_names),
                ", ".join(food_names[:5]) + ("…" if len(food_names) > 5 else ""),
            )
            response = await self._generate_with_retries(prompt, image_bytes)
            return self._parse_gemini_batch_response(response, food_names, quantity_grams)

        except Exception as e:
            err_str = str(e)
            logger.error(f"❌ Gemini batch API error: {err_str}")
            if self._is_likely_quota_or_rate_limit(err_str):
                logger.warning(
                    "⚠️ Gemini unavailable after retries — using heuristic fallback nutrition (batch)"
                )
            return [self._make_fallback_nutrition(n, quantity_grams) for n in food_names], []

    async def search_food(self, query: str, limit: int = 5) -> list[dict]:
        """
        Search for food items using Gemini.
        """
        if not self.client:
            return []

        try:
            prompt = f"""
            Suggest {limit} food items that match the query: "{query}"

            Return as JSON array with format:
            [
                {{"name": "Food Name", "category": "Category", "common": true/false}}
            ]

            Examples should be common foods. Return ONLY the JSON array, no markdown.
            """

            response = await self._generate_with_retries(prompt, None)

            # Parse JSON array
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif response_text.startswith('```'):
                response_text = response_text.split('```')[1].split('```')[0].strip()

            suggestions = json.loads(response_text)

            return [
                {
                    "name": item["name"],
                    "id": item["name"].lower().replace(" ", "_"),
                    "category": item.get("category", "Unknown"),
                    "source": "gemini"
                }
                for item in suggestions[:limit]
            ]

        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return []

    def _create_nutrition_prompt(self, food_name: str, quantity_grams: float) -> str:
        """Create detailed prompt for Gemini"""
        return f"""
You are an expert nutritionist and food AI.
A basic object detection model (YOLO) has looked at this image and placed a bounding box labeled as: "{food_name}".

Please look carefully at the provided image to identify exactly what that specific food item actually is.
For example, if the label is 'Veg', identify the actual vegetable or dish (e.g., 'Broccoli', 'Mixed green salad', 'Stir-fried morning glory').
If the label is 'Meat', identify the type or dish (e.g., 'Grilled salmon', 'Fried pork', 'Beef steak').
If no image is provided or the food cannot be identified clearly, do your best to estimate based on the label "{food_name}".

Next, provide detailed nutrition information for {quantity_grams} grams of that SPECIFIC identified food.
Your response MUST be in JSON format only. Do not wrap in markdown or anything else.

Food Label Detected: {food_name}
Quantity: {quantity_grams} grams

Please provide the following information in JSON format:
{{
    "calories": <number>,
    "protein_grams": <number>,
    "carbs_grams": <number>,
    "fat_grams": <number>,
    "fiber_grams": <number>,
    "sugar_grams": <number>,
    "sodium_mg": <number>,
    "vitamins": ["list of key vitamins with amounts"],
    "minerals": ["list of key minerals"],
    "health_benefits": ["list benefits in Thai language"],
    "warnings": ["list warnings/considerations in Thai language"],
    "daily_recommendations": ["list recommendations for the next meals to balance daily nutrition in Thai language"],
    "serving_size_description": "typical serving size description",
    "food_group": "One of: Carbs, Protein, Vegetable, Fruit, Dairy (Thai อาหาร 5 หมู่)"
}}

Important:
- Base calculations on the EXACT quantity provided ({quantity_grams}g)
- Use standard USDA nutrition database values
- Health benefits should be in Thai (ภาษาไทย)
- Warnings should be in Thai (ภาษาไทย)
- Return ONLY the JSON object, no markdown formatting
- If uncertain, provide reasonable estimates based on similar foods

Example health_benefits (in Thai):
["ให้โปรตีนสูง ช่วยสร้างกล้ามเนื้อ", "มีวิตามินบี12 บำรุงระบบประสาท"]

Example warnings (in Thai):
["ควรหลีกเลี่ยงหากแพ้ไข่", "มีโซเดียมสูง ไม่เหมาะกับผู้ป่วยความดันโลหิตสูง"]

Example daily_recommendations (in Thai):
["มื้อต่อไปควรเน้นผักใบเขียวเพื่อเพิ่มกากใยอาหาร", "ควรลดทานของมันในมื้อถัดไปเพื่อควบคุมไขมันรวมต่อวัน"]
"""

    def _create_batch_nutrition_prompt(self, food_names: list[str], quantity_grams: float) -> str:
        """Single multimodal request for every YOLO label (same image)."""
        labels_json = json.dumps(food_names, ensure_ascii=False)
        n = len(food_names)
        return f"""
You are an expert nutritionist and food AI.
A YOLO model labeled these regions in ONE image (in order): {labels_json}

Look at the image and, for EACH label, identify the actual food in that region and give nutrition for {quantity_grams} grams of that item.

Return ONLY one JSON object (no markdown). It MUST have exactly these keys:
1) "plate_recommendations" — array of 6 to 12 strings in Thai. These are holistic, specific advice for THIS exact plate photo: balance vs อาหาร 5 หมู่, gaps (e.g. fiber, veg, protein), sodium/sugar/fat context, what to add or reduce in the *next meal* or later today, hydration. Each line must mention something observable from the plate or the combination of items — avoid generic one-liners that could apply to anyone every day (e.g. do not only say "eat a variety of fruits" without tying to what this meal already has or lacks).
2) "items" — JSON array of length {n} (same order as the labels). Each element is one JSON object with exactly these keys:

{{
    "calories": <number>,
    "protein_grams": <number>,
    "carbs_grams": <number>,
    "fat_grams": <number>,
    "fiber_grams": <number>,
    "sugar_grams": <number>,
    "sodium_mg": <number>,
    "vitamins": ["..."],
    "minerals": ["..."],
    "health_benefits": ["2-4 short items in Thai"],
    "warnings": ["1-3 short items in Thai if relevant, else empty array"],
    "daily_recommendations": ["EXACTLY 4 distinct strings in Thai per item — each must reference this specific food or how it pairs with other items on the plate; include concrete next-meal actions (เพิ่มเครื่องเคียง ลด X เปลี่ยนเป็น Y สัดส่วน)"],
    "serving_size_description": "string",
    "food_group": "One primary Thai 5-group category in English: Carbs (rice, noodles, bread, grains), Protein (meat, fish, egg, legumes), Vegetable, Fruit, Dairy (milk, yogurt, cheese). Use Carbs for starchy foods; avoid Fat as the only group when a better fit exists."
}}

Rules:
- Base nutrition values on the EXACT quantity {quantity_grams}g for that item
- health_benefits, warnings, daily_recommendations, plate_recommendations in Thai (ภาษาไทย)
- If a label is vague, infer the most likely food from the image
- food_group must be one of: Carbs, Protein, Vegetable, Fruit, Dairy (Thai อาหาร 5 หมู่ — map ข้าวแป้ง→Carbs, เนื้อ/ไข่/ถั่ว→Protein, ผัก→Vegetable, ผลไม้→Fruit, นม→Dairy)
- Do not repeat the same sentence in plate_recommendations and every daily_recommendations entry; vary wording and focus
"""

    @staticmethod
    def _detect_image_mime(image_bytes: bytes) -> str:
        if not image_bytes or len(image_bytes) < 12:
            return "image/jpeg"
        if image_bytes[:3] == b"\xff\xd8\xff":
            return "image/jpeg"
        if image_bytes[:8] == b"\x89PNG\r\n\x1a\n":
            return "image/png"
        if image_bytes[:4] == b"RIFF" and image_bytes[8:12] == b"WEBP":
            return "image/webp"
        return "image/jpeg"

    def _build_contents(self, prompt: str, image_bytes: Optional[bytes]):
        """Multimodal user message: text + image (required for accurate nutrition)."""
        from google.genai import types

        parts = [types.Part.from_text(text=prompt)]
        if image_bytes:
            mime = self._detect_image_mime(image_bytes)
            parts.append(
                types.Part.from_bytes(data=image_bytes, mime_type=mime)
            )
        return parts

    def _should_retry(self, err: Exception) -> bool:
        s = str(err).lower()
        return any(
            x in s
            for x in (
                "429",
                "resource_exhausted",
                "503",
                "quota",
                "rate limit",
                "rate_limit",
                "too many requests",
                "unavailable",
                "overloaded",
                "deadline",
                "timeout",
                "temporar",
            )
        )

    @staticmethod
    def _retry_delay_seconds(err: Exception) -> Optional[float]:
        """Honor server RetryInfo ('Please retry in 58.5s') so 429 waits long enough."""
        m = re.search(r"please retry in ([\d.]+)s", str(err).lower())
        if m:
            return float(m.group(1))
        return None

    async def _generate_with_retries(self, prompt: str, image_bytes: Optional[bytes]):
        """Native async Gemini call + exponential backoff on transient errors."""
        from google.genai import types

        contents = self._build_contents(prompt, image_bytes)
        last_err: Optional[Exception] = None

        for attempt in range(_GEMINI_MAX_RETRIES):
            try:
                return await self.client.aio.models.generate_content(
                    model=self._model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        response_mime_type="application/json",
                    ),
                )
            except Exception as e:
                last_err = e
                if attempt < _GEMINI_MAX_RETRIES - 1 and self._should_retry(e):
                    backoff = _GEMINI_BASE_DELAY_SEC * (2**attempt)
                    server = self._retry_delay_seconds(e)
                    delay = max(backoff, server) if server is not None else backoff
                    logger.warning(
                        "Gemini transient error (attempt %s/%s): %s — retry in %.1fs",
                        attempt + 1,
                        _GEMINI_MAX_RETRIES,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                raise

        if last_err:
            raise last_err
        raise RuntimeError("Gemini: no response")

    def _nutrition_from_dict(self, data: dict, food_name: str, quantity_grams: float) -> NutritionData:
        """Build NutritionData from one Gemini JSON object."""
        nutrition_data = NutritionData(
            food_name=food_name,
            quantity_grams=quantity_grams,
            calories=float(data.get('calories', 0)),
            protein_grams=float(data.get('protein_grams', 0)),
            carbs_grams=float(data.get('carbs_grams', 0)),
            fat_grams=float(data.get('fat_grams', 0)),
            fiber_grams=float(data.get('fiber_grams', 0)) if data.get('fiber_grams') else None,
            sugar_grams=float(data.get('sugar_grams', 0)) if data.get('sugar_grams') else None,
            sodium_mg=float(data.get('sodium_mg', 0)) if data.get('sodium_mg') else None,
            vitamins=data.get('vitamins', []),
            minerals=data.get('minerals', []),
            source="Gemini AI",
            confidence=0.9,
            food_group=data.get('food_group', 'Unknown'),
            health_benefits=data.get('health_benefits', []),
            warnings=data.get('warnings', []),
            daily_recommendations=data.get('daily_recommendations', [])
        )

        if data.get('health_benefits'):
            logger.info(f"💚 Benefits: {', '.join(data['health_benefits'][:2])}")
        if data.get('warnings'):
            logger.info(f"⚠️  Warnings: {', '.join(data['warnings'][:2])}")
        if data.get('daily_recommendations'):
            logger.info(f"💡 Recommendations: {', '.join(data['daily_recommendations'][:2])}")

        return nutrition_data

    def _parse_gemini_batch_response(
        self,
        response,
        food_names: list[str],
        quantity_grams: float,
    ) -> tuple[list[NutritionData], list[str]]:
        """Parse JSON object (or legacy array) from Gemini into NutritionData list + plate-level strings."""

        def _normalize_plate(recs: object) -> list[str]:
            if not isinstance(recs, list):
                return []
            out: list[str] = []
            for x in recs:
                if isinstance(x, str):
                    t = x.strip()
                    if t:
                        out.append(t)
            return out

        try:
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif response_text.startswith('```'):
                response_text = response_text.split('```')[1].split('```')[0].strip()

            raw = json.loads(response_text)

            # Legacy: plain array of per-item objects
            if isinstance(raw, list):
                out: list[NutritionData] = []
                for i, name in enumerate(food_names):
                    if i < len(raw) and isinstance(raw[i], dict):
                        out.append(self._nutrition_from_dict(raw[i], name, quantity_grams))
                    else:
                        out.append(self._make_fallback_nutrition(name, quantity_grams))
                return out, []

            if not isinstance(raw, dict):
                raise ValueError("expected JSON object or array")

            plate_recommendations = _normalize_plate(raw.get("plate_recommendations"))
            items_raw = raw.get("items")
            if not isinstance(items_raw, list):
                items_raw = []

            out_items: list[NutritionData] = []
            for i, name in enumerate(food_names):
                if i < len(items_raw) and isinstance(items_raw[i], dict):
                    out_items.append(self._nutrition_from_dict(items_raw[i], name, quantity_grams))
                else:
                    out_items.append(self._make_fallback_nutrition(name, quantity_grams))
            return out_items, plate_recommendations

        except (json.JSONDecodeError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse batch JSON: {e}")
            return [self._make_fallback_nutrition(n, quantity_grams) for n in food_names], []

    def _parse_gemini_response(
        self,
        response,
        food_name: str,
        quantity_grams: float
    ) -> NutritionData:
        """Parse Gemini's JSON response into NutritionData"""
        try:
            # Extract JSON from response (new SDK uses .text)
            response_text = response.text.strip()

            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text.split('```json')[1].split('```')[0].strip()
            elif response_text.startswith('```'):
                response_text = response_text.split('```')[1].split('```')[0].strip()

            # Parse JSON
            data = json.loads(response_text)
            if not isinstance(data, dict):
                raise ValueError("expected JSON object")
            return self._nutrition_from_dict(data, food_name, quantity_grams)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.error(f"Response: {response.text[:200]}")
            raise

    @staticmethod
    def _is_likely_quota_or_rate_limit(err_str: str) -> bool:
        """Detect quota / RPM / overload — dashboard 'limit not empty' can still hit per-minute caps."""
        lower = err_str.lower()
        markers = (
            "429",
            "quota",
            "resource_exhausted",
            "rate limit",
            "rate_limit",
            "too many requests",
            "503",
            "unavailable",
            "overloaded",
            "deadline",
        )
        return any(m in lower for m in markers)

    def _rough_nutrition_per_100g(self, food_name: str) -> tuple[float, float, float, float]:
        """
        Rough kcal, protein, carbs, fat per 100g when Gemini cannot run.
        Not medical-grade — better than showing zeros.
        """
        n = food_name.lower()
        meat = ("chicken", "duck", "beef", "pork", "meat", "steak", "fish", "salmon", "egg")
        starch = ("noodle", "rice", "pasta", "spaghetti", "pad", "bread", "burger")
        veg = ("tomato", "veg", "salad", "green", "broccoli", "carrot", "cabbage")

        if any(k in n for k in meat):
            return (220.0, 24.0, 1.0, 13.0)
        if any(k in n for k in starch):
            return (170.0, 5.5, 28.0, 4.5)
        if any(k in n for k in veg):
            return (30.0, 1.2, 6.0, 0.4)
        return (160.0, 9.0, 18.0, 6.0)

    def _make_fallback_nutrition(self, food_name: str, quantity_grams: float) -> NutritionData:
        """
        When Gemini fails (quota/RPM/etc.), return scaled heuristic estimates — not literal zeros.
        """
        scale = max(quantity_grams, 1.0) / 100.0
        cal, p, c, f = self._rough_nutrition_per_100g(food_name)
        return NutritionData(
            food_name=food_name,
            quantity_grams=quantity_grams,
            calories=round(cal * scale, 1),
            protein_grams=round(p * scale, 2),
            carbs_grams=round(c * scale, 2),
            fat_grams=round(f * scale, 2),
            vitamins=[],
            minerals=[],
            source="ประมาณการเบื้องต้น (Gemini ไม่พร้อมใช้งาน)",
            confidence=0.35,
            food_group="Unknown",
            health_benefits=[
                "⚠️ ค่าด้านล่างเป็นประมาณการจากชื่อหมวดอาหาร — ไม่ได้คำนวณจาก Gemini",
                "ถ้า Gemini ตอบกลับได้ ค่าจะแม่นขึ้น (ตรวจสอบโควตา/จำกัดต่อนาทีใน Google AI Studio)",
            ],
            warnings=[
                "แดชบอร์ดอาจแสดงโควตารายวันเหลืออยู่ แต่ยังโดนจำกัด requests ต่อนาที (RPM) ได้",
            ],
            daily_recommendations=[],
        )

    def get_provider_name(self) -> str:
        """Get provider name"""
        return "Gemini AI Nutrition Provider (google-genai SDK)"
