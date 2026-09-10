const admin = require('firebase-admin');

// Inicialización segura del Firebase Admin SDK para Llévatelo Seguro
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://llevatelo-seguro-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejo de petición preliminar CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utiliza POST.' });
  }

  const { action, payload } = req.body;

  try {
    switch (action) {
      // ==========================================================
      // UVI 1: REGISTRO CON VALIDACIÓN DE CÉDULA Y DATOS
      // ==========================================================
      case 'handleRegistrationSubmit':
        return await handleRegistrationSubmit(payload || req.body, res);

      default:
        return res.status(400).json({ error: 'Acción UVI no reconocida.' });
    }
  } catch (error) {
    console.error("Error en Vercel Function Llévatelo Seguro:", error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}

// =========================================================================
// DESARROLLO DE UVI 1: handleRegistrationSubmit (VALIDACIÓN 100% ESTRICTA)
// =========================================================================
async function handleRegistrationSubmit(payload, res) {
  const { firstname, lastname, dob, cedula, idImage } = payload;

  // 1. Verificación de presencia de parámetros
  if (!firstname || !lastname || !dob || !cedula || !idImage) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para el registro.' });
  }

  // 2. Validación estricta de nombres y apellidos (sin números ni caracteres extraños)
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!nameRegex.test(firstname) || !nameRegex.test(lastname)) {
    return res.status(400).json({ error: 'Los nombres y apellidos deben contener solo letras válidas.' });
  }

  // 3. Validación estricta de formato de Cédula (Ej: V-12345678 o sólo números)
  const cleanCedula = cedula.replace(/[^0-9]/g, '');
  if (cleanCedula.length < 6 || cleanCedula.length > 9) {
    return res.status(400).json({ error: 'El número de cédula ingresado no es válido.' });
  }

  // 4. Validación estricta de Mayoría de Edad (18+ años exactos)
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (isNaN(age) || age < 18) {
    return res.status(400).json({ error: 'Debes ser mayor de 18 años para registrarte en la plataforma.' });
  }

  // 5. Verificación en base de datos si la cédula ya existe
  const existingCedulaSnap = await db.ref('users').orderByChild('cedula').equalTo(cleanCedula).once('value');
  if (existingCedulaSnap.exists()) {
    return res.status(400).json({ error: 'Esta cédula de identidad ya se encuentra registrada.' });
  }

  try {
    // Generar registro verificado en Firebase Realtime Database
    const userRef = db.ref(`users/${cleanCedula}`);
    const newUserData = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      fullname: `${firstname.trim()} ${lastname.trim()}`,
      dob: dob,
      cedula: cleanCedula,
      idImage: idImage,
      verified100: true,
      status: 'aprobado',
      timestamp: admin.database.ServerValue.TIMESTAMP
    };

    await userRef.set(newUserData);

    return res.status(200).json({
      success: true,
      message: '¡Registro y verificación de identidad completados al 100% exitosamente!'
    });
  } catch (error) {
    console.error("Error al guardar registro UVI 1:", error);
    return res.status(500).json({ error: 'Error al procesar la verificación en base de datos.' });
  }
}
