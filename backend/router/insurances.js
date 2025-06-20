// backend/router/insurances.js
const express = require('express');
const router = express.Router();
const { getAllUniqueInsurances } = require('../salusApi');

router.get('/', async (req, res) => {
  try {
    const insurances = await getAllUniqueInsurances();
    res.json(insurances);
  } catch (err) {
    console.error('Error al obtener aseguradoras:', err.message);
    res.status(500).json({ error: 'Error al obtener aseguradoras' });
  }
});

module.exports = router;
