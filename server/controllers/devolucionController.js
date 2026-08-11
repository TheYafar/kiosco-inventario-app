const { query, isPgConnected, memoryDb } = require('../config/db');

const devolucionController = {
  // GET /api/devoluciones - Listar devoluciones con filtros
  async getDevoluciones(req, res) {
    try {
      const { search = '', estado = '' } = req.query;

      if (isPgConnected()) {
        let sql = `SELECT * FROM devoluciones WHERE 1=1`;
        const params = [];

        if (search) {
          params.push(`%${search}%`);
          sql += ` AND (nombre ILIKE $${params.length} OR telefono ILIKE $${params.length} OR cedula ILIKE $${params.length} OR banco ILIKE $${params.length})`;
        }

        if (estado && estado !== 'TODAS') {
          params.push(estado);
          sql += ` AND estado = $${params.length}`;
        }

        sql += ` ORDER BY id DESC`;
        const result = await query(sql, params);
        return res.json({ success: true, data: result.rows });
      } else {
        let list = [...memoryDb.devoluciones];

        if (search) {
          const s = search.toLowerCase();
          list = list.filter(d => 
            (d.nombre && d.nombre.toLowerCase().includes(s)) ||
            (d.telefono && d.telefono.toLowerCase().includes(s)) ||
            (d.cedula && d.cedula.toLowerCase().includes(s)) ||
            (d.banco && d.banco.toLowerCase().includes(s))
          );
        }

        if (estado && estado !== 'TODAS') {
          list = list.filter(d => d.estado === estado);
        }

        list.sort((a, b) => b.id - a.id);
        return res.json({ success: true, data: list });
      }
    } catch (error) {
      console.error('Error al obtener devoluciones:', error);
      return res.status(500).json({ success: false, message: 'Error interno al obtener devoluciones' });
    }
  },

  // POST /api/devoluciones - Crear nueva devolución
  async createDevolucion(req, res) {
    try {
      const { nombre, telefono, banco, cedula, monto = 0, motivo = '' } = req.body;

      if (!nombre || !telefono || !banco || !cedula) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, Teléfono, Banco y Cédula son obligatorios'
        });
      }

      const montoNum = parseFloat(monto) || 0;

      if (isPgConnected()) {
        const sql = `
          INSERT INTO devoluciones (nombre, telefono, banco, cedula, monto, motivo, estado)
          VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE')
          RETURNING *;
        `;
        const result = await query(sql, [nombre.trim(), telefono.trim(), banco.trim(), cedula.trim(), montoNum, motivo.trim()]);
        return res.status(201).json({
          success: true,
          message: 'Devolución registrada exitosamente',
          data: result.rows[0]
        });
      } else {
        const newDev = {
          id: memoryDb.nextDevolucionId++,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          banco: banco.trim(),
          cedula: cedula.trim(),
          monto: montoNum,
          motivo: motivo.trim(),
          estado: 'PENDIENTE',
          fecha_registro: new Date()
        };
        memoryDb.devoluciones.push(newDev);
        return res.status(201).json({
          success: true,
          message: 'Devolución registrada exitosamente',
          data: newDev
        });
      }
    } catch (error) {
      console.error('Error al crear devolución:', error);
      return res.status(500).json({ success: false, message: 'Error interno al registrar devolución' });
    }
  },

  // PATCH /api/devoluciones/:id/estado - Actualizar estado
  async updateEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!['PENDIENTE', 'PROCESADA', 'CANCELADA'].includes(estado)) {
        return res.status(400).json({ success: false, message: 'Estado no válido' });
      }

      if (isPgConnected()) {
        const sql = `UPDATE devoluciones SET estado = $1 WHERE id = $2 RETURNING *;`;
        const result = await query(sql, [estado, id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
        }
        return res.json({ success: true, message: `Estado actualizado a ${estado}`, data: result.rows[0] });
      } else {
        const dev = memoryDb.devoluciones.find(d => d.id === parseInt(id));
        if (!dev) {
          return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
        }
        dev.estado = estado;
        return res.json({ success: true, message: `Estado actualizado a ${estado}`, data: dev });
      }
    } catch (error) {
      console.error('Error al actualizar estado de devolución:', error);
      return res.status(500).json({ success: false, message: 'Error interno al actualizar estado' });
    }
  },

  // DELETE /api/devoluciones/:id - Eliminar devolución
  async deleteDevolucion(req, res) {
    try {
      const { id } = req.params;

      if (isPgConnected()) {
        const result = await query(`DELETE FROM devoluciones WHERE id = $1 RETURNING *;`, [id]);
        if (result.rowCount === 0) {
          return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
        }
        return res.json({ success: true, message: 'Devolución eliminada' });
      } else {
        const idx = memoryDb.devoluciones.findIndex(d => d.id === parseInt(id));
        if (idx === -1) {
          return res.status(404).json({ success: false, message: 'Devolución no encontrada' });
        }
        memoryDb.devoluciones.splice(idx, 1);
        return res.json({ success: true, message: 'Devolución eliminada' });
      }
    } catch (error) {
      console.error('Error al eliminar devolución:', error);
      return res.status(500).json({ success: false, message: 'Error interno al eliminar devolución' });
    }
  }
};

module.exports = devolucionController;
