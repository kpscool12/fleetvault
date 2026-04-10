from fastapi import FastAPI, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import pytz

app = FastAPI()

# ===== CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== DB =====
DATABASE_URL = "sqlite:///./rental.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# ===== TIMEZONE =====
IST = pytz.timezone("Asia/Kolkata")

# ===== MODELS =====
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

    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)

    status = Column(String, default="ongoing")
    damage_detected = Column(Boolean, default=False)
    fine_amount = Column(Float, default=0)

Base.metadata.create_all(bind=engine)

# ===== ROUTES =====

@app.get("/vehicles")
def get_vehicles():
    db = SessionLocal()
    return db.query(Vehicle).all()

@app.get("/trips")
def get_trips():
    db = SessionLocal()
    return db.query(Trip).all()

@app.post("/add_vehicle")
def add_vehicle(vehicle_number: str = Form(...)):
    db = SessionLocal()

    if db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first():
        return {"error": "Vehicle exists"}

    db.add(Vehicle(vehicle_number=vehicle_number))
    db.commit()

    return {"message": "added"}

# ===== START TRIP =====
@app.post("/start_trip")
async def start_trip(
    vehicle_number: str = Form(...),
    driver_name: str = Form(...),
    front: UploadFile = File(None),
    back: UploadFile = File(None),
    left: UploadFile = File(None),
    right: UploadFile = File(None),
):
    db = SessionLocal()

    vehicle = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()

    if not vehicle:
        return {"error": "Vehicle not found"}

    if not vehicle.available:
        return {"error": "Already on trip"}

    trip = Trip(
        vehicle_number=vehicle_number,
        driver_name=driver_name,
        start_time=datetime.now(IST),
        status="ongoing"
    )

    db.add(trip)
    vehicle.available = False

    db.commit()
    return {"message": "started"}

# ===== END TRIP =====
@app.post("/end_trip")
async def end_trip(
    vehicle_number: str = Form(...),
    front: UploadFile = File(None),
    back: UploadFile = File(None),
    left: UploadFile = File(None),
    right: UploadFile = File(None),
):
    db = SessionLocal()

    trip = db.query(Trip).filter_by(
        vehicle_number=vehicle_number,
        status="ongoing"
    ).first()

    if not trip:
        return {"error": "No active trip"}

    # dummy AI
    damage = bool(front or back or left or right)
    fine = 500 if damage else 0

    trip.end_time = datetime.now(IST)
    trip.status = "completed"
    trip.damage_detected = damage
    trip.fine_amount = fine

    vehicle = db.query(Vehicle).filter_by(vehicle_number=vehicle_number).first()
    if vehicle:
        vehicle.available = True

    db.commit()

    return {"message": "ended"}