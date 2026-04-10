import React, { useEffect, useState } from "react";

const BASE_URL = "https://fleetvault-backend.onrender.com"; // 🔥 replace with your Render URL

// ✅ SAFE TIME FORMAT (NO BUGS)
function formatTime(time) {
  if (!time) return "";

  const [datePart, timePart] = time.split("T");
  const [year, month, day] = datePart.split("-");
  const [hour, minute] = timePart.split(":");

  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return `${day} ${months[month - 1]} ${year}, ${h}:${minute} ${ampm}`;
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");

  const [startMode, setStartMode] = useState(null);

  // 🔥 separate states (IMPORTANT)
  const [vehicleEndMode, setVehicleEndMode] = useState(null);
  const [tripEndMode, setTripEndMode] = useState(null);

  const [startImages, setStartImages] = useState({});
  const [endImages, setEndImages] = useState({});

  // ================= FETCH =================
  const fetchData = async () => {
    const v = await fetch(`${BASE_URL}/vehicles`).then(r => r.json());
    const t = await fetch(`${BASE_URL}/trips`).then(r => r.json());
    setVehicles(v);
    setTrips(t);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= ADD VEHICLE =================
  const addVehicle = async () => {
    const f = new FormData();
    f.append("vehicle_number", vehicleNumber);

    await fetch(`${BASE_URL}/add_vehicle`, {
      method: "POST",
      body: f,
    });

    setVehicleNumber("");
    fetchData();
  };

  // ================= START TRIP =================
  const startTrip = async () => {
    const f = new FormData();

    f.append("vehicle_number", startMode);
    f.append("driver_name", driverName);

    Object.entries(startImages).forEach(([k, v]) => {
      f.append(k, v);
    });

    await fetch(`${BASE_URL}/start_trip`, {
      method: "POST",
      body: f,
    });

    setStartMode(null);
    setStartImages({});
    setDriverName("");
    fetchData();
  };

  // ================= END TRIP =================
  const endTrip = async (vehicle) => {
    const f = new FormData();

    f.append("vehicle_number", vehicle);

    Object.entries(endImages).forEach(([k, v]) => {
      f.append(k, v);
    });

    await fetch(`${BASE_URL}/end_trip`, {
      method: "POST",
      body: f,
    });

    setVehicleEndMode(null);
    setTripEndMode(null);
    setEndImages({});
    fetchData();
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

          {/* START */}
          {v.available && (
            <button onClick={() => setStartMode(v.vehicle_number)}>
              Start Trip
            </button>
          )}

          {/* END */}
          {!v.available && (
            <>
              <button
                onClick={() => {
                  setVehicleEndMode(v.vehicle_number);
                  setTripEndMode(null);
                }}
              >
                End Trip
              </button>

              {vehicleEndMode === v.vehicle_number && (
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

      {/* START FLOW */}
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

          <br />

          <button
            onClick={() => {
              setTripEndMode(t.vehicle_number);
              setVehicleEndMode(null);
            }}
          >
            End Trip
          </button>

          {tripEndMode === t.vehicle_number && (
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