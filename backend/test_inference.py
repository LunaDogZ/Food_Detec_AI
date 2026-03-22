import asyncio, io, base64
from PIL import Image
import os
from app.providers.yolo_local_provider import YoloLocalProvider

async def main():
    if not os.path.exists("../best.pt"):
        print("Model not found")
        return
        
    # Create test image
    img = Image.new('RGB', (100, 100), color='red')
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    
    provider = YoloLocalProvider()
    foods, b64 = await provider.detect_food(buf)
    
    if b64:
        print("PREFIX:", b64[:50])
        print("LENGTH:", len(b64))
        # Check if valid base64
        try:
            raw = b64.split(",")[1]
            base64.b64decode(raw)
            print("DECODE OK")
        except Exception as e:
            print("DECODE ERR:", e)
    else:
        print("returned None for image")

asyncio.run(main())
