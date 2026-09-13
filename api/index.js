const admin = require('firebase-admin');

// Inicialización segura del Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
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
      // UVI 1: PUBLICAR PRODUCTO (MIGRADO A SERVIDOR)
      // ==========================================================
      case 'addProduct':
        return await addProduct(req.body, res);
  
    // ==========================================================
      // UVI 2: CONFIRMAR ELIMINAR (MIGRADO A SERVIDOR)
      // ==========================================================
      case 'confirmarEliminar':
        return await confirmarEliminar(req.body, res);
    
// ==========================================================
// UVI 3: FIJAR PRODUCTO (MIGRADO A SERVIDOR)
// ==========================================================
case 'fijarProd':
  return await fijarProd(req.body, res);
  
// ==========================================================
      // UVI 4: REGISTRO DE USUARIOS (MIGRADO A SERVIDOR)
      // ==========================================================
      case 'handleRegistrationSubmit':
        return await handleRegistrationSubmit(req.body, res);
  
      // ==========================================================
      // UVI 5: ENVIAR KYC (MIGRADO A SERVIDOR)
      // ==========================================================
      case 'enviarKYC':
        return await enviarKYC(req.body, res);
   
         // ==========================================================
      // UVI 6: GUARDAR TELÉFONO (MIGRADO A SERVIDOR)
      // ==========================================================
      case 'guardarTelefono':
        return await guardarTelefono(req.body, res);
  
    
      default:

     return res.status(400).json({ error: 'Acción no reconocida o no especificada.' });
    }
  } catch (error) {
    console.error("Error en Vercel Function:", error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}

 // =========================================================================
// DESARROLLO DE LA FUNCIÓN 1: addProduct (CÓDIGO SERVIDOR)
// =========================================================================
async function addProduct(body, res) {
  const payloadData = body.payload || body;
  
  const { uid, nombre, descripcion, estado, ubicacion, metodosPago, precio, fotos, telefonoVendedor, verificado, visibilidad } = payloadData;

  if (!uid || !nombre || !fotos || fotos.length === 0) {
    return res.status(400).json({ error: 'Faltan datos requeridos para publicar.' });
  }

  try {
    const productRef = db.ref('productos').push();
    
    await productRef.set({
      uid: uid,
      nombre: nombre,
      descripcion: descripcion,
      estado: estado,
      ubicacion: ubicacion,
      metodosPago: metodosPago,
      precio: precio,
      fotos: fotos,
      telefonoVendedor: telefonoVendedor || "",
      verificado: verificado || false,
      fijado: false,
      visibilidad: visibilidad || 'publicado',
      fechaPublicacion: admin.database.ServerValue.TIMESTAMP
    });

    return res.status(200).json({ success: true, message: 'Producto publicado exitosamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor al guardar el producto.' });
  }
}



// =========================================================================
// DESARROLLO DE LA FUNCIÓN 2: confirmarEliminar (CÓDIGO SERVIDOR)
// =========================================================================
async function confirmarEliminar(body, res) {
  const payloadData = body.payload || body;
  const { key } = payloadData;

  if (!key) {
    return res.status(400).json({ error: 'Falta la clave del producto a eliminar.' });
  }

  try {
    const prodRef = db.ref(`productos/${key}`);
    const prodSnap = await prodRef.once('value');

    if (!prodSnap.exists()) {
      return res.status(404).json({ error: 'El producto no existe.' });
    }

    await prodRef.remove();

    return res.status(200).json({
      success: true,
      message: 'Publicación eliminada exitosamente.'
    });
  } catch (error) {
    console.error('Error al eliminar producto en UVI 2:', error);
    return res.status(500).json({ error: 'Error interno del servidor al eliminar el producto.' });
  }
}
 
// =========================================================================
// DESARROLLO DE LA FUNCIÓN 3: fijarProd (CÓDIGO SERVIDOR)
// =========================================================================
async function fijarProd(body, res) {
  const payloadData = body.payload || body;
  const { key } = payloadData;

  if (!key) {
    return res.status(400).json({ error: 'Falta la clave del producto a fijar.' });
  }

  try {
    const prodRef = db.ref(`productos/${key}`);
    const prodSnap = await prodRef.once('value');

    if (!prodSnap.exists()) {
      return res.status(404).json({ error: 'El producto no existe.' });
    }

    await prodRef.update({
      fijado: true,
      fijadoTime: admin.database.ServerValue.TIMESTAMP
    });

    return res.status(200).json({
      success: true,
      message: 'Producto fijado en el tope exitosamente.'
    });
  } catch (error) {
    console.error('Error al fijar producto en UVI 3:', error);
    return res.status(500).json({ error: 'Error interno del servidor al fijar el producto.' });
  }
}

// =========================================================================
// DESARROLLO DE LA FUNCIÓN 4: handleRegistrationSubmit (CÓDIGO SERVIDOR)
// =========================================================================
async function handleRegistrationSubmit(body, res) {
  const payloadData = body.payload || body;
  const { nombres, apellidos, edad, cedula, email, password } = payloadData;

  if (!nombres || !apellidos || !edad || !cedula || !email || !password) {
    return res.status(400).json({ error: 'Por favor complete todos los campos obligatorios.' });
  }

  if (String(cedula).includes('@')) {
    return res.status(400).json({ error: 'La cédula no puede ser un correo electrónico.' });
  }

  const edadNum = parseInt(edad);
  if (isNaN(edadNum) || edadNum < 18) {
    return res.status(400).json({ error: 'Debes ser mayor de edad para registrarte.' });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password
    });
    const uid = userRecord.uid;

    await db.ref(`usuarios/${uid}`).set({
      nombres: nombres,
      apellidos: apellidos,
      edad: edad,
      cedula: cedula,
      email: email,
      telefono: "",
      plan: "basico",
      kyc: "sin_verificar",
      timestamp: admin.database.ServerValue.TIMESTAMP
    });

    return res.status(200).json({
      success: true,
      message: '¡Aprobado OK! Registro exitoso.'
    });
  } catch (error) {
    console.error("Error en UVI 4 handleRegistrationSubmit:", error);
    let errorMessage = error.message || 'Error interno del servidor al procesar el registro.';
    if (error.code === 'auth/email-already-exists' || error.code === 'auth/email-already-in-use') {
      errorMessage = 'El correo electrónico ya se encuentra registrado.';
    }
    return res.status(400).json({ error: errorMessage });
  }
}


