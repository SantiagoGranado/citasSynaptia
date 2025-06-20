const express = require('express');
const router = express.Router();
const { getDoctorsAndAvailability } = require('../salusApi');

router.get('/', async (req, res) => {
  const { insuranceLid, activityGroupLid } = req.query;

  if (!insuranceLid || !activityGroupLid) {
    return res.status(400).json({ error: 'Faltan parámetros: insuranceLid o activityGroupLid' });
  }

  try {
    const data = await getDoctorsAndAvailability(insuranceLid, activityGroupLid);
    res.json(data);
  } catch (err) {
    console.error('Error al obtener disponibilidad:', err.message);
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
});

module.exports = router;
