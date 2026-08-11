const db = require('../config/db');
const moraService = require('../services/moraService');

// Obtener todas las cuentas fiadas con filtros
exports.getFiados = async (req, res) => {
  const { cliente_id, estado } = req.query;

  try {
    if (db.isPgConnected()) {
      let query = `
        SELECT f.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
        FROM fiados f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE 1=1
      `;
      const queryParams = [];

      if (cliente_id) {
        queryParams.push(parseInt(cliente_id));
        query += ` AND f.cliente_id = $${queryParams.length}`;
      }

      if (estado && estado !== 'TODOS') {
        queryParams.push(estado.toUpperCase());
        query += ` AND f.estado = $${queryParams.length}`;
      }

      query += ` ORDER BY f.fecha_vencimiento ASC, f.id DESC`;

      const result = await db.pool.query(query, queryParams);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }

    // Memory Fallback
    let fiados = db.memoryDb.fiados.map(f => {
      const cliente = db.memoryDb.clientes.find(c => c.id === f.cliente_id);
      return {
        ...f,
        cliente_nombre: cliente ? cliente.nombre : 'Cliente Desconocido',
        cliente_telefono: cliente ? cliente.telefono : ''
      };
    });

    if (cliente_id) {
      fiados = fiados.filter(f => f.cliente_id === parseInt(cliente_id));
    }

    if (estado && estado !== 'TODOS') {
      fiados = fiados.filter(f => f.estado === estado.toUpperCase());
    }

    fiados.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento));
    res.json({ success: true, count: fiados.length, data: fiados });
  } catch (error) {
    console.error('Error al obtener cuentas fiadas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener deudas fiadas' });
  }
};

// Obtener detalle de fiado por ID con sus abonos
exports.getFiadoById = async (req, res) => {
  const { id } = req.params;

  try {
    if (db.isPgConnected()) {
      const queryFiado = `
        SELECT f.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono
        FROM fiados f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE f.id = $1
      `;
      const fiadoRes = await db.pool.query(queryFiado, [id]);
      if (fiadoRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cuenta fiada no encontrada' });
      }

      const abonosRes = await db.pool.query('SELECT * FROM abonos WHERE fiado_id = $1 ORDER BY fecha_abono DESC', [id]);

      return res.json({
        success: true,
        data: {
          ...fiadoRes.rows[0],
          abonos: abonosRes.rows
        }
      });
    }

    // Memory Fallback
    const fiado = db.memoryDb.fiados.find(f => f.id === parseInt(id));
    if (!fiado) {
      return res.status(404).json({ success: false, message: 'Cuenta fiada no encontrada' });
    }

    const cliente = db.memoryDb.clientes.find(c => c.id === fiado.cliente_id);
    const abonos = db.memoryDb.abonos.filter(a => a.fiado_id === parseInt(id));

    res.json({
      success: true,
      data: {
        ...fiado,
        cliente_nombre: cliente ? cliente.nombre : 'Cliente Desconocido',
        cliente_telefono: cliente ? cliente.telefono : '',
        abonos
      }
    });
  } catch (error) {
    console.error('Error al obtener detalle de fiado:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle' });
  }
};

// Registrar nueva cuenta fiada
exports.createFiado = async (req, res) => {
  const { cliente_id, monto, monto_inicial, notas, dias_vencimiento } = req.body;
  const parsedMonto = parseFloat(monto_inicial || monto);

  if (!cliente_id) {
    return res.status(400).json({ success: false, message: 'Debes seleccionar un cliente' });
  }

  if (isNaN(parsedMonto) || parsedMonto <= 0) {
    return res.status(400).json({ success: false, message: 'El monto fiado debe ser mayor a 0' });
  }

  const dias = parseInt(dias_vencimiento) || 7;
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

  try {
    if (db.isPgConnected()) {
      const query = `
        INSERT INTO fiados (cliente_id, monto_inicial, monto_actual, fecha_vencimiento, notas, estado)
        VALUES ($1, $2, $3, $4, $5, 'PENDIENTE')
        RETURNING *
      `;
      const values = [cliente_id, parsedMonto, parsedMonto, fechaVencimiento, notas || ''];
      const result = await db.pool.query(query, values);
      return res.status(201).json({ success: true, message: 'Cuenta fiada registrada exitosamente', data: result.rows[0] });
    }

    // Memory Fallback
    const newFiado = {
      id: db.memoryDb.nextFiadoId++,
      cliente_id: parseInt(cliente_id),
      monto_inicial: parsedMonto,
      monto_actual: parsedMonto,
      fecha_emision: new Date(),
      fecha_vencimiento: fechaVencimiento,
      estado: 'PENDIENTE',
      recargo_aplicado: false,
      notas: notas || ''
    };
    db.memoryDb.fiados.push(newFiado);
    res.status(201).json({ success: true, message: 'Cuenta fiada registrada exitosamente', data: newFiado });
  } catch (error) {
    console.error('Error al registrar fiado:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al registrar cuenta fiada' });
  }
};

