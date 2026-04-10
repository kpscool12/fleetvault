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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///./rental.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

IST = pytz.timezone("Asia/Kolkata")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    fine_amount = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def save_file(file: UploadFile):
    filename = f"{datetime.now().timestamp()}_{file.filename}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path

def compare_images(a, b):
    img1 = cv2.imread(a)
    img2 = cv2.imread(b)
    if img1 is None or img2 is None:
        return 0
    img1 = cv2.resize(img1, (300, 300))
    img2 = cv2.resize(img2, (300, 300))
    diff = cv2.absdiff(img1, img2)
    return float(np.mean(diff))

@app.post("/add_vehicle")
def add_vehicle(vehicle_number: str = Form(...), db: Session = Depends(get_db)):
    if db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first():
        return {"error": "exists"}
    db.add(Vehicle(vehicle_number=vehicle_number))
    db.commit()
    return {"msg": "added"}

@app.get("/vehicles")
def vehicles(db: Session = Depends(get_db)):
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
    v = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()
    if not v or not v.available:
        return {"error": "not available"}

    trip = Trip(
        vehicle_number=vehicle_number,
        driver_name=driver_name,
        status="ongoing",
        start_time=datetime.now(IST).isoformat(),
        start_front=save_file(front),
        start_back=save_file(back),
        start_left=save_file(left),
        start_right=save_file(right)
    )

    v.available = False
    db.add(trip)
    db.commit()

    return {"msg": "started"}

@app.post("/end_trip")
def end_trip(
    vehicle_number: str = Form(...),
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter_by(vehicle_number=vehicle_number, status="ongoing").first()
    if not trip:
        return {"error": "no trip"}

    f = save_file(front)
    b = save_file(back)
    l = save_file(left)
    r = save_file(right)

    scores = [
        compare_images(trip.start_front, f),
        compare_images(trip.start_back, b),
        compare_images(trip.start_left, l),
        compare_images(trip.start_right, r),
    ]

    avg = sum(scores) / 4

    fine = 0
    if avg > 50:
        fine = 2000
    elif avg > 30:
        fine = 1000
    elif avg > 20:
        fine = 500

    trip.end_front = f
    trip.end_back = b
    trip.end_left = l
    trip.end_right = r
    trip.damage_score = avg
    trip.damage_detected = avg > 20
    trip.fine_amount = fine
    trip.status = "completed"
    trip.end_time = datetime.now(IST).isoformat()

    v = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()
    v.available = True

    db.commit()

    return {"damage": trip.damage_detected, "fine": fine}

@app.get("/trips")
def trips(db: Session = Depends(get_db)):
    return db.query(Trip).all()