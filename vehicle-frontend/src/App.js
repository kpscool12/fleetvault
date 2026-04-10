import React, { useEffect, useState } from "react";

const BASE_URL = "YOUR_BACKEND_URL"; // 🔥 replace

function formatTime(t) {
  if (!t) return "";
  const d = new Date(t.replace("Z", ""));
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driver, setDriver] = useState("");

  const [startMode, setStartMode] = useState(null);
  const [endMode, setEndMode] = useState(null);

  const [startImages, setStartImages] = useState({});
  const [endImages, setEndImages] = useState({});

  const fetchData = async () => {
    const v = await fetch(`${BASE_URL}/vehicles`).then((r) => r.json());
    const t = await fetch(`${BASE_URL}/trips`).then((r) => r.json());
    setVehicles(v);
    setTrips(t);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addVehicle = async () => {
    const f = new FormData();
    f.append("vehicle_number", vehicleNumber);
    await fetch(`${BASE_URL}/add_vehicle`, { method: "POST", body: f });
    fetchData();
  };

  const startTrip = async () => {
    const f = new FormData();
    f.append("vehicle_number", startMode);
    f.append("driver_name", driver);
    Object.entries(startImages).forEach(([k, v]) => f.append(k, v));

    await fetch(`${BASE_URL}/start_trip`, { method: "POST", body: f });

    setStartMode(null);
    setStartImages({});
    fetchData();
  };

  const endTrip = async () => {
    const f = new FormData();
    f.append("vehicle_number", endMode);
    Object.entries(endImages).forEach(([k, v]) => f.append(k, v));

    await fetch(`${BASE_URL}/end_trip`, { method: "POST", body: f });

    setEndMode(null);
    setEndImages({});
    fetchData();
  };

  const ongoing = trips.filter((t) => t.status === "ongoing");
  const completed = trips.filter((t) => t.status === "completed");

  return (
    <div style={{ padding: 20 }}>
      <h1>🚗 FleetVault</h1>

      <h2>Add Vehicle</h2>
      <input onChange={(e) => setVehicleNumber(e.target.value)} />
      <button onClick={addVehicle}>Add</button>

      <h2>Vehicles</h2>
      {vehicles.map((v) => (
        <div key={v.id}>
          {v.vehicle_number} — {v.available ? "🟢 Available" : "🔴 On Trip"}

          {v.available && (
            <button onClick={() => setStartMode(v.vehicle_number)}>
              Start Trip
            </button>
          )}

          {!v.available && (
            <button onClick={() => setEndMode(v.vehicle_number)}>
              End Trip
            </button>
          )}
        </div>
      ))}

      {/* START FLOW */}
      {startMode && (
        <div>
          <h3>Start Trip: {startMode}</h3>
          <input
            placeholder="Driver"
            onChange={(e) => setDriver(e.target.value)}
          />

          {["front", "back", "left", "right"].map((side) => (
            <div key={side}>
              {side}{" "}
              <input
                type="file"
                onChange={(e) =>
                  setStartImages({
                    ...startImages,
                    [side]: e.target.files[0],
                  })
                }
              />
            </div>
          ))}

          <button onClick={startTrip}>Confirm Start</button>
        </div>
      )}

      {/* END FLOW */}
      {endMode && (
        <div>
          <h3>End Trip: {endMode}</h3>

          {["front", "back", "left", "right"].map((side) => (
            <div key={side}>
              {side}{" "}
              <input
                type="file"
                onChange={(e) =>
                  setEndImages({
                    ...endImages,
                    [side]: e.target.files[0],
                  })
                }
              />
            </div>
          ))}

          <button onClick={endTrip}>Confirm End</button>
        </div>
      )}

      <h2>Ongoing Trips</h2>
      {ongoing.map((t) => (
        <div key={t.id}>
          🚗 {t.vehicle_number} — {t.driver_name}
          <br />
          Start: {formatTime(t.start_time)}

          <br />

          <button onClick={() => setEndMode(t.vehicle_number)}>
            End Trip
          </button>
          <hr />
        </div>
      ))}

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
          Damage: {t.damage_detected ? "⚠ YES" : "NO"}
          <br />
          Fine: ₹{t.fine_amount}
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;