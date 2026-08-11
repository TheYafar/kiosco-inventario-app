const db = require('../config/db');

// Obtener todas las categorías
exports.getCategories = async (req, res) => {
  try {
    if (db.isPgConnected()) {
      const result = await db.pool.query('SELECT * FROM categories ORDER BY name ASC');
      return res.json({ success: true, data: result.rows });
    }

    // Memory Fallback
    const categories = [...db.memoryDb.categories].sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al obtener categorías' });
  }
};

// Obtener categoría por ID
exports.getCategoryById = async (req, res) => {
  const { id } = req.params;
  try {
    if (db.isPgConnected()) {
      const result = await db.pool.query('SELECT * FROM categories WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }

    // Memory Fallback
    const category = db.memoryDb.categories.find(c => c.id === parseInt(id));
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error al obtener la categoría:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al obtener la categoría' });
  }
};

// Crear nueva categoría
exports.createCategory = async (req, res) => {
  const name = req.body.nombre !== undefined ? req.body.nombre : req.body.name;
  const description = req.body.descripcion !== undefined ? req.body.descripcion : req.body.description;
  const color_code = req.body.color_code;

  if (!name || String(name).trim() === '') {
    return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio' });
  }

  try {
    if (db.isPgConnected()) {
      const query = `
        INSERT INTO categories (name, description, color_code)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [name.trim(), description || '', color_code || '#4F46E5'];
      const result = await db.pool.query(query, values);
      return res.status(201).json({ success: true, message: 'Categoría creada con éxito', data: result.rows[0] });
    }

    // Memory Fallback
    const exists = db.memoryDb.categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ success: false, message: 'Ya existe una categoría con ese nombre' });
    }

    const newCategory = {
      id: db.memoryDb.nextCatId++,
      name: name.trim(),
      description: description || '',
      color_code: color_code || '#4F46E5',
      created_at: new Date(),
      updated_at: new Date()
    };
    db.memoryDb.categories.push(newCategory);
    res.status(201).json({ success: true, message: 'Categoría creada con éxito', data: newCategory });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    if (error.code === '23505') { // Unique constraint
      return res.status(400).json({ success: false, message: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ success: false, message: 'Error al crear la categoría' });
  }
};

// Actualizar categoría
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const name = req.body.nombre !== undefined ? req.body.nombre : req.body.name;
  const description = req.body.descripcion !== undefined ? req.body.descripcion : req.body.description;
  const color_code = req.body.color_code;

  if (!name || String(name).trim() === '') {
    return res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio' });
  }

  try {
    if (db.isPgConnected()) {
      const query = `
        UPDATE categories
        SET name = $1, description = $2, color_code = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      const values = [name.trim(), description || '', color_code || '#4F46E5', id];
      const result = await db.pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
      }
      return res.json({ success: true, message: 'Categoría actualizada correctamente', data: result.rows[0] });
    }

    // Memory Fallback
    const categoryIndex = db.memoryDb.categories.findIndex(c => c.id === parseInt(id));
    if (categoryIndex === -1) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    db.memoryDb.categories[categoryIndex] = {
      ...db.memoryDb.categories[categoryIndex],
      name: name.trim(),
      description: description || '',
      color_code: color_code || '#4F46E5',
      updated_at: new Date()
    };

    res.json({ success: true, message: 'Categoría actualizada correctamente', data: db.memoryDb.categories[categoryIndex] });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar la categoría' });
  }
};

// Eliminar categoría
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    if (db.isPgConnected()) {
      // Set category_id to NULL in products before deleting
      await db.pool.query('UPDATE products SET category_id = NULL WHERE category_id = $1', [id]);
      const result = await db.pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
      }
      return res.json({ success: true, message: 'Categoría eliminada exitosamente' });
    }

    // Memory Fallback
    const catIdNum = parseInt(id);
    const categoryIndex = db.memoryDb.categories.findIndex(c => c.id === catIdNum);
    if (categoryIndex === -1) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    // Desvincular productos de la categoría eliminada
    db.memoryDb.products.forEach(p => {
      if (p.category_id === catIdNum) p.category_id = null;
    });

    db.memoryDb.categories.splice(categoryIndex, 1);
    res.json({ success: true, message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar la categoría' });
  }
};
