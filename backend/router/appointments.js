const express = require('express');
const router = express.Router();
const { initializeHost, createAppointment } = require('../salusApi');

router.post('/create', async (req, res) => {
  try {
    await initializeHost(); // reintenta por si expiró

    const result = await createAppointment(req.body);
    res.json(result);
  } catch (err) {
    console.error('❌ Error al crear cita:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
