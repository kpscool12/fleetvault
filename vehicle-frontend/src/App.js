import React, { useEffect, useState } from "react";

const BASE_URL = "https://fleetvault-backend.onrender.com";

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");

  const [selectedVehicle, setSelectedVehicle] = useState(null);

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
      alert("Fill all fields + upload 4 images");
      return;
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
    if (!endImages[vehicle_number] || Object.keys(endImages[vehicle_number]).length !== 4) {
      alert("Upload all 4 END images");
      return;
    }

    const imgs = endImages[vehicle_number];

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

  const ongoing = trips.filter(t => t.status === "ongoing");
  const completed = trips.filter(t => t.status === "completed");

  return (
    <div style={{ padding: 20 }}>
      <h1>🚗 FleetVault</h1>

      <h2>Add Vehicle</h2>
      <input
        value={vehicleNumber}
        onChange={(e) => setVehicleNumber(e.target.value)}
        placeholder="Vehicle Number"
      />
      <button onClick={addVehicle}>Add</button>

      <h2>Vehicles</h2>
      {vehicles.map((v) => (
        <div key={v.id}>
          {v.vehicle_number} — {v.available ? "🟢 Available" : "🔴 On Trip"}

          {v.available && (
            <button onClick={() => setSelectedVehicle(v.vehicle_number)}>
              Start Trip
            </button>
          )}

          {!v.available && (
            <>
              <br />
              Upload END Images:
              <br />
              Front <input type="file" onChange={(e) =>
                setEndImages(prev => ({
                  ...prev,
                  [v.vehicle_number]: {
                    ...prev[v.vehicle_number],
                    front: e.target.files[0]
                  }
                }))
              } />
              Back <input type="file" onChange={(e) =>
                setEndImages(prev => ({
                  ...prev,
                  [v.vehicle_number]: {
                    ...prev[v.vehicle_number],
                    back: e.target.files[0]
                  }
                }))
              } />
              Left <input type="file" onChange={(e) =>
                setEndImages(prev => ({
                  ...prev,
                  [v.vehicle_number]: {
                    ...prev[v.vehicle_number],
                    left: e.target.files[0]
                  }
                }))
              } />
              Right <input type="file" onChange={(e) =>
                setEndImages(prev => ({
                  ...prev,
                  [v.vehicle_number]: {
                    ...prev[v.vehicle_number],
                    right: e.target.files[0]
                  }
                }))
              } />
              <button onClick={() => endTrip(v.vehicle_number)}>End Trip</button>
            </>
          )}

          <hr />
        </div>
      ))}

      {selectedVehicle && (
        <>
          <h2>Start Trip: {selectedVehicle}</h2>
          <input
            placeholder="Driver Name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />

          <br />
          Upload START Images:
          <br />

          Front <input type="file" onChange={(e) => setStartImages({ ...startImages, front: e.target.files[0] })} />
          Back <input type="file" onChange={(e) => setStartImages({ ...startImages, back: e.target.files[0] })} />
          Left <input type="file" onChange={(e) => setStartImages({ ...startImages, left: e.target.files[0] })} />
          Right <input type="file" onChange={(e) => setStartImages({ ...startImages, right: e.target.files[0] })} />

          <br />
          <button onClick={startTrip}>Start Trip</button>
        </>
      )}

      <h2>Ongoing Trips</h2>
      {ongoing.map(t => (
        <div key={t.id}>
          {t.vehicle_number} - {t.driver_name}
          <br />
          Start: {t.start_time}
          <hr />
        </div>
      ))}

      <h2>Completed Trips</h2>
      {completed.map(t => (
        <div key={t.id}>
          🚗 {t.vehicle_number}
          <br />
          Driver: {t.driver_name}
          <br />
          Start: {new Date(t.start_time).toLocaleString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
})}

<br />

End: {new Date(t.end_time).toLocaleString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
})}
          <br />
          Damage: {t.damage_detected ? "⚠️ YES" : "✅ NO"}
          <br />
          Score: {t.damage_score}
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;