from fastapi import FastAPI, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from datetime import datetime
import pytz
import shutil
import os
import cv2
import numpy as np

# ================= APP =================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= DB =================
DATABASE_URL = "sqlite:///./rental.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # important for sqlite
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ================= TIMEZONE =================
IST = pytz.timezone("Asia/Kolkata")

# ================= FILE STORAGE =================
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ================= MODELS =================
class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True)
    vehicle_number = Column(String, unique=True)
    available = Column(Boolean, default=True)


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True)

    vehicle_number = Column(String)
    driver_name = Column(String)
    status = Column(String)

    start_time = Column(String)
    end_time = Column(String)

    start_front = Column(String)
    start_back = Column(String)
    start_left = Column(String)
    start_right = Column(String)

    end_front = Column(String)
    end_back = Column(String)
    end_left = Column(String)
    end_right = Column(String)

    damage_detected = Column(Boolean, default=False)
    damage_score = Column(Float, default=0.0)


Base.metadata.create_all(bind=engine)


# ================= DB DEPENDENCY =================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ================= HELPERS =================
def save_file(file: UploadFile):
    filename = f"{datetime.now().timestamp()}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return path


def compare_images(img1_path, img2_path):
    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)

    if img1 is None or img2 is None:
        return 0

    img1 = cv2.resize(img1, (300, 300))
    img2 = cv2.resize(img2, (300, 300))

    diff = cv2.absdiff(img1, img2)
    return float(np.mean(diff))


# ================= ROUTES =================

@app.post("/add_vehicle")
def add_vehicle(
    vehicle_number: str = Form(...),
    db: Session = Depends(get_db)
):
    existing = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()

    if existing:
        return {"error": "Vehicle already exists"}

    db.add(Vehicle(vehicle_number=vehicle_number))
    db.commit()

    return {"message": "Vehicle added"}


@app.get("/vehicles")
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()


@app.post("/start_trip")
def start_trip(
    vehicle_number: str = Form(...),
    driver_name: str = Form(...),
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()

    if not vehicle:
        return {"error": "Vehicle not found"}

    if not vehicle.available:
        return {"error": "Vehicle already in trip"}

    # Save images
    front_path = save_file(front)
    back_path = save_file(back)
    left_path = save_file(left)
    right_path = save_file(right)

    trip = Trip(
        vehicle_number=vehicle_number,
        driver_name=driver_name,
        status="ongoing",
        start_time=datetime.now(IST).isoformat(),

        start_front=front_path,
        start_back=back_path,
        start_left=left_path,
        start_right=right_path
    )

    vehicle.available = False

    db.add(trip)
    db.commit()

    return {"message": "Trip started"}


@app.post("/end_trip")
def end_trip(
    vehicle_number: str = Form(...),
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter_by(
        vehicle_number=vehicle_number,
        status="ongoing"
    ).first()

    if not trip:
        return {"error": "No active trip found"}

    # Save end images
    front_path = save_file(front)
    back_path = save_file(back)
    left_path = save_file(left)
    right_path = save_file(right)

    trip.end_front = front_path
    trip.end_back = back_path
    trip.end_left = left_path
    trip.end_right = right_path

    # AI comparison
    scores = [
        compare_images(trip.start_front, front_path),
        compare_images(trip.start_back, back_path),
        compare_images(trip.start_left, left_path),
        compare_images(trip.start_right, right_path),
    ]

    avg_score = sum(scores) / len(scores)
    damage = avg_score > 20

    trip.damage_detected = damage
    trip.damage_score = avg_score
    trip.status = "completed"
    trip.end_time = datetime.now(IST).isoformat()

    vehicle = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()
    vehicle.available = True

    db.commit()

    return {
        "message": "Trip ended",
        "damage": damage,
        "score": avg_score
    }


@app.get("/trips")
def get_trips(db: Session = Depends(get_db)):
    return db.query(Trip).all()