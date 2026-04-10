import React, { useEffect, useState } from "react";

const BASE_URL = "https://fleetvault-backend.onrender.com";

function formatTime(time) {
  if (!time) return "";

  const date = new Date(time);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [endTripId, setEndTripId] = useState(null);

  const fetchData = async () => {
    const v = await fetch(`${BASE_URL}/vehicles`);
    const t = await fetch(`${BASE_URL}/trips`);

    setVehicles(await v.json());
    setTrips(await t.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addVehicle = async () => {
    if (!vehicleNumber) return;

    const form = new FormData();
    form.append("vehicle_number", vehicleNumber);

    await fetch(`${BASE_URL}/add_vehicle`, {
      method: "POST",
      body: form,
    });

    setVehicleNumber("");
    fetchData();
  };

  const startTrip = async (v) => {
    const form = new FormData();
    form.append("vehicle_number", v.vehicle_number);
    form.append("driver_name", driverName || "Driver");

    await fetch(`${BASE_URL}/start_trip`, {
      method: "POST",
      body: form,
    });

    setDriverName("");
    fetchData();
  };

  const confirmEndTrip = async (vehicle_number) => {
    const form = new FormData();
    form.append("vehicle_number", vehicle_number);

    await fetch(`${BASE_URL}/end_trip`, {
      method: "POST",
      body: form,
    });

    setEndTripId(null);
    fetchData();
  };

  const ongoing = trips.filter((t) => t.status === "ongoing");
  const completed = trips.filter((t) => t.status === "completed");

  return (
    <div style={{ padding: 20 }}>
      <h1>🚗 FleetVault</h1>

      {/* ADD VEHICLE */}
      <h2>Add Vehicle</h2>
      <input
        value={vehicleNumber}
        onChange={(e) => setVehicleNumber(e.target.value)}
        placeholder="Vehicle Number"
      />
      <button onClick={addVehicle}>Add</button>

      {/* VEHICLES */}
      <h2>Vehicles</h2>
      {vehicles.map((v) => (
        <div key={v.id}>
          {v.vehicle_number} —{" "}
          {v.available ? "🟢 Available" : "🔴 On Trip"}

          {v.available && (
            <>
              <input
                placeholder="Driver"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
              <button onClick={() => startTrip(v)}>Start Trip</button>
            </>
          )}
        </div>
      ))}

      {/* ONGOING TRIPS */}
      <h2>Ongoing Trips</h2>
      {ongoing.map((t) => (
        <div key={t.id}>
          🚗 {t.vehicle_number} — {t.driver_name}
          <br />
          Start: {formatTime(t.start_time)}

          {/* 🔥 END TRIP BUTTON FIX */}
          <br />
          <button onClick={() => setEndTripId(t.vehicle_number)}>
            End Trip
          </button>

          {/* 🔥 SHOW ONLY FOR CLICKED ONE */}
          {endTripId === t.vehicle_number && (
            <div style={{ marginTop: 10 }}>
              <button onClick={() => confirmEndTrip(t.vehicle_number)}>
                Confirm End Trip
              </button>
            </div>
          )}

          <hr />
        </div>
      ))}

      {/* COMPLETED */}
      <h2>Completed Trips</h2>
      {completed.map((t) => (
        <div key={t.id}>
          🚗 {t.vehicle_number}
          <br />
          Driver: {t.driver_name}
          <br />
          Start: {formatTime(t.start_time)}
          <br />
          End: {formatTime(t.end_time)}
          <br />
          Damage: {t.damage_detected ? "⚠️ YES" : "NO"}
          <br />
          Fine: ₹ {t.fine_amount}
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;