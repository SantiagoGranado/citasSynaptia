const axios = require('axios');

const INITIAL_HOST = 'https://wscentral.e-salus.com';
const CLIENT_ID = process.env.SALUS_CLIENT_ID;
const AUTH_HEADER = process.env.SALUS_AUTHORIZATION;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

let apiClient = null;

function formatDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function initializeHost() {
  const resp = await axios.post(
    `${INITIAL_HOST}/api/central/GetConnectionById`,
    { clientid: CLIENT_ID },
    { headers: JSON_HEADERS }
  );

  const host = resp.data.url;
  if (!host) throw new Error('GetConnectionById no devolvió host');

  apiClient = axios.create({
    baseURL: `https://${host}/api/netapi`,
    headers: {
      clientid: CLIENT_ID,
      Authorization: AUTH_HEADER,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });
}

async function withRetryOn401(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.warn('🔄 Token expirado, reinicializando host...');
      await initializeHost();
      return await fn();
    }
    throw err;
  }
}

async function getResources() {
  return withRetryOn401(async () => {
    const { data } = await apiClient.post('/getResources', {
      CENTER_LID: process.env.SALUS_CENTER_LID
    });
    return data;
  });
}

async function getInsurances(resourceLid, locationLid) {
  return withRetryOn401(async () => {
    const { data } = await apiClient.post('/getInsurances', {
      RESOURCE_LID: resourceLid,
      LOCATION_LID: locationLid
    });
    return data;
  });
}

async function getActivities(resourceLid) {
  return withRetryOn401(async () => {
    const { data } = await apiClient.post('/getActivities', {
      RESOURCE_LID: resourceLid
    });
    return data;
  });
}

async function getAllUniqueInsurances() {
  const resources = await getResources();
  const insuranceMap = new Map();

  for (const r of resources) {
    try {
      const insurances = await getInsurances(r.RESOURCE_LID, r.LOCATION_LID);
      for (const insurance of insurances) {
        if (!insuranceMap.has(insurance.INSURANCE_LID)) {
          insuranceMap.set(insurance.INSURANCE_LID, {
            INSURANCE_LID: insurance.INSURANCE_LID,
            INSURANCE_NAME: insurance.INSURANCE_NAME
          });
        }
      }
    } catch (err) {
      console.warn(`⚠️ Fallo con recurso ${r.RESOURCE_LID}: ${err.message}`);
    }
  }

  return Array.from(insuranceMap.values());
}

async function getAvailableActivitiesByInsurance(insuranceLid) {
  const resources = await getResources();
  const activityMap = new Map();

  for (const r of resources) {
    try {
      const insurances = await getInsurances(r.RESOURCE_LID, r.LOCATION_LID);
      const acceptsInsurance = insurances.some(i => i.INSURANCE_LID === insuranceLid);
      if (!acceptsInsurance) continue;

      const activities = await getActivities(r.RESOURCE_LID);
      for (const act of activities) {
        if (!activityMap.has(act.ACTIVITY_GROUP_LID)) {
          activityMap.set(act.ACTIVITY_GROUP_LID, {
            ACTIVITY_GROUP_LID: act.ACTIVITY_GROUP_LID,
            ACTIVITY_GROUP_NAME: act.ACTIVITY_GROUP_NAME
          });
        }
      }
    } catch (err) {
      console.warn(`⚠️ Fallo con recurso ${r.RESOURCE_LID}: ${err.message}`);
    }
  }

  return Array.from(activityMap.values());
}

async function getDoctorsAndAvailability(insuranceLid, activityGroupLid) {
  const resources = await getResources();
  const result = [];

  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1); // 📆 un mes más

  for (const r of resources) {
    try {
      const insurances = await getInsurances(r.RESOURCE_LID, r.LOCATION_LID);
      const acceptsInsurance = insurances.some(i => i.INSURANCE_LID === insuranceLid);
      if (!acceptsInsurance) continue;

      const activities = await getActivities(r.RESOURCE_LID);
      const activity = activities.find(a => a.ACTIVITY_GROUP_LID === activityGroupLid);
      if (!activity) continue;

      console.log(`🔍 Consultando disponibilidad con searchAvailabilities de ${r.NAME || r.RESOURCE_FIRST_NAME || 'sin nombre'} (${r.RESOURCE_LID})`);

      const { data: availabilities } = await withRetryOn401(() =>
        apiClient.post('/searchAvailabilities', {
          RESOURCE_LID: r.RESOURCE_LID,
          LOCATION_LID: r.LOCATION_LID,
          ACTIVITY_LID: activity.ACTIVITY_LID,
          ACTIVITY_GROUP_LID: activityGroupLid,
          INSURANCE_LID: insuranceLid,
          AVA_START_DAY: formatDate(today),
          AVA_END_DAY: formatDate(nextMonth),
          AVA_START_TIME: "00:00",
          AVA_END_TIME:   "23:59",
          AVA_MIN_TIME:   "00:00",
          AVA_MAX_TIME:   "23:59",
          AVA_RESULTS_NUMBER: "100",
          minutsValidToken: 30,
          daysValidRefreshToken: 60
        })
      );

      result.push({
        doctor: {
          RESOURCE_LID: r.RESOURCE_LID,
          NAME: r.NAME || r.RESOURCE_FIRST_NAME || 'Doctor sin nombre'
        },
        availability: availabilities.map(slot => ({
          date: slot.AVA_DATE,
          start: slot.AVA_START_TIME,
          end: slot.AVA_END_TIME
        }))
      });

    } catch (err) {
      console.warn(`⚠️ No se pudo obtener disponibilidad con searchAvailabilities para ${r.NAME || r.RESOURCE_FIRST_NAME || r.RESOURCE_LID}: ${err.message}`);
    }
  }

  return result;
}

async function createAppointment(payload) {
  const response = await apiClient.post('/addAppointment', {
    ACTIVITY_LID: payload.activityLid,
    ACTIVITY_GROUP_LID: payload.activityGroupLid,
    RESOURCE_LID: payload.resourceLid,
    INSURANCE_LID: payload.insuranceLid || null,
    APP_DATE: payload.date,
    APP_START_TIME: payload.time,
    USER_FIRST_NAME: payload.firstName,
    USER_SECOND_NAME: payload.lastName,
    USER_EMAIL: payload.email,
    USER_DATE_OF_BIRTH: payload.dob || '',
    USER_GENDER: payload.gender || '',
    USER_ID_NUMBER: payload.nif || '',
    USER_MOBILE_PHONE: payload.phone || ''
  });

  return response.data;
}


module.exports = {
  initializeHost,
  getResources,
  getInsurances,
  getActivities,
  getAllUniqueInsurances,
  getAvailableActivitiesByInsurance,
  getDoctorsAndAvailability,
  createAppointment
};
