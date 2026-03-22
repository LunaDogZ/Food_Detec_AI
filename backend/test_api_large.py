import requests
import io
import numpy as np
from PIL import Image

print("Generating large random noise image...")
# Create a 1080x1920 random noise image to simulate a large camera photo
data = np.random.randint(0, 255, (1920, 1080, 3), dtype=np.uint8)
img = Image.fromarray(data, 'RGB')
buf = io.BytesIO()
img.save(buf, format='JPEG', quality=95)
buf.seek(0)
print(f"Generated image size: {len(buf.getvalue()) / 1024:.2f} KB")

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
