import React, { useEffect, useState } from "react";

const BASE_URL = "https://fleetvault-backend.onrender.com";

function formatTime(t) {
  if (!t) return "";
  return new Date(t).toLocaleString("en-IN");
}

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);

  const [vehicleInput, setVehicleInput] = useState("");
  const [driverInput, setDriverInput] = useState("");

  const [startUI, setStartUI] = useState(null);
  const [endUI, setEndUI] = useState(null);

  const [files, setFiles] = useState({});

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
    const form = new FormData();
    form.append("vehicle_number", vehicleInput);

    await fetch(`${BASE_URL}/add_vehicle`, {
      method: "POST",
      body: form,
    });

    setVehicleInput("");
    fetchData();
  };

  const startTrip = async (v) => {
    const form = new FormData();
    form.append("vehicle_number", v.vehicle_number);
    form.append("driver_name", driverInput);

    Object.keys(files).forEach(k => form.append(k, files[k]));

    await fetch(`${BASE_URL}/start_trip`, {
      method: "POST",
      body: form,
    });

    setStartUI(null);
    setFiles({});
    fetchData();
  };

  const endTrip = async (v) => {
    const form = new FormData();
    form.append("vehicle_number", v);

    Object.keys(files).forEach(k => form.append(k, files[k]));

    await fetch(`${BASE_URL}/end_trip`, {
      method: "POST",
      body: form,
    });

    setEndUI(null);
    setFiles({});
    fetchData();
  };

  const ongoing = trips.filter(t => t.status === "ongoing");
  const completed = trips.filter(t => t.status === "completed");

  return (
    <div style={{ padding: 20 }}>
      <h1>🚗 FleetVault</h1>

      <h2>Add Vehicle</h2>
      <input value={vehicleInput} onChange={e => setVehicleInput(e.target.value)} />
      <button onClick={addVehicle}>Add</button>

      <h2>Vehicles</h2>
      {vehicles.map(v => (
        <div key={v.id}>
          {v.vehicle_number} — {v.available ? "🟢 Available" : "🔴 On Trip"}

          {v.available && (
            <>
              <br />
              <button onClick={() => setStartUI(v.vehicle_number)}>Start Trip</button>

              {startUI === v.vehicle_number && (
                <div>
                  <input
                    placeholder="Driver"
                    value={driverInput}
                    onChange={e => setDriverInput(e.target.value)}
                  />

                  <br />
                  <input type="file" onChange={e => setFiles({...files, front: e.target.files[0]})} />
                  <input type="file" onChange={e => setFiles({...files, back: e.target.files[0]})} />

                  <br />
                  <button onClick={() => startTrip(v)}>Confirm Start</button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      <h2>Ongoing Trips</h2>
      {ongoing.map(t => (
        <div key={t.id}>
          🚗 {t.vehicle_number} — {t.driver_name}
          <br />
          Start: {formatTime(t.start_time)}

          <br />
          <button onClick={() => setEndUI(t.vehicle_number)}>End Trip</button>

          {endUI === t.vehicle_number && (
            <div>
              <input type="file" onChange={e => setFiles({...files, front: e.target.files[0]})} />
              <input type="file" onChange={e => setFiles({...files, back: e.target.files[0]})} />

              <br />
              <button onClick={() => endTrip(t.vehicle_number)}>Confirm End</button>
            </div>
          )}

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
          Start: {formatTime(t.start_time)}
          <br />
          End: {formatTime(t.end_time)}
          <br />
          Damage: {t.damage_detected ? "⚠️ YES" : "NO"}
          <br />
          Fine: ₹{t.fine_amount}
          <hr />
        </div>
      ))}
    </div>
  );
}