import React, { useEffect, useState } from "react";

// 🔥 YOUR BACKEND URL
const BASE_URL = "https://fleetvault-backend.onrender.com";

// ✅ FINAL TIME FIX (NO BUGS, NO SHIFT)
function formatTime(time) {
  if (!time) return "";

  // Treat backend time as UTC, convert to IST manually
  const utc = new Date(time + "Z");

  const ist = new Date(utc.getTime() + 5.5 * 60 * 60 * 1000);

  return ist.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");

  const [startMode, setStartMode] = useState(null);
  const [endMode, setEndMode] = useState(null);

  const [startImages, setStartImages] = useState({});
  const [endImages, setEndImages] = useState({});

  // ================= FETCH =================
  const fetchData = async () => {
    try {
      const v = await fetch(`${BASE_URL}/vehicles`).then(r => r.json());
      const t = await fetch(`${BASE_URL}/trips`).then(r => r.json());

      setVehicles(v);
      setTrips(t);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= ADD VEHICLE =================
  const addVehicle = async () => {
    if (!vehicleNumber) {
      alert("Enter vehicle number");
      return;
    }

    try {
      const form = new FormData();
      form.append("vehicle_number", vehicleNumber);

      await fetch(`${BASE_URL}/add_vehicle`, {
        method: "POST",
        body: form,
      });

      setVehicleNumber("");
      fetchData();
    } catch {
      alert("Backend issue. Try again.");
    }
  };

  // ================= START TRIP =================
  const startTrip = async () => {
    try {
      const form = new FormData();
      form.append("vehicle_number", startMode);
      form.append("driver_name", driverName);

      Object.entries(startImages).forEach(([k, v]) => {
        form.append(k, v);
      });

      await fetch(`${BASE_URL}/start_trip`, {
        method: "POST",
        body: form,
      });

      setStartMode(null);
      setDriverName("");
      setStartImages({});
      fetchData();
    } catch {
      alert("Start failed");
    }
  };

  // ================= END TRIP =================
  const endTrip = async (vehicle) => {
    try {
      const form = new FormData();
      form.append("vehicle_number", vehicle);

      Object.entries(endImages).forEach(([k, v]) => {
        form.append(k, v);
      });

      await fetch(`${BASE_URL}/end_trip`, {
        method: "POST",
        body: form,
      });

      setEndMode(null);
      setEndImages({});
      fetchData();
    } catch {
      alert("End failed");
    }
  };

  const ongoing = trips.filter(t => t.status === "ongoing");
  const completed = trips.filter(t => t.status === "completed");

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
      {vehicles.map(v => (
        <div key={v.id}>
          <b>{v.vehicle_number}</b> —{" "}
          {v.available ? "🟢 Available" : "🔴 On Trip"}

          {v.available ? (
            <button onClick={() => setStartMode(v.vehicle_number)}>
              Start Trip
            </button>
          ) : (
            <>
              <button onClick={() => setEndMode(v.vehicle_number)}>
                End Trip
              </button>

              {endMode === v.vehicle_number && (
                <div>
                  <h4>Upload END Images</h4>

                  {["front", "back", "left", "right"].map(side => (
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

                  <button onClick={() => endTrip(v.vehicle_number)}>
                    Confirm End Trip
                  </button>
                </div>
              )}
            </>
          )}

          <hr />
        </div>
      ))}

      {/* START TRIP UI */}
      {startMode && (
        <div>
          <h3>Start Trip: {startMode}</h3>

          <input
            placeholder="Driver Name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />

          {["front", "back", "left", "right"].map(side => (
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

          <button onClick={startTrip}>Confirm Start Trip</button>
        </div>
      )}

      {/* ONGOING */}
      <h2>Ongoing Trips</h2>
      {ongoing.map(t => (
        <div key={t.id}>
          🚗 {t.vehicle_number} — {t.driver_name}
          <br />
          Start: {formatTime(t.start_time)}
          <hr />
        </div>
      ))}

      {/* COMPLETED */}
      <h2>Completed Trips</h2>
      {completed.map(t => (
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