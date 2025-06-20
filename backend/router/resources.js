// backend/router/resources.js
const { Router }      = require('express');
const { getResources,
        getDoctorsFor } = require('../salusApi');

const router = Router();

/**
 * GET /api/resources
 *
 * Sin query params → devuelve todas las agendas (resources)
 * Con ?insuranceLid=…&activityGroupLid=… → filtra y devuelve doctores
 */
router.get('/', async (req, res) => {
  const { insuranceLid, activityGroupLid } = req.query;

  try {
    if (insuranceLid && activityGroupLid) {
      const doctors = await getDoctorsFor(insuranceLid, activityGroupLid);
      return res.json({ ok: true, doctors });
    }
    const resources = await getResources();
    return res.json({ ok: true, resources });
  } catch (err) {
    console.error('Error en /api/resources:', err.message);
    return res.status(500).json({
      ok:    false,
      msg:   'Error al obtener datos de Salus',
      error: err.message
    });
  }
});

module.exports = router;
