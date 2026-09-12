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

  // Validación de método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utiliza POST.' });
  }

  const { action, payload } = req.body;

  try {
    // Enrutador central basado en la acción solicitada
    switch (action) {
      case 'registroUsuario': return await UVI_1_registroUsuario(payload, res);
      case 'publicarProducto': return await UVI_2_publicarProducto(payload, res);
      case 'fijarProducto': return await UVI_3_fijarProducto(payload, res);
      case 'enviarKYC': return await UVI_4_enviarKYC(payload, res);
      case 'subirFotosImgBB': return await UVI_5_subirFotosImgBB(payload, res);
      case 'guardarTelefono': return await UVI_6_guardarTelefono(payload, res);
      case 'renderProducts': return await UVI_7_renderProducts(payload, res);
      case 'renderMyProducts': return await UVI_8_renderMyProducts(payload, res);
      case 'eliminarProdPropio': return await UVI_9_eliminarProdPropio(payload, res);
      case 'confirmarEliminar': return await UVI_10_confirmarEliminar(payload, res);
      case 'restablecerClave': return await UVI_11_restablecerClave(payload, res);
      case 'comprimirImagen': return await UVI_12_comprimirImagen(payload, res);
      case 'inicioSesion': return await UVI_13_inicioSesion(payload, res);
      case 'cargaCatalogoGlobal': return await UVI_14_cargaCatalogoGlobal(payload, res);
      case 'cargaDatosUsuario': return await UVI_15_cargaDatosUsuario(payload, res);
      default:
        return res.status(400).json({ error: 'Acción no reconocida o no especificada.' });
    }
  } catch (error) {
    console.error("Error en Vercel Function:", error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}

// =========================================================================
// UVI 1: Registro de usuario (registrationForm)
// =========================================================================
async function UVI_1_registroUsuario(payload, res) {
  const { email, password, nombres, apellidos, edad, cedula } = payload;
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    await db.ref('usuarios/' + userRecord.uid).set({
      nombres, apellidos, edad, cedula, email,
      telefono: "", plan: "basico", kyc: "sin_verificar"
    });
    return res.status(200).json({ success: true, uid: userRecord.uid });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 2: Publicación de producto (addProductForm)
// =========================================================================
async function UVI_2_publicarProducto(payload, res) {
  const { uid, nombre, descripcion, estado, ubicacion, metodosPago, precio, fotos, telefonoVendedor, verificado } = payload;
  try {
    const nuevoProductoRef = db.ref('productos').push();
    await nuevoProductoRef.set({
      uid, nombre, descripcion, estado, ubicacion, metodosPago, precio, fotos,
      telefonoVendedor: telefonoVendedor || "", verificado: verificado || false,
      fijado: false, fechaPublicacion: admin.database.ServerValue.TIMESTAMP
    });
    return res.status(200).json({ success: true, id: nuevoProductoRef.key });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 3: Fijar producto (window.fijarProd)
// =========================================================================
async function UVI_3_fijarProducto(payload, res) {
  const { key } = payload;
  try {
    await db.ref('productos/' + key).update({ fijado: true, fijadoTime: Date.now() });
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 4: Envío de verificación de identidad KYC (window.enviarKYC)
// =========================================================================
async function UVI_4_enviarKYC(payload, res) {
  const { uid, fotosKyc } = payload;
  try {
    await db.ref('usuarios/' + uid).update({ kyc: 'pendiente', fotosKyc });
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 5: Subida de fotos de productos (Llamada fetch a la API de ImgBB)
// =========================================================================
async function UVI_5_subirFotosImgBB(payload, res) {
  const { imageBase64 } = payload; 
  try {
    const formData = new URLSearchParams();
    formData.append('image', imageBase64);
    const apiRes = await fetch('https://api.imgbb.com/1/upload?key=b1ad441b22bf5ce2ac3ca68ae8d163ca', {
      method: 'POST', body: formData
    });
    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 6: Guardar teléfono (window.guardarTelefono)
// =========================================================================
async function UVI_6_guardarTelefono(payload, res) {
  const { uid, telefono } = payload;
  try {
    await db.ref('usuarios/' + uid).update({ telefono });
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 7: renderProducts
// =========================================================================
async function UVI_7_renderProducts(payload, res) {
  try {
    const snapshot = await db.ref('productos').once('value');
    return res.status(200).json({ success: true, data: snapshot.val() });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 8: renderMyProducts
// =========================================================================
async function UVI_8_renderMyProducts(payload, res) {
  const { uid } = payload;
  try {
    const snapshot = await db.ref('productos').orderByChild('uid').equalTo(uid).once('value');
    return res.status(200).json({ success: true, data: snapshot.val() });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 9: window.eliminarProdPropio
// =========================================================================
async function UVI_9_eliminarProdPropio(payload, res) {
  const { key } = payload;
  try {
    await db.ref('productos/' + key).remove();
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 10: window.confirmarEliminar
// =========================================================================
async function UVI_10_confirmarEliminar(payload, res) {
  const { key } = payload;
  try {
    await db.ref('productos/' + key).remove();
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 11: window.restablecerClave
// =========================================================================
async function UVI_11_restablecerClave(payload, res) {
  const { email } = payload;
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    return res.status(200).json({ success: true, link });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 12: comprimirImagen
// =========================================================================
async function UVI_12_comprimirImagen(payload, res) {
  return res.status(200).json({ success: true, message: "Endpoint de compresión en Vercel listo." });
}

// =========================================================================
// UVI 13: Inicio de sesión (loginForm)
// =========================================================================
async function UVI_13_inicioSesion(payload, res) {
  const { uid } = payload;
  try {
    const customToken = await admin.auth().createCustomToken(uid);
    return res.status(200).json({ success: true, token: customToken });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 14: Carga de catálogo global (onValue en 'productos')
// =========================================================================
async function UVI_14_cargaCatalogoGlobal(payload, res) {
  try {
    const snapshot = await db.ref('productos').once('value');
    return res.status(200).json({ success: true, data: snapshot.val() });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}

// =========================================================================
// UVI 15: Carga de datos de usuario (onValue en 'usuarios/' + user.uid)
// =========================================================================
async function UVI_15_cargaDatosUsuario(payload, res) {
  const { uid } = payload;
  try {
    const snapshot = await db.ref('usuarios/' + uid).once('value');
    return res.status(200).json({ success: true, data: snapshot.val() });
  } catch (error) { return res.status(500).json({ error: error.message }); }
}