// Registrar Abono (Pago Parcial o Total)
exports.abonarFiado = async (req, res) => {
  const { id } = req.params;
  const { monto } = req.body;
  const parsedAbono = parseFloat(monto);

  if (isNaN(parsedAbono) || parsedAbono <= 0) {
    return res.status(400).json({ success: false, message: 'El monto a abonar debe ser mayor a 0' });
  }

  try {
    if (db.isPgConnected()) {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        const fiadoRes = await client.query('SELECT * FROM fiados WHERE id = $1 FOR UPDATE', [id]);
        if (fiadoRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Cuenta fiada no encontrada' });
        }

        const fiado = fiadoRes.rows[0];
        if (fiado.estado === 'PAGADO') {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Esta cuenta ya está totalmente pagada' });
        }

        const nuevoSaldo = Math.max(0, parseFloat(fiado.monto_actual) - parsedAbono);
        const nuevoEstado = nuevoSaldo === 0 ? 'PAGADO' : fiado.estado;

        // Registrar abono
        await client.query('INSERT INTO abonos (fiado_id, monto) VALUES ($1, $2)', [id, parsedAbono]);

        // Actualizar saldo de fiado
        const updateRes = await client.query(
          'UPDATE fiados SET monto_actual = $1, estado = $2 WHERE id = $3 RETURNING *',
          [nuevoSaldo, nuevoEstado, id]
        );

        await client.query('COMMIT');
        return res.json({
          success: true,
          message: nuevoSaldo === 0 ? '¡Deuda cancelada en su totalidad!' : `Abono registrado. Saldo restante: $${nuevoSaldo.toFixed(2)}`,
          data: updateRes.rows[0]
        });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    // Memory Fallback
    const fiadoIdx = db.memoryDb.fiados.findIndex(f => f.id === parseInt(id));
    if (fiadoIdx === -1) {
      return res.status(404).json({ success: false, message: 'Cuenta fiada no encontrada' });
    }

    const fiado = db.memoryDb.fiados[fiadoIdx];
    if (fiado.estado === 'PAGADO') {
      return res.status(400).json({ success: false, message: 'Esta cuenta ya está totalmente pagada' });
    }

    const nuevoSaldo = Math.max(0, fiado.monto_actual - parsedAbono);
    fiado.monto_actual = nuevoSaldo;
    if (nuevoSaldo === 0) {
      fiado.estado = 'PAGADO';
    }

    db.memoryDb.abonos.push({
      id: db.memoryDb.nextAbonoId++,
      fiado_id: parseInt(id),
      monto: parsedAbono,
      fecha_abono: new Date()
    });

    res.json({
      success: true,
      message: nuevoSaldo === 0 ? '¡Deuda cancelada en su totalidad!' : `Abono registrado. Saldo restante: $${nuevoSaldo.toFixed(2)}`,
      data: fiado
    });
  } catch (error) {
    console.error('Error al procesar abono:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al registrar abono' });
  }
};

// Forzar procesamiento de mora manual desde frontend
exports.procesarMoraManual = async (req, res) => {
  try {
    const result = await moraService.procesarMorasAutomaticas();
    res.json({
      success: true,
      message: `Procesamiento finalizado. Cuentas actualizadas con recargo (+5%): ${result.count}`,
      count: result.count
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al procesar la mora' });
  }
};
