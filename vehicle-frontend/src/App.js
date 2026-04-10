import React, { useEffect, useState } from "react";

const BASE_URL = "https://fleetvault-backend.onrender.com";

function formatTime(time) {
  if (!time) return "";
  return new Date(time).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [driverName, setDriverName] = useState("");

  const [startImages, setStartImages] = useState({});
  const [endImages, setEndImages] = useState({});

  const [trips, setTrips] = useState([]);

  useEffect(() => {
    fetchVehicles();
    fetchTrips();
  }, []);

  const fetchVehicles = async () => {
    const res = await fetch(`${BASE_URL}/vehicles`);
    const data = await res.json();
    setVehicles(data);
  };

  const fetchTrips = async () => {
    const res = await fetch(`${BASE_URL}/trips`);
    const data = await res.json();
    setTrips(data);
  };

  const addVehicle = async () => {
    if (!vehicleNumber) return alert("Enter vehicle number");

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
    if (!driverName || Object.keys(startImages).length !== 4) {
      return alert("Fill driver name + upload all 4 START images");
    }

    const form = new FormData();
    form.append("vehicle_number", selectedVehicle);
    form.append("driver_name", driverName);

    form.append("front", startImages.front);
    form.append("back", startImages.back);
    form.append("left", startImages.left);
    form.append("right", startImages.right);

    await fetch(`${BASE_URL}/start_trip`, {
      method: "POST",
      body: form,
    });

    setSelectedVehicle(null);
    setDriverName("");
    setStartImages({});
    fetchVehicles();
    fetchTrips();
  };

  const endTrip = async (vehicle_number) => {
    const imgs = endImages[vehicle_number];

    if (!imgs || Object.keys(imgs).length !== 4) {
      return alert("Upload all 4 END images");
    }

    const form = new FormData();
    form.append("vehicle_number", vehicle_number);

    form.append("front", imgs.front);
    form.append("back", imgs.back);
    form.append("left", imgs.left);
    form.append("right", imgs.right);

    await fetch(`${BASE_URL}/end_trip`, {
      method: "POST",
      body: form,
    });

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
        placeholder="Vehicle Number"
        value={vehicleNumber}
        onChange={(e) => setVehicleNumber(e.target.value)}
      />
      <button onClick={addVehicle}>Add</button>

      {/* VEHICLES */}
      <h2>Vehicles</h2>
      {vehicles.map((v) => (
        <div key={v.id}>
          <b>{v.vehicle_number}</b> —{" "}
          {v.available ? "🟢 Available" : "🔴 On Trip"}

          {v.available && (
            <button onClick={() => setSelectedVehicle(v.vehicle_number)}>
              Start Trip
            </button>
          )}

          {!v.available && (
            <>
              <br />
              <b>Upload END Images:</b>
              <br />

              Front:
              <input
                type="file"
                onChange={(e) =>
                  setEndImages((prev) => ({
                    ...prev,
                    [v.vehicle_number]: {
                      ...prev[v.vehicle_number],
                      front: e.target.files[0],
                    },
                  }))
                }
              />
              <br />

              Back:
              <input
                type="file"
                onChange={(e) =>
                  setEndImages((prev) => ({
                    ...prev,
                    [v.vehicle_number]: {
                      ...prev[v.vehicle_number],
                      back: e.target.files[0],
                    },
                  }))
                }
              />
              <br />

              Left:
              <input
                type="file"
                onChange={(e) =>
                  setEndImages((prev) => ({
                    ...prev,
                    [v.vehicle_number]: {
                      ...prev[v.vehicle_number],
                      left: e.target.files[0],
                    },
                  }))
                }
              />
              <br />

              Right:
              <input
                type="file"
                onChange={(e) =>
                  setEndImages((prev) => ({
                    ...prev,
                    [v.vehicle_number]: {
                      ...prev[v.vehicle_number],
                      right: e.target.files[0],
                    },
                  }))
                }
              />
              <br />

              <button onClick={() => endTrip(v.vehicle_number)}>
                End Trip
              </button>
            </>
          )}

          <hr />
        </div>
      ))}

      {/* START TRIP */}
      {selectedVehicle && (
        <>
          <h2>Start Trip: {selectedVehicle}</h2>

          <input
            placeholder="Driver Name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />

          <br />
          <b>Upload START Images:</b>
          <br />

          Front:
          <input
            type="file"
            onChange={(e) =>
              setStartImages({ ...startImages, front: e.target.files[0] })
            }
          />
          <br />

          Back:
          <input
            type="file"
            onChange={(e) =>
              setStartImages({ ...startImages, back: e.target.files[0] })
            }
          />
          <br />

          Left:
          <input
            type="file"
            onChange={(e) =>
              setStartImages({ ...startImages, left: e.target.files[0] })
            }
          />
          <br />

          Right:
          <input
            type="file"
            onChange={(e) =>
              setStartImages({ ...startImages, right: e.target.files[0] })
            }
          />
          <br />

          <button onClick={startTrip}>Start Trip</button>
        </>
      )}

      {/* ONGOING */}
      <h2>Ongoing Trips</h2>
      {ongoing.map((t) => (
        <div key={t.id}>
          🚗 {t.vehicle_number} — {t.driver_name}
          <br />
          Start: {formatTime(t.start_time)}
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