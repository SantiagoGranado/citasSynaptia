import React, { useEffect, useState } from 'react';

function App() {
  const [insurances, setInsurances] = useState([]);
  const [selectedInsurance, setSelectedInsurance] = useState('');
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [loadingInsurances, setLoadingInsurances] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8080/api/insurances')
      .then(res => res.json())
      .then(setInsurances)
      .catch(() => setError('No se pudieron cargar las aseguradoras'))
      .finally(() => setLoadingInsurances(false));
  }, []);

  useEffect(() => {
    if (!selectedInsurance) return;
    setLoadingActivities(true);
    setSelectedActivity('');
    setDoctors([]);
    fetch(`http://localhost:8080/api/activities?insuranceLid=${selectedInsurance}`)
      .then(res => res.json())
      .then(setActivities)
      .catch(() => setError('No se pudieron cargar los servicios'))
      .finally(() => setLoadingActivities(false));
  }, [selectedInsurance]);

  useEffect(() => {
    if (!selectedInsurance || !selectedActivity) return;
    setLoadingAvailability(true);
    fetch(`http://localhost:8080/api/availability?insuranceLid=${selectedInsurance}&activityGroupLid=${selectedActivity}`)
      .then(res => res.json())
      .then(setDoctors)
      .catch(() => setError('No se pudo cargar la disponibilidad'))
      .finally(() => setLoadingAvailability(false));
  }, [selectedActivity]);

  const handleSlotSelect = (slot, doctor) => {
    setSelectedSlot({
      ...slot,
      doctor,
      activityLid: slot.activityLid, // añadido correctamente
      locationLid: doctor.LOCATION_LID // añadido correctamente
    });
  };

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!selectedSlot) return;

    const payload = {
      ...formData,
      insuranceLid: selectedInsurance,
      activityGroupLid: selectedActivity,
      activityLid: selectedSlot.activityLid,
      resourceLid: selectedSlot.doctor.RESOURCE_LID,
      locationLid: selectedSlot.locationLid,
      date: selectedSlot.date,
      time: selectedSlot.start
    };

    console.log("Payload que se enviaría:", payload);
    setBookingSuccess(true);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6">Reservas médicas</h1>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Selecciona tu aseguradora:</label>
        {loadingInsurances ? (
          <p>Cargando aseguradoras...</p>
        ) : (
          <select
            value={selectedInsurance}
            onChange={e => setSelectedInsurance(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="">-- Selecciona una --</option>
            {insurances.map(ins => (
              <option key={ins.INSURANCE_LID} value={ins.INSURANCE_LID}>
                {ins.INSURANCE_NAME}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedInsurance && (
        <div className="mb-6">
          <label className="block mb-2 font-semibold">Selecciona el servicio:</label>
          {loadingActivities ? (
            <p>Cargando servicios...</p>
          ) : (
            <select
              value={selectedActivity}
              onChange={e => setSelectedActivity(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">-- Selecciona un servicio --</option>
              {activities.map(act => (
                <option key={act.ACTIVITY_GROUP_LID} value={act.ACTIVITY_GROUP_LID}>
                  {act.ACTIVITY_GROUP_NAME}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {selectedActivity && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Doctores y huecos disponibles:</h2>
          {loadingAvailability ? (
            <p>Cargando disponibilidad...</p>
          ) : doctors.length === 0 ? (
            <p>No hay disponibilidad para este servicio.</p>
          ) : (
            doctors.map(doc => (
              <div key={doc.doctor.RESOURCE_LID} className="mb-6 border-b pb-4">
                <h3 className="font-semibold text-lg">{doc.doctor.RESOURCE_FIRST_NAME || doc.doctor.NAME}</h3>
                {doc.availability.length === 0 ? (
                  <p className="text-sm text-gray-600">Sin huecos disponibles. Pruebe con pagador privado</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doc.availability.map((slot, index) => (
                      <button
                        key={`${slot.date}-${slot.start}-${index}`}
                        className={`px-3 py-1 text-sm rounded border ${
                          selectedSlot?.start === slot.start && selectedSlot?.date === slot.date ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-100 text-gray-800'
                        }`}
                        onClick={() => handleSlotSelect(slot, doc.doctor)}
                        type="button"
                      >
                        {slot.date} {slot.start}-{slot.end}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {selectedSlot && (
        <>
          <div className="bg-gray-100 p-4 mb-4 rounded">
            <h3 className="font-semibold">Datos seleccionados:</h3>
            <p><strong>Aseguradora:</strong> {insurances.find(i => i.INSURANCE_LID === selectedInsurance)?.INSURANCE_NAME}</p>
            <p><strong>Servicio:</strong> {activities.find(a => a.ACTIVITY_GROUP_LID === selectedActivity)?.ACTIVITY_GROUP_NAME}</p>
            <p><strong>Doctor:</strong> {selectedSlot.doctor.RESOURCE_FIRST_NAME || selectedSlot.doctor.NAME}</p>
            <p><strong>Fecha:</strong> {selectedSlot.date}</p>
            <p><strong>Hora:</strong> {selectedSlot.start} - {selectedSlot.end}</p>
          </div>

          <form className="space-y-4 bg-white p-4 rounded shadow" onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold">Introduce tus datos:</h2>
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" className="w-full p-2 border rounded" required />
            <input name="surname" value={formData.surname} onChange={handleChange} placeholder="Apellidos" className="w-full p-2 border rounded" required />
            <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Correo electrónico" className="w-full p-2 border rounded" required />
            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Teléfono" className="w-full p-2 border rounded" required />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Mostrar payload</button>
            {bookingSuccess && <p className="text-green-500">✅ Payload mostrado por consola correctamente</p>}
          </form>
        </>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}

export default App;
