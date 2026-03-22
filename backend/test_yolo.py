import asyncio
from app.providers.yolo_local_provider import YoloLocalProvider

async def main():
    provider = YoloLocalProvider()
    with open('/home/lunadogz/Food-AI/sample_food.jpg', 'rb') as f:
        print("Calling detect_food on sample image...")
        foods, b64 = await provider.detect_food(f)
        print("Foods detected:", len(foods))
        print("B64 size:", len(b64) if b64 else "None")

if __name__ == "__main__":
    asyncio.run(main())
