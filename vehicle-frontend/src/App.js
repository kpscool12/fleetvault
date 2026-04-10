import { useState, useEffect } from "react";

function App() {
  const BASE_URL = "http://127.0.0.1:8000";

  const [vehicles, setVehicles] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [driver, setDriver] = useState("");
  const [startImages, setStartImages] = useState({});
  const [endImagesMap, setEndImagesMap] = useState({});
  const [trips, setTrips] = useState([]);

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

  const isVehicleOnTrip = (v) =>
    trips.some(t => t.vehicle_number === v && t.status === "started");

  const addVehicle = async () => {
    const formData = new FormData();
    formData.append("vehicle_number", vehicleNumber);

    await fetch(`${BASE_URL}/vehicles`, {
      method: "POST",
      body: formData,
    });

    setVehicleNumber("");
    fetchVehicles();
  };

  const handleStartImage = (angle, file) => {
    if (!file.type.startsWith("image/")) return alert("Only images allowed");
    setStartImages(prev => ({ ...prev, [angle]: file }));
  };

  const handleEndImage = (vehicle, angle, file) => {
    if (!file.type.startsWith("image/")) return alert("Only images allowed");

    setEndImagesMap(prev => ({
      ...prev,
      [vehicle]: { ...prev[vehicle], [angle]: file }
    }));
  };

  const startTrip = async () => {
    if (!driver || Object.keys(startImages).length !== 4) {
      return alert("Upload all 4 START images + driver");
    }

    const formData = new FormData();
    formData.append("vehicle_number", selectedVehicle);
    formData.append("driver_name", driver);

    Object.entries(startImages).forEach(([k, v]) => formData.append(k, v));

    await fetch(`${BASE_URL}/start_trip`, {
      method: "POST",
      body: formData,
    });

    setSelectedVehicle(null);
    setDriver("");
    setStartImages({});
    fetchTrips();
  };

  const endTrip = async (vehicle) => {
    const imgs = endImagesMap[vehicle];
    if (!imgs || Object.keys(imgs).length !== 4) {
      return alert("Upload all 4 END images");
    }

    const formData = new FormData();
    formData.append("vehicle_number", vehicle);

    Object.entries(imgs).forEach(([k, v]) => formData.append(k, v));

    const res = await fetch(`${BASE_URL}/end_trip`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    alert(`Damage: ${data.damage_detected}\nSides: ${data.damaged.join(", ")}`);

    setEndImagesMap(prev => ({ ...prev, [vehicle]: {} }));
    fetchTrips();
  };

  const ongoing = trips.filter(t => t.status === "started");
  const completed = trips.filter(t => t.status === "completed");

  return (
    <div style={{ padding: 20 }}>
      <h1>🚗 AI Rental System</h1>

      <h2>Add Vehicle</h2>
      <input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />
      <button onClick={addVehicle}>Add</button>

      <h2>Vehicles</h2>
      {vehicles.map(v => {
        const busy = isVehicleOnTrip(v);

        return (
          <div key={v} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
            <b>{v}</b> {busy ? "🔴 On Trip" : "🟢 Available"}

            {!busy && <button onClick={() => setSelectedVehicle(v)}>Start Trip</button>}

            {busy && (
              <>
                <h4>Upload END Images</h4>
                {["front","back","left","right"].map(a => (
                  <div key={a}>
                    <label>{a.toUpperCase()} Image</label>
                    <input type="file" onChange={e => handleEndImage(v,a,e.target.files[0])}/>
                  </div>
                ))}
                <button onClick={() => endTrip(v)}>End Trip</button>
              </>
            )}
          </div>
        );
      })}

      {selectedVehicle && (
        <div>
          <h3>Start Trip: {selectedVehicle}</h3>
          <input placeholder="Driver Name" onChange={e => setDriver(e.target.value)} />

          <h4>Upload START Images</h4>
          {["front","back","left","right"].map(a => (
            <div key={a}>
              <label>{a.toUpperCase()} Image</label>
              <input type="file" onChange={e => handleStartImage(a,e.target.files[0])}/>
            </div>
          ))}

          <button onClick={startTrip}>Start Trip</button>
        </div>
      )}

      <h2>Ongoing Trips</h2>
      {ongoing.map(t => (
        <div key={t.id}>
          {t.vehicle_number} - {t.driver_name} <br/>
          {t.start_time}
        </div>
      ))}

      <h2>Completed Trips</h2>
      {completed.map(t => (
        <div key={t.id}>
          {t.vehicle_number} <br/>
          Start: {t.start_time} <br/>
          End: {t.end_time}
        </div>
      ))}
    </div>
  );
}

export default App;