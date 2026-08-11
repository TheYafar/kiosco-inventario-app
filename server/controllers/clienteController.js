const db = require('../config/db');

// Obtener todos los clientes con resumen de deuda
exports.getClientes = async (req, res) => {
  const { search } = req.query;

  try {
    if (db.isPgConnected()) {
      let query = `
        SELECT c.*,
               COALESCE(SUM(CASE WHEN f.estado != 'PAGADO' THEN f.monto_actual ELSE 0 END), 0)::numeric AS deuda_total,
               COUNT(CASE WHEN f.estado = 'VENCIDO' THEN 1 END)::int AS fiados_vencidos
        FROM clientes c
        LEFT JOIN fiados f ON c.id = f.cliente_id
        WHERE 1=1
      `;
      const queryParams = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        query += ` AND (LOWER(c.nombre) LIKE $${queryParams.length} OR LOWER(c.telefono) LIKE $${queryParams.length})`;
      }

      query += ` GROUP BY c.id ORDER BY c.nombre ASC`;

      const result = await db.pool.query(query, queryParams);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }

    // Memory Fallback
    let clientes = db.memoryDb.clientes.map(c => {
      const fiadosCliente = db.memoryDb.fiados.filter(f => f.cliente_id === c.id);
      const deudaTotal = fiadosCliente
        .filter(f => f.estado !== 'PAGADO')
        .reduce((sum, f) => sum + parseFloat(f.monto_actual), 0);
      const fiadosVencidos = fiadosCliente.filter(f => f.estado === 'VENCIDO').length;

      return {
        ...c,
        deuda_total: deudaTotal,
        fiados_vencidos: fiadosVencidos
      };
    });

    if (search && search.trim() !== '') {
      const s = search.trim().toLowerCase();
      clientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(s) ||
        (c.telefono && c.telefono.toLowerCase().includes(s))
      );
    }

    clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
    res.json({ success: true, count: clientes.length, data: clientes });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener listado de clientes' });
  }
};

// Obtener cliente por ID con detalle de deudas y abonos
exports.getClienteById = async (req, res) => {
  const { id } = req.params;

  try {
    if (db.isPgConnected()) {
      const clientRes = await db.pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
      if (clientRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }

      const cliente = clientRes.rows[0];
      const fiadosRes = await db.pool.query('SELECT * FROM fiados WHERE cliente_id = $1 ORDER BY fecha_emision DESC', [id]);

      return res.json({
        success: true,
        data: {
          ...cliente,
          fiados: fiadosRes.rows
        }
      });
    }

    // Memory Fallback
    const cliente = db.memoryDb.clientes.find(c => c.id === parseInt(id));
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const fiados = db.memoryDb.fiados
      .filter(f => f.cliente_id === parseInt(id))
      .sort((a, b) => new Date(b.fecha_emision) - new Date(a.fecha_emision));

    res.json({
      success: true,
      data: {
        ...cliente,
        fiados
      }
    });
  } catch (error) {
    console.error('Error al obtener cliente por ID:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle del cliente' });
  }
};

// Registrar nuevo cliente
exports.createCliente = async (req, res) => {
  const nombre = req.body.nombre !== undefined ? req.body.nombre : req.body.name;
  const telefono = req.body.telefono !== undefined ? req.body.telefono : req.body.phone;

  if (!nombre || String(nombre).trim() === '') {
    return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio' });
  }

  if (!telefono || String(telefono).trim() === '') {
    return res.status(400).json({ success: false, message: 'El teléfono del cliente es obligatorio' });
  }

  try {
    if (db.isPgConnected()) {
      const query = `
        INSERT INTO clientes (nombre, telefono)
        VALUES ($1, $2)
        RETURNING *
      `;
      const result = await db.pool.query(query, [nombre.trim(), telefono.trim()]);
      return res.status(201).json({ success: true, message: 'Cliente registrado exitosamente', data: result.rows[0] });
    }

    // Memory Fallback
    const newCliente = {
      id: db.memoryDb.nextClienteId++,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      fecha_registro: new Date()
    };
    db.memoryDb.clientes.push(newCliente);
    res.status(201).json({ success: true, message: 'Cliente registrado exitosamente', data: newCliente });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al registrar cliente' });
  }
};

// Actualizar cliente
exports.updateCliente = async (req, res) => {
  const { id } = req.params;
  const nombre = req.body.nombre !== undefined ? req.body.nombre : req.body.name;
  const telefono = req.body.telefono !== undefined ? req.body.telefono : req.body.phone;

  if (!nombre || String(nombre).trim() === '') {
    return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio' });
  }

  try {
    if (db.isPgConnected()) {
      const query = `
        UPDATE clientes
        SET nombre = $1, telefono = $2
        WHERE id = $3
        RETURNING *
      `;
      const result = await db.pool.query(query, [nombre.trim(), telefono ? telefono.trim() : '', id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      return res.json({ success: true, message: 'Cliente actualizado correctamente', data: result.rows[0] });
    }

    // Memory Fallback
    const idx = db.memoryDb.clientes.findIndex(c => c.id === parseInt(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    db.memoryDb.clientes[idx].nombre = nombre.trim();
    if (telefono) db.memoryDb.clientes[idx].telefono = telefono.trim();

    res.json({ success: true, message: 'Cliente actualizado correctamente', data: db.memoryDb.clientes[idx] });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
  }
};

// Eliminar cliente
exports.deleteCliente = async (req, res) => {
  const { id } = req.params;

  try {
    if (db.isPgConnected()) {
      const result = await db.pool.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      return res.json({ success: true, message: 'Cliente eliminado correctamente' });
    }

    // Memory Fallback
    const idx = db.memoryDb.clientes.findIndex(c => c.id === parseInt(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    db.memoryDb.clientes.splice(idx, 1);
    db.memoryDb.fiados = db.memoryDb.fiados.filter(f => f.cliente_id !== parseInt(id));

    res.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar cliente' });
  }
};

// Vaciar todos los clientes y cuentas de fiados
exports.clearClientes = async (req, res) => {
  try {
    if (db.isPgConnected()) {
      await db.pool.query('DELETE FROM abonos');
      await db.pool.query('DELETE FROM fiados');
      await db.pool.query('DELETE FROM clientes');
      return res.json({ success: true, message: 'Clientes y fiados eliminados correctamente.' });
    }

    // Memory Fallback
    db.memoryDb.clientes = [];
    db.memoryDb.fiados = [];
    db.memoryDb.abonos = [];
    db.memoryDb.nextClienteId = 1;
    db.memoryDb.nextFiadoId = 1;
    db.memoryDb.nextAbonoId = 1;

    res.json({ success: true, message: 'Clientes y fiados eliminados correctamente.' });
  } catch (error) {
    console.error('Error al vaciar clientes:', error);
    res.status(500).json({ success: false, message: 'Error al vaciar los datos de clientes y fiados' });
  }
};