// =========================================================================
// DESARROLLO DE LA FUNCIÓN 5: enviarKYC (CÓDIGO SERVIDOR)
// =========================================================================
async function enviarKYC(body, res) {
  const payloadData = body.payload || body;
  const { uid, fotosKyc } = payloadData;

  if (!uid || !fotosKyc || fotosKyc.length === 0) {
    return res.status(400).json({ error: 'Faltan datos requeridos para la verificación KYC.' });
  }

  try {
    const userRef = db.ref(`usuarios/${uid}`);
    const userSnap = await userRef.once('value');

    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'El usuario no existe.' });
    }

    // Guardar en la base de datos usando admin.database() a través de 'db'
    await userRef.update({
      kyc: 'pendiente',
      fotosKyc: fotosKyc
    });

    return res.status(200).json({
      success: true,
      message: 'Fotos de identidad enviadas correctamente. Espera aprobación.'
    });
  } catch (error) {
    console.error('Error en UVI 5 enviarKYC:', error);
    return res.status(500).json({ error: 'Error interno del servidor al procesar el KYC.' });
  }
}

// =========================================================================
// DESARROLLO DE LA FUNCIÓN 6: guardarTelefono (CÓDIGO SERVIDOR)
// =========================================================================
async function guardarTelefono(body, res) {
  const payloadData = body.payload || body;
  const { uid, telefono } = payloadData;

  if (!uid || !telefono) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  if (String(telefono).trim().length < 10) {
    return res.status(400).json({ error: 'Ingresa un número válido, sin el 0 inicial (Ej: 4121234567).' });
  }

  try {
    const userRef = db.ref(`usuarios/${uid}`);
    const userSnap = await userRef.once('value');

    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'El usuario no existe.' });
    }

    await userRef.update({
      telefono: telefono
    });

    return res.status(200).json({
      success: true,
      message: '¡Teléfono guardado! Ahora tus productos tendrán un botón directo a tu WhatsApp.'
    });
  } catch (error) {
    console.error('Error en UVI 6 guardarTelefono:', error);
    return res.status(500).json({ error: 'Error interno del servidor al guardar el teléfono.' });
  }
}
