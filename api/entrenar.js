import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// Inicializar Firebase Admin usando variables de entorno seguras
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = getDatabase();

export default async function handler(req, res) {
    try {
        const refLecciones = db.ref("experiencia_ia_global/historial_lecciones");
        const snapshot = await refLecciones.once("value");
        const data = snapshot.val();

        if (!data) {
            return res.status(200).json({ success: true, message: "No hay lecciones nuevas pendientes para entrenar." });
        }

        let lecciones = Object.values(data);
        let resumenOptimizado = {};

        // Procesar y calcular la inteligencia de las jugadas
        lecciones.forEach(lec => {
            let keyFicha = `${lec.fichaElegida[0]}-${lec.fichaElegida[1]}`;
            if (!resumenOptimizado[keyFicha]) {
                resumenOptimizado[keyFicha] = { victorias: 0, derrotas: 0, pesoEstrategico: 0 };
            }
            if (lec.resultado === "VICTORIA") {
                resumenOptimizado[keyFicha].victorias++;
            } else {
                resumenOptimizado[keyFicha].derrotas++;
            }
            let total = resumenOptimizado[keyFicha].victorias + resumenOptimizado[keyFicha].derrotas;
            resumenOptimizado[keyFicha].pesoEstrategico = Math.round((resumenOptimizado[keyFicha].victorias / total) * 100);
        });

        // 1. Guardar el resumen limpio en la nube para que tu app lo lea al instante
        await db.ref("experiencia_ia_global/pesos_optimizados").set(resumenOptimizado);

        // 2. Purgar el historial crudo pesado para liberar espacio en Firebase
        await refLecciones.remove();

        return res.status(200).json({ 
            success: true, 
            message: "¡Entrenamiento completado en la nube y Firebase purgado con éxito!",
            fichasProcesadas: Object.keys(resumenOptimizado).length
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
