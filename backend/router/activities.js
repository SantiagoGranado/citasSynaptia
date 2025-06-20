// backend/router/activities.js
const express = require('express');
const router = express.Router();
const { getAvailableActivitiesByInsurance } = require('../salusApi');

router.get('/', async (req, res) => {
  const insuranceLid = req.query.insuranceLid;
  if (!insuranceLid) {
    return res.status(400).json({ error: 'Falta insuranceLid' });
  }

  try {
    const activities = await getAvailableActivitiesByInsurance(insuranceLid);
    res.json(activities);
  } catch (err) {
    console.error('Error al obtener actividades:', err.message);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

module.exports = router;
