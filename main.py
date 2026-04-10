from fastapi import FastAPI, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from datetime import datetime
import shutil, os, cv2, numpy as np

app = FastAPI()

# ---------------- DATABASE ----------------
DATABASE_URL = "sqlite:///./rental.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Vehicle(Base):
    __tablename__ = "vehicles"
    vehicle_number = Column(String, primary_key=True)

class Trip(Base):
    __tablename__ = "trips"

    id = Column(String, primary_key=True)
    vehicle_number = Column(String)
    driver_name = Column(String)

    start_front = Column(String)
    start_back = Column(String)
    start_left = Column(String)
    start_right = Column(String)

    end_front = Column(String)
    end_back = Column(String)
    end_left = Column(String)
    end_right = Column(String)

    status = Column(String)
    start_time = Column(String)
    end_time = Column(String)

Base.metadata.create_all(bind=engine)

# ---------------- DB SESSION ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- FILE STORAGE ----------------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_file(file: UploadFile):
    path = f"{UPLOAD_DIR}/{datetime.now().timestamp()}_{file.filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return path

# ---------------- AI ----------------
def compare_images(p1, p2):
    img1 = cv2.imread(p1)
    img2 = cv2.imread(p2)

    if img1 is None or img2 is None:
        return 0

    img1 = cv2.resize(img1, (300, 300))
    img2 = cv2.resize(img2, (300, 300))

    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    diff = cv2.absdiff(gray1, gray2)
    return float(np.mean(diff))

def detect_damage(trip):
    scores = {}
    damaged = []

    pairs = {
        "front": (trip.start_front, trip.end_front),
        "back": (trip.start_back, trip.end_back),
        "left": (trip.start_left, trip.end_left),
        "right": (trip.start_right, trip.end_right),
    }

    for k, (s, e) in pairs.items():
        score = compare_images(s, e)
        scores[k] = score
        if score > 25:
            damaged.append(k)

    return {
        "damage_detected": len(damaged) > 0,
        "damaged": damaged,
        "scores": scores
    }

# ---------------- VEHICLES ----------------
@app.post("/vehicles")
def add_vehicle(vehicle_number: str = Form(...), db: Session = Depends(get_db)):
    db.add(Vehicle(vehicle_number=vehicle_number))
    db.commit()
    return {"msg": "added"}

@app.get("/vehicles")
def get_vehicles(db: Session = Depends(get_db)):
    return [v.vehicle_number for v in db.query(Vehicle).all()]

# ---------------- START TRIP ----------------
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
    trip = Trip(
        id=str(datetime.now().timestamp()),
        vehicle_number=vehicle_number,
        driver_name=driver_name,

        start_front=save_file(front),
        start_back=save_file(back),
        start_left=save_file(left),
        start_right=save_file(right),

        status="started",
        start_time=str(datetime.now())
    )

    db.add(trip)
    db.commit()
    return {"msg": "trip started"}

# ---------------- END TRIP ----------------
@app.post("/end_trip")
def end_trip(
    vehicle_number: str = Form(...),
    front: UploadFile = File(...),
    back: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter(
        Trip.vehicle_number == vehicle_number,
        Trip.status == "started"
    ).first()

    if not trip:
        return {"error": "No active trip"}

    trip.end_front = save_file(front)
    trip.end_back = save_file(back)
    trip.end_left = save_file(left)
    trip.end_right = save_file(right)

    trip.status = "completed"
    trip.end_time = str(datetime.now())

    db.commit()

    return detect_damage(trip)

# ---------------- TRIPS ----------------
@app.get("/trips")
def get_trips(db: Session = Depends(get_db)):
    return db.query(Trip).all()

@app.get("/")
def home():
    return {"msg": "Backend running"}