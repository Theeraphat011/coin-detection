from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO
import io
from PIL import Image

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

model = YOLO("runs/detect/train/weights/best.pt")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    img_bytes = await file.read()
    img = Image.open(io.BytesIO(img_bytes))
    results = model(img)
    return results[0].tojson()
