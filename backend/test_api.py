import requests
from PIL import Image
import io

img = Image.new('RGB', (100, 100), color='blue')
buf = io.BytesIO()
img.save(buf, format='JPEG')
buf.seek(0)

print("Sending POST request to localhost:8000...")
try:
    res = requests.post(
        "http://localhost:8000/api/v1/analyze/image",
        files={"file": ("test.jpg", buf, "image/jpeg")}
    )
    print("Status code:", res.status_code)
    data = res.json()
    print("Keys in response:", list(data.keys()))
    if data.get("annotated_image"):
        print("Success! Annotated image length:", len(data["annotated_image"]))
    else:
        print("FAIL: annotated_image is missing or None.")
except Exception as e:
    print("Error:", e)
