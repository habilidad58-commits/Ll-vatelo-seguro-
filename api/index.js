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
  
  const { uid, nombre, descripcion, estado, ubicacion, metodosPago, precio, fotos, telefonoVendedor, verificado } = payloadData;

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
      fechaPublicacion: admin.database.ServerValue.TIMESTAMP
    });

    return res.status(200).json({ success: true, message: 'Producto publicado exitosamente' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor al guardar el producto.' });
  }
}

(!txSnapshot.exists()) {
      return res.status(404).json({ error: 'La transacción no existe.' });
    }

    const tx = txSnapshot.val();

    if (tx.status !== 'esperando_codigo') {
      return res.status(400).json({ error: 'La transacción ya no está pendiente.' });
    }

    // Validación estricta del código idéntica al front
    if (String(tx.code).trim() !== String(inputCode).trim()) {
      return res.status(400).json({ error: 'El código de confirmación ingresado no coincide.' });
    }

    // Permisos del vendedor para procesar la venta
    if (sellerPhone && tx.sellerPhone !== sellerPhone) {
      return res.status(403).json({ error: 'No tienes permisos para esta transacción.' });
    }

    const [buyerSnap, sellerSnap] = await Promise.all([
      db.ref(`users/${tx.buyerPhone}`).once('value'),
      db.ref(`users/${tx.sellerPhone}`).once('value')
    ]);

    if (!buyerSnap.exists() || !sellerSnap.exists()) {
      return res.status(404).json({ error: 'Comprador o vendedor no encontrados.' });
    }

    const buyer = buyerSnap.val();
    const seller = sellerSnap.val();

    const amount = parseFloat(tx.amountUSD);
    let half = amount / 2;
    let commission = amount * 0.15; // 15% de comisión de la venta total
    let buyerBal = parseFloat(buyer.balanceUSD || 0);
    let buyerCredit = parseFloat(buyer.creditUSD || 0);
    let sellerBal = parseFloat(seller.balanceUSD || 0);

    const updates = {};
    const ahora = Date.now();

    // Cálculo Dinámico de Días de Plazo según el Nivel idéntico al frontend
    let nivelComprador = 1 + Math.floor((buyer.totalDeudaPagada || 0) / 20);
    if (nivelComprador > 12) nivelComprador = 12;
    const diasPlazo = 2 + nivelComprador; 
    const plazoMs = diasPlazo * 24 * 60 * 60 * 1000;

    if (tx.method === 'digital') {
      if (buyerBal < half) {
        return res.status(400).json({ error: `El comprador no tiene suficiente saldo digital ($${half.toFixed(2)} USD).` });
      }
      if (buyerCredit < half) {
        return res.status(400).json({ error: `El comprador no tiene suficiente línea de crédito ($${half.toFixed(2)} USD).` });
      }
      let sellerPay = amount - commission;
      if (sellerPay < 0) sellerPay = 0;
      
      updates[`users/${tx.buyerPhone}/balanceUSD`] = buyerBal - half;
      updates[`users/${tx.buyerPhone}/creditUSD`] = buyerCredit - half;
      updates[`users/${tx.sellerPhone}/balanceUSD`] = sellerBal + sellerPay;
    } else {
      if (buyerCredit < half) {
        return res.status(400).json({ error: 'El comprador no tiene suficiente crédito disponible.' });
      }
      let sellerDigitalShare = amount - half - commission;
      if (sellerDigitalShare < 0) sellerDigitalShare = 0;
      
      updates[`users/${tx.buyerPhone}/creditUSD`] = buyerCredit - half;
      updates[`users/${tx.sellerPhone}/balanceUSD`] = sellerBal + sellerDigitalShare;
    }

    updates[`commissions/espera/${transactionId}`] = { 
      amount: commission, 
      txId: transactionId, 
      timestamp: ahora,
      buyerPhone: tx.buyerPhone,
      buyerName: buyer.fullname,
      expiresAt: ahora + plazoMs
    };
    updates[`pending_payments/${tx.buyerPhone}/${transactionId}`] = {
      txId: transactionId,
      amountUSD: half,
      comisionTx: commission, 
      status: 'pendiente',
      timestamp: ahora,
      expiresAt: ahora + plazoMs
    };
    updates[`transactions/${transactionId}/status`] = 'completada';
    updates[`frequent_clients/${tx.sellerPhone}/${tx.buyerPhone}`] = {
      fullname: buyer.fullname,
      phone: buyer.phone,
      lastTx: ahora
    };

    // Usando admin.database() a través de 'db' para guardar los datos de forma segura
    await db.ref().update(updates);

    return res.status(200).json({ success: true, message: '¡Venta procesada exitosamente!' });
  } catch (error) {
    console.error("Error confirmando transacción UVI 1:", error);
    return res.status(500).json({ error: 'Error interno del servidor procesando la venta.' });
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
