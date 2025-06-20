// backend/index.js
require('dotenv').config();
const express          = require('express');
const cors             = require('cors');
const { initializeHost } = require('./salusApi');
const resourcesRouter    = require('./router/resources');
const insurancesRouter = require('./router/insurances');
const activitiesRouter = require('./router/activities');
const availabilityRouter = require('./router/availability');
const appointmentsRouter = require('./router/appointments');

async function main() {
  try {
    await initializeHost();
    console.log('✅ Salus API inicializada');
  } catch (err) {
    console.error('❌ Error inicializando Salus API:', err.message);
    process.exit(1);
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Monta el router
  app.use('/api/resources', resourcesRouter);
  app.use('/api/insurances', insurancesRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/availability', availabilityRouter);
  app.use('/api/appointments', appointmentsRouter);


  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () =>
    console.log(`✅ Servidor escuchando en http://localhost:${PORT}`)
  );
}

main();
