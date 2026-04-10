from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import shutil, os
import cv2
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float
from sqlalchemy.orm import sessionmaker, declarative_base

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

engine = create_engine("sqlite:///./rental.db")
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


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


# ================= HELPERS =================

def save_file(file: UploadFile):
    path = f"{UPLOAD_DIR}/{datetime.now().timestamp()}_{file.filename}"
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


# ================= API =================

@app.post("/add_vehicle")
def add_vehicle(vehicle_number: str = Form(...)):
    db = SessionLocal()

    if db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first():
        return {"error": "Vehicle already exists"}

    db.add(Vehicle(vehicle_number=vehicle_number))
    db.commit()

    return {"message": "Vehicle added"}


@app.get("/vehicles")
def get_vehicles():
    db = SessionLocal()
    return db.query(Vehicle).all()


@app.post("/start_trip")
def start_trip(
    vehicle_number: str = Form(...),
    driver_name: str = Form(...),
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...)
):
    db = SessionLocal()

    vehicle = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()

    if not vehicle:
        return {"error": "Vehicle not found"}

    if not vehicle.available:
        return {"error": "Vehicle already in trip"}

    trip = Trip(
        vehicle_number=vehicle_number,
        driver_name=driver_name,
        status="ongoing",
        start_time=datetime.utcnow().isoformat(),

        start_front=save_file(front),
        start_back=save_file(back),
        start_left=save_file(left),
        start_right=save_file(right)
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
    right: UploadFile = File(...)
):
    db = SessionLocal()

    trip = db.query(Trip).filter_by(
        vehicle_number=vehicle_number,
        status="ongoing"
    ).first()

    if not trip:
        return {"error": "No active trip found"}

    trip.end_front = save_file(front)
    trip.end_back = save_file(back)
    trip.end_left = save_file(left)
    trip.end_right = save_file(right)

    scores = [
        compare_images(trip.start_front, trip.end_front),
        compare_images(trip.start_back, trip.end_back),
        compare_images(trip.start_left, trip.end_left),
        compare_images(trip.start_right, trip.end_right),
    ]

    avg_score = sum(scores) / len(scores)
    damage = avg_score > 20

    trip.damage_detected = damage
    trip.damage_score = avg_score
    trip.status = "completed"
    trip.end_time = datetime.utcnow().isoformat()

    vehicle = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()
    vehicle.available = True

    db.commit()

    return {
        "message": "Trip ended",
        "damage": damage,
        "score": avg_score
    }


@app.get("/trips")
def get_trips():
    db = SessionLocal()
    return db.query(Trip).all()