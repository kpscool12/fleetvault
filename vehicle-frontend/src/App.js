import React, { useEffect, useState } from "react";

const BASE_URL = "https://fleetvault-backend.onrender.com";

function formatTime(time) {
  if (!time) return "";

  const date = new Date(time);

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
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

  const [startMode, setStartMode] = useState(null);
  const [endMode, setEndMode] = useState(null);

  const [driverName, setDriverName] = useState("");
  const [startImages, setStartImages] = useState({});
  const [endImages, setEndImages] = useState({});

  useEffect(() => {
    fetchVehicles();
    fetchTrips();
  }, []);

  const fetchVehicles = async () => {
    const res = await fetch(`${BASE_URL}/vehicles`);
    setVehicles(await res.json());
  };

  const fetchTrips = async () => {
    const res = await fetch(`${BASE_URL}/trips`);
    setTrips(await res.json());
  };

  const addVehicle = async () => {
    const form = new FormData();
    form.append("vehicle_number", vehicleNumber);

    await fetch(`${BASE_URL}/add_vehicle`, {
      method: "POST",
      body: form,
    });

    setVehicleNumber("");
    fetchVehicles();
  };

  const startTrip = async () => {
    const form = new FormData();
    form.append("vehicle_number", startMode);
    form.append("driver_name", driverName);

    form.append("front", startImages.front);
    form.append("back", startImages.back);
    form.append("left", startImages.left);
    form.append("right", startImages.right);

    await fetch(`${BASE_URL}/start_trip`, {
      method: "POST",
      body: form,
    });

    setStartMode(null);
    setDriverName("");
    setStartImages({});

    fetchVehicles();
    fetchTrips();
  };

  const endTrip = async () => {
    const form = new FormData();
    form.append("vehicle_number", endMode);

    form.append("front", endImages.front);
    form.append("back", endImages.back);
    form.append("left", endImages.left);
    form.append("right", endImages.right);

    await fetch(`${BASE_URL}/end_trip`, {
      method: "POST",
      body: form,
    });

    setEndMode(null);
    setEndImages({});

    fetchVehicles();
    fetchTrips();
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
          <b>{v.vehicle_number}</b> —{" "}
          {v.available ? "🟢 Available" : "🔴 On Trip"}

          {v.available && (
            <button onClick={() => setStartMode(v.vehicle_number)}>
              Start Trip
            </button>
          )}

          {!v.available && (
            <>
              <button onClick={() => setEndMode(v.vehicle_number)}>
                End Trip
              </button>

              {/* END FLOW HERE */}
              {endMode === v.vehicle_number && (
                <div>
                  <h4>Upload END Images</h4>

                  Front Image{" "}
                  <input
                    type="file"
                    onChange={(e) =>
                      setEndImages({
                        ...endImages,
                        front: e.target.files[0],
                      })
                    }
                  />
                  <br />

                  Back Image{" "}
                  <input
                    type="file"
                    onChange={(e) =>
                      setEndImages({
                        ...endImages,
                        back: e.target.files[0],
                      })
                    }
                  />
                  <br />

                  Left Image{" "}
                  <input
                    type="file"
                    onChange={(e) =>
                      setEndImages({
                        ...endImages,
                        left: e.target.files[0],
                      })
                    }
                  />
                  <br />

                  Right Image{" "}
                  <input
                    type="file"
                    onChange={(e) =>
                      setEndImages({
                        ...endImages,
                        right: e.target.files[0],
                      })
                    }
                  />
                  <br />

                  <button onClick={endTrip}>Confirm End Trip</button>
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
          <h2>Start Trip: {startMode}</h2>

          <input
            placeholder="Driver Name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />

          <br />
          Front Image <input type="file" onChange={(e) => setStartImages({ ...startImages, front: e.target.files[0] })} />
          <br />
          Back Image <input type="file" onChange={(e) => setStartImages({ ...startImages, back: e.target.files[0] })} />
          <br />
          Left Image <input type="file" onChange={(e) => setStartImages({ ...startImages, left: e.target.files[0] })} />
          <br />
          Right Image <input type="file" onChange={(e) => setStartImages({ ...startImages, right: e.target.files[0] })} />
          <br />

          <button onClick={startTrip}>Confirm Start Trip</button>
        </div>
      )}

      {/* ONGOING */}
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

          {endMode === t.vehicle_number && (
            <div>
              <h4>Upload END Images</h4>

              Front Image{" "}
              <input type="file" onChange={(e) => setEndImages({ ...endImages, front: e.target.files[0] })} />
              <br />
              Back Image{" "}
              <input type="file" onChange={(e) => setEndImages({ ...endImages, back: e.target.files[0] })} />
              <br />
              Left Image{" "}
              <input type="file" onChange={(e) => setEndImages({ ...endImages, left: e.target.files[0] })} />
              <br />
              Right Image{" "}
              <input type="file" onChange={(e) => setEndImages({ ...endImages, right: e.target.files[0] })} />
              <br />

              <button onClick={endTrip}>Confirm End Trip</button>
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
          Damage: {t.damage_detected ? "⚠️ YES" : "✅ NO"}
          <br />
          Score: {t.damage_score?.toFixed(2)}
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;