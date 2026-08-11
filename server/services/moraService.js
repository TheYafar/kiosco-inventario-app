const db = require('../config/db');

/**
 * Servicio de procesamiento automático de moras para cuentas fiadas.
 * Si una cuenta fiada supera la fecha_vencimiento y no está PAGADA ni recargada,
 * se cambia su estado a 'VENCIDO', se suma un 5% de recargo sobre el monto_actual
 * y se marca recargo_aplicado = true.
 */

async function procesarMorasAutomaticas() {
  let recargosAplicados = 0;

  try {
    if (db.isPgConnected()) {
      // Buscar fiados vencidos no recargados
      const querySelect = `
        SELECT * FROM fiados
        WHERE estado != 'PAGADO'
          AND recargo_aplicado = false
          AND fecha_vencimiento < CURRENT_TIMESTAMP
      `;
      const result = await db.pool.query(querySelect);

      for (const fiado of result.rows) {
        const nuevoMonto = parseFloat((parseFloat(fiado.monto_actual) * 1.05).toFixed(2));
        const queryUpdate = `
          UPDATE fiados
          SET monto_actual = $1,
              estado = 'VENCIDO',
              recargo_aplicado = true,
              notas = COALESCE(notas, '') || ' [Recargo del 5% aplicado por mora el ' || CURRENT_DATE || ']'
          WHERE id = $2
        `;
        await db.pool.query(queryUpdate, [nuevoMonto, fiado.id]);
        recargosAplicados++;
      }
    } else {
      // Memory Fallback
      const ahora = new Date();
      db.memoryDb.fiados.forEach(fiado => {
        if (fiado.estado !== 'PAGADO' && !fiado.recargo_aplicado) {
          const fechaVenc = new Date(fiado.fecha_vencimiento);
          if (fechaVenc < ahora) {
            fiado.monto_actual = parseFloat((fiado.monto_actual * 1.05).toFixed(2));
            fiado.estado = 'VENCIDO';
            fiado.recargo_aplicado = true;
            fiado.notas = (fiado.notas || '') + ` [Recargo 5% por mora el ${ahora.toLocaleDateString()}]`;
            recargosAplicados++;
          }
        }
      });
    }

    if (recargosAplicados > 0) {
      console.log(`⏱️ Servicio de Mora: Se aplicó un 5% de interés a ${recargosAplicados} cuenta(s) vencida(s).`);
    }
    return { success: true, count: recargosAplicados };
  } catch (error) {
    console.error('Error al procesar mora automática:', error);
    return { success: false, error: error.message };
  }
}

function iniciarTareaProgramada() {
  // Ejecución inicial al arrancar el servidor
  procesarMorasAutomaticas();

  // Programar revisión periódica cada 10 minutos (600,000 ms)
  setInterval(() => {
    procesarMorasAutomaticas();
  }, 600000);
}

module.exports = {
  procesarMorasAutomaticas,
  iniciarTareaProgramada
};
