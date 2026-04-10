import React, { useEffect, useState } from "react";

const BASE_URL = "https://fleetvault-backend.onrender.com";

function formatTime(time) {
  if (!time) return "";
  return new Date(time).toLocaleString("en-IN", {
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
  const [vehicleInput, setVehicleInput] = useState("");
  const [driverInput, setDriverInput] = useState("");
  const [activeEnd, setActiveEnd] = useState(null);

  const fetchData = async () => {
    const v = await fetch(`${BASE_URL}/vehicles`);
    const t = await fetch(`${BASE_URL}/trips`);

    setVehicles(await v.json());
    setTrips(await t.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ ADD VEHICLE
  const addVehicle = async () => {
    if (!vehicleInput) return;

    const form = new FormData();
    form.append("vehicle_number", vehicleInput);

    await fetch(`${BASE_URL}/add_vehicle`, {
      method: "POST",
      body: form,
    });

    setVehicleInput("");
    fetchData();
  };

  // ✅ START TRIP (FIXED)
  const startTrip = async (vehicle) => {
    if (!driverInput) {
      alert("Enter driver name");
      return;
    }

    const form = new FormData();
    form.append("vehicle_number", vehicle.vehicle_number);
    form.append("driver_name", driverInput); // 🔥 THIS WAS THE ISSUE

    const res = await fetch(`${BASE_URL}/start_trip`, {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    setDriverInput("");
    fetchData();
  };

  // ✅ END TRIP
  const endTrip = async (vehicle_number) => {
    const form = new FormData();
    form.append("vehicle_number", vehicle_number);

    await fetch(`${BASE_URL}/end_trip`, {
      method: "POST",
      body: form,
    });

    setActiveEnd(null);
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
        value={vehicleInput}
        onChange={(e) => setVehicleInput(e.target.value)}
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
                placeholder="Driver Name"
                value={driverInput}
                onChange={(e) => setDriverInput(e.target.value)}
              />
              <button onClick={() => startTrip(v)}>
                Confirm Start Trip
              </button>
            </>
          )}
        </div>
      ))}

      {/* ONGOING */}
      <h2>Ongoing Trips</h2>
      {ongoing.map((t) => (
        <div key={t.id}>
          🚗 {t.vehicle_number} — {t.driver_name}
          <br />
          Start: {formatTime(t.start_time)}

          <br />
          <button onClick={() => setActiveEnd(t.vehicle_number)}>
            End Trip
          </button>

          {activeEnd === t.vehicle_number && (
            <div>
              <button onClick={() => endTrip(t.vehicle_number)}>
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