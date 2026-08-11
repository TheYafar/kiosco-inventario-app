const db = require('../config/db');

// Obtener todos los productos (con filtros y búsqueda)
exports.getProducts = async (req, res) => {
  const { search, category_id, categoria_id, stock_status } = req.query;
  const catFilter = categoria_id !== undefined ? categoria_id : category_id;

  try {
    if (db.isPgConnected()) {
      let query = `
        SELECT p.*, c.name AS category_name, c.color_code AS category_color
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      const queryParams = [];

      if (search && search.trim() !== '') {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        query += ` AND (LOWER(p.name) LIKE $${queryParams.length} OR LOWER(p.barcode) LIKE $${queryParams.length} OR LOWER(p.description) LIKE $${queryParams.length})`;
      }

      if (catFilter && catFilter !== 'all') {
        queryParams.push(parseInt(catFilter));
        query += ` AND p.category_id = $${queryParams.length}`;
      }

      if (stock_status === 'low') {
        query += ` AND p.stock <= p.min_stock`;
      } else if (stock_status === 'out') {
        query += ` AND p.stock = 0`;
      } else if (stock_status === 'ok') {
        query += ` AND p.stock > p.min_stock`;
      }

      query += ` ORDER BY p.name ASC`;

      const result = await db.pool.query(query, queryParams);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }

    // Memory Fallback
    let products = db.memoryDb.products.map(p => {
      const cat = db.memoryDb.categories.find(c => c.id === p.category_id);
      return {
        ...p,
        category_name: cat ? cat.name : 'Sin Categoría',
        category_color: cat ? cat.color_code : '#9CA3AF'
      };
    });

    if (search && search.trim() !== '') {
      const s = search.trim().toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(s) ||
        (p.barcode && p.barcode.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s))
      );
    }

    if (catFilter && catFilter !== 'all') {
      const catId = parseInt(catFilter);
      products = products.filter(p => p.category_id === catId);
    }

    if (stock_status === 'low') {
      products = products.filter(p => p.stock <= p.min_stock);
    } else if (stock_status === 'out') {
      products = products.filter(p => p.stock === 0);
    } else if (stock_status === 'ok') {
      products = products.filter(p => p.stock > p.min_stock);
    }

    products.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al obtener productos' });
  }
};

// Obtener alertas de stock crítico (< min_stock)
exports.getLowStockAlerts = async (req, res) => {
  try {
    if (db.isPgConnected()) {
      const query = `
        SELECT p.*, c.name AS category_name, c.color_code AS category_color,
               (p.min_stock - p.stock) AS units_needed
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.stock <= p.min_stock
        ORDER BY p.stock ASC, (p.min_stock - p.stock) DESC
      `;
      const result = await db.pool.query(query);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }

    // Memory Fallback
    const alerts = db.memoryDb.products
      .filter(p => p.stock <= p.min_stock)
      .map(p => {
        const cat = db.memoryDb.categories.find(c => c.id === p.category_id);
        return {
          ...p,
          category_name: cat ? cat.name : 'Sin Categoría',
          category_color: cat ? cat.color_code : '#9CA3AF',
          units_needed: Math.max(0, p.min_stock - p.stock)
        };
      })
      .sort((a, b) => a.stock - b.stock);

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    console.error('Error al obtener alertas de stock:', error);
    res.status(500).json({ success: false, message: 'Error al obtener alertas de stock' });
  }
};

// Obtener producto por ID
exports.getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    if (db.isPgConnected()) {
      const query = `
        SELECT p.*, c.name AS category_name, c.color_code AS category_color
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `;
      const result = await db.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }

    // Memory Fallback
    const product = db.memoryDb.products.find(p => p.id === parseInt(id));
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    const cat = db.memoryDb.categories.find(c => c.id === product.category_id);
    res.json({
      success: true,
      data: {
        ...product,
        category_name: cat ? cat.name : 'Sin Categoría',
        category_color: cat ? cat.color_code : '#9CA3AF'
      }
    });
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el producto' });
  }
};

// Crear nuevo producto
exports.createProduct = async (req, res) => {
  const barcode = req.body.codigo_barras !== undefined ? req.body.codigo_barras : req.body.barcode;
  const name = req.body.nombre !== undefined ? req.body.nombre : req.body.name;
  const description = req.body.descripcion !== undefined ? req.body.descripcion : req.body.description;
  const category_id = req.body.categoria_id !== undefined ? req.body.categoria_id : req.body.category_id;
  const price = req.body.precio_venta !== undefined ? req.body.precio_venta : req.body.price;
  const cost = req.body.precio_costo !== undefined ? req.body.precio_costo : req.body.cost;
  const stock = req.body.stock_actual !== undefined ? req.body.stock_actual : req.body.stock;
  const min_stock = req.body.stock_minimo !== undefined ? req.body.stock_minimo : req.body.min_stock;
  const unit = req.body.unit;

  if (!name || String(name).trim() === '') {
    return res.status(400).json({ success: false, message: 'El nombre del producto es obligatorio' });
  }

  const parsedPrice = parseFloat(price) || 0;
  const parsedCost = parseFloat(cost) || 0;
  const parsedStock = parseInt(stock) || 0;
  const parsedMinStock = min_stock !== undefined ? parseInt(min_stock) : 5;
  const catId = category_id ? parseInt(category_id) : null;

  try {
    if (db.isPgConnected()) {
      const query = `
        INSERT INTO products (barcode, name, description, category_id, price, cost, stock, min_stock, unit)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        barcode ? barcode.trim() : null,
        name.trim(),
        description || '',
        catId,
        parsedPrice,
        parsedCost,
        parsedStock,
        parsedMinStock,
        unit || 'unidades'
      ];
      const result = await db.pool.query(query, values);
      return res.status(201).json({ success: true, message: 'Producto creado exitosamente', data: result.rows[0] });
    }

    // Memory Fallback
    if (barcode && barcode.trim() !== '') {
      const existsBarcode = db.memoryDb.products.some(p => p.barcode === barcode.trim());
      if (existsBarcode) {
        return res.status(400).json({ success: false, message: 'El código de barras ya existe' });
      }
    }

    const newProduct = {
      id: db.memoryDb.nextProdId++,
      barcode: barcode ? barcode.trim() : null,
      name: name.trim(),
      description: description || '',
      category_id: catId,
      price: parsedPrice,
      cost: parsedCost,
      stock: parsedStock,
      min_stock: parsedMinStock,
      unit: unit || 'unidades',
      created_at: new Date(),
      updated_at: new Date()
    };
    db.memoryDb.products.push(newProduct);
    res.status(201).json({ success: true, message: 'Producto creado exitosamente', data: newProduct });
  } catch (error) {
    console.error('Error al crear producto:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'El código de barras ya está registrado' });
    }
    res.status(500).json({ success: false, message: 'Error en el servidor al crear producto' });
  }
};

// Actualizar producto completo
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const barcode = req.body.codigo_barras !== undefined ? req.body.codigo_barras : req.body.barcode;
  const name = req.body.nombre !== undefined ? req.body.nombre : req.body.name;
  const description = req.body.descripcion !== undefined ? req.body.descripcion : req.body.description;
  const category_id = req.body.categoria_id !== undefined ? req.body.categoria_id : req.body.category_id;
  const price = req.body.precio_venta !== undefined ? req.body.precio_venta : req.body.price;
  const cost = req.body.precio_costo !== undefined ? req.body.precio_costo : req.body.cost;
  const stock = req.body.stock_actual !== undefined ? req.body.stock_actual : req.body.stock;
  const min_stock = req.body.stock_minimo !== undefined ? req.body.stock_minimo : req.body.min_stock;
  const unit = req.body.unit;

  if (!name || String(name).trim() === '') {
    return res.status(400).json({ success: false, message: 'El nombre del producto es obligatorio' });
  }

  const parsedPrice = parseFloat(price) || 0;
  const parsedCost = parseFloat(cost) || 0;
  const parsedStock = parseInt(stock) || 0;
  const parsedMinStock = min_stock !== undefined ? parseInt(min_stock) : 5;
  const catId = category_id ? parseInt(category_id) : null;

  try {
    if (db.isPgConnected()) {
      const query = `
        UPDATE products
        SET barcode = $1, name = $2, description = $3, category_id = $4,
            price = $5, cost = $6, stock = $7, min_stock = $8, unit = $9,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
        RETURNING *
      `;
      const values = [
        barcode ? barcode.trim() : null,
        name.trim(),
        description || '',
        catId,
        parsedPrice,
        parsedCost,
        parsedStock,
        parsedMinStock,
        unit || 'unidades',
        id
      ];
      const result = await db.pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }
      return res.json({ success: true, message: 'Producto actualizado exitosamente', data: result.rows[0] });
    }

    // Memory Fallback
    const prodIdx = db.memoryDb.products.findIndex(p => p.id === parseInt(id));
    if (prodIdx === -1) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    db.memoryDb.products[prodIdx] = {
      ...db.memoryDb.products[prodIdx],
      barcode: barcode ? barcode.trim() : null,
      name: name.trim(),
      description: description || '',
      category_id: catId,
      price: parsedPrice,
      cost: parsedCost,
      stock: parsedStock,
      min_stock: parsedMinStock,
      unit: unit || 'unidades',
      updated_at: new Date()
    };

    res.json({ success: true, message: 'Producto actualizado exitosamente', data: db.memoryDb.products[prodIdx] });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al actualizar el producto' });
  }
};

// Actualización rápida de Stock (Reabastecimiento o ajuste)
exports.updateStock = async (req, res) => {
  const { id } = req.params;
  const { stock, quantity_to_add } = req.body;

  try {
    if (db.isPgConnected()) {
      let query = '';
      let values = [];

      if (quantity_to_add !== undefined) {
        query = `
          UPDATE products
          SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        values = [parseInt(quantity_to_add), id];
      } else {
        query = `
          UPDATE products
          SET stock = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        values = [parseInt(stock), id];
      }

      const result = await db.pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }
      return res.json({ success: true, message: 'Stock actualizado correctamente', data: result.rows[0] });
    }

    // Memory Fallback
    const prodIdx = db.memoryDb.products.findIndex(p => p.id === parseInt(id));
    if (prodIdx === -1) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    let newStock = db.memoryDb.products[prodIdx].stock;
    if (quantity_to_add !== undefined) {
      newStock += parseInt(quantity_to_add);
    } else {
      newStock = parseInt(stock);
    }

    db.memoryDb.products[prodIdx].stock = Math.max(0, newStock);
    db.memoryDb.products[prodIdx].updated_at = new Date();

    res.json({ success: true, message: 'Stock actualizado correctamente', data: db.memoryDb.products[prodIdx] });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar el stock' });
  }
};

// Eliminar producto
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    if (db.isPgConnected()) {
      const result = await db.pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }
      return res.json({ success: true, message: 'Producto eliminado exitosamente' });
    }

    // Memory Fallback
    const prodIdx = db.memoryDb.products.findIndex(p => p.id === parseInt(id));
    if (prodIdx === -1) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    db.memoryDb.products.splice(prodIdx, 1);
    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar el producto' });
  }
};

// Resumen de Métricas para el Dashboard
exports.getMetrics = async (req, res) => {
  try {
    let totalProducts = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;
    let totalCategories = 0;

    if (db.isPgConnected()) {
      const prodRes = await db.pool.query(`
        SELECT
          COUNT(*)::int AS total_products,
          SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END)::int AS low_stock,
          SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)::int AS out_of_stock,
          SUM(stock * cost)::numeric AS total_value
        FROM products
      `);

      const catRes = await db.pool.query('SELECT COUNT(*)::int AS total_categories FROM categories');

      const stats = prodRes.rows[0];
      totalProducts = stats.total_products || 0;
      lowStockCount = stats.low_stock || 0;
      outOfStockCount = stats.out_of_stock || 0;
      totalStockValue = parseFloat(stats.total_value || 0);
      totalCategories = catRes.rows[0].total_categories || 0;
    } else {
      // Memory Fallback
      totalProducts = db.memoryDb.products.length;
      lowStockCount = db.memoryDb.products.filter(p => p.stock <= p.min_stock).length;
      outOfStockCount = db.memoryDb.products.filter(p => p.stock === 0).length;
      totalStockValue = db.memoryDb.products.reduce((acc, p) => acc + (p.stock * p.cost), 0);
      totalCategories = db.memoryDb.categories.length;
    }

    res.json({
      success: true,
      metrics: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalStockValue,
        totalCategories
      }
    });
  } catch (error) {
    console.error('Error al calcular métricas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener métricas del dashboard' });
  }
};

// Resetear o vaciar inventario masivamente
exports.clearInventory = async (req, res) => {
  const { mode } = req.body; // 'reset_stock' (poner a 0) o 'clear_all' (eliminar todos)

  try {
    if (db.isPgConnected()) {
      if (mode === 'clear_all') {
        await db.pool.query('DELETE FROM products');
        return res.json({ success: true, message: 'Inventario totalmente vaciado. Todos los productos fueron eliminados.' });
      } else {
        await db.pool.query('UPDATE products SET stock = 0, updated_at = CURRENT_TIMESTAMP');
        return res.json({ success: true, message: 'Stock de todos los productos establecido en 0 correctamente.' });
      }
    }

    // Memory Fallback
    if (mode === 'clear_all') {
      db.memoryDb.products = [];
      db.memoryDb.nextProdId = 1;
      return res.json({ success: true, message: 'Inventario totalmente vaciado en memoria.' });
    } else {
      db.memoryDb.products.forEach(p => {
        p.stock = 0;
        p.updated_at = new Date();
      });
      return res.json({ success: true, message: 'Stock de todos los productos establecido en 0 correctamente.' });
    }
  } catch (error) {
    console.error('Error al limpiar inventario:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al vaciar/resetear el inventario' });
  }
};

// Importar lista masiva de productos (CSV / Excel parseado)
exports.importProducts = async (req, res) => {
  const { products, mode } = req.body; // mode: 'replace' | 'merge'

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ success: false, message: 'No se enviaron productos válidos para importar' });
  }

  try {
    if (db.isPgConnected()) {
      if (mode === 'replace') {
        await db.pool.query('DELETE FROM products');
      }

      let importedCount = 0;

      for (const p of products) {
        const name = p.name || p.nombre;
        if (!name || String(name).trim() === '') continue;

        const barcode = p.barcode || p.codigo_barras || null;
        const description = p.description || p.descripcion || '';
        const price = parseFloat(p.price || p.precio_venta || 0);
        const cost = parseFloat(p.cost || p.precio_costo || 0);
        const stock = parseInt(p.stock || p.stock_actual || 0);
        const min_stock = parseInt(p.min_stock || p.stock_minimo || 5);
        const unit = p.unit || p.unidad || 'unidades';
        let catId = p.category_id || p.categoria_id || null;

        // Si se provee nombre de categoría en vez de ID, buscar o crear la categoría
        const categoryName = p.category_name || p.categoria;
        if (!catId && categoryName && String(categoryName).trim() !== '') {
          const catRes = await db.pool.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [categoryName.trim()]);
          if (catRes.rows.length > 0) {
            catId = catRes.rows[0].id;
          } else {
            const newCatRes = await db.pool.query(
              'INSERT INTO categories (name, description, color_code) VALUES ($1, $2, $3) RETURNING id',
              [categoryName.trim(), 'Categoría creada automáticamente al importar', '#4F46E5']
            );
            catId = newCatRes.rows[0].id;
          }
        }

        // Si el código de barras existe en PostgreSQL y el modo es 'merge', actualizarlo
        let updated = false;
        if (barcode && String(barcode).trim() !== '' && mode !== 'replace') {
          const checkRes = await db.pool.query('SELECT id FROM products WHERE barcode = $1', [String(barcode).trim()]);
          if (checkRes.rows.length > 0) {
            await db.pool.query(
              `UPDATE products SET name = $1, description = $2, category_id = $3, price = $4, cost = $5, stock = $6, min_stock = $7, unit = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9`,
              [name.trim(), description, catId, price, cost, stock, min_stock, unit, checkRes.rows[0].id]
            );
            updated = true;
            importedCount++;
          }
        }

        if (!updated) {
          await db.pool.query(
            `INSERT INTO products (barcode, name, description, category_id, price, cost, stock, min_stock, unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [barcode ? String(barcode).trim() : null, name.trim(), description, catId, price, cost, stock, min_stock, unit]
          );
          importedCount++;
        }
      }

      return res.json({
        success: true,
        message: `Importación completada exitosamente. Se procesaron ${importedCount} productos.`,
        importedCount
      });
    }

    // Memory Fallback
    if (mode === 'replace') {
      db.memoryDb.products = [];
    }

    let importedCount = 0;
    for (const p of products) {
      const name = p.name || p.nombre;
      if (!name || String(name).trim() === '') continue;

      const barcode = p.barcode || p.codigo_barras || null;
      const description = p.description || p.descripcion || '';
      const price = parseFloat(p.price || p.precio_venta || 0);
      const cost = parseFloat(p.cost || p.precio_costo || 0);
      const stock = parseInt(p.stock || p.stock_actual || 0);
      const min_stock = parseInt(p.min_stock || p.stock_minimo || 5);
      const unit = p.unit || p.unidad || 'unidades';
      let catId = p.category_id || p.categoria_id || null;

      const categoryName = p.category_name || p.categoria;
      if (!catId && categoryName && String(categoryName).trim() !== '') {
        let cat = db.memoryDb.categories.find(c => c.name.toLowerCase() === String(categoryName).trim().toLowerCase());
        if (cat) {
          catId = cat.id;
        } else {
          catId = db.memoryDb.nextCatId++;
          db.memoryDb.categories.push({
            id: catId,
            name: String(categoryName).trim(),
            description: 'Categoría creada automáticamente al importar',
            color_code: '#4F46E5',
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      const existingIndex = barcode ? db.memoryDb.products.findIndex(pr => pr.barcode === String(barcode).trim()) : -1;
      if (existingIndex !== -1 && mode !== 'replace') {
        db.memoryDb.products[existingIndex] = {
          ...db.memoryDb.products[existingIndex],
          name: name.trim(),
          description,
          category_id: catId,
          price,
          cost,
          stock,
          min_stock,
          unit,
          updated_at: new Date()
        };
      } else {
        db.memoryDb.products.push({
          id: db.memoryDb.nextProdId++,
          barcode: barcode ? String(barcode).trim() : null,
          name: name.trim(),
          description,
          category_id: catId,
          price,
          cost,
          stock,
          min_stock,
          unit,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      importedCount++;
    }

    res.json({
      success: true,
      message: `Importación completada exitosamente. Se procesaron ${importedCount} productos.`,
      importedCount
    });

  } catch (error) {
    console.error('Error al importar productos:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al importar productos' });
  }
};

// Exportar catálogo de productos a CSV con UTF-8 BOM
exports.exportProductsCSV = async (req, res) => {
  try {
    let products = [];
    if (db.isPgConnected()) {
      const query = `
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name ASC
      `;
      const result = await db.pool.query(query);
      products = result.rows;
    } else {
      products = db.memoryDb.products.map(p => {
        const cat = db.memoryDb.categories.find(c => c.id === p.category_id);
        return { ...p, category_name: cat ? cat.name : '' };
      });
    }

    // Construcción de CSV
    const headers = ['Codigo_Barras', 'Nombre', 'Descripcion', 'Categoria', 'Precio_Venta', 'Costo', 'Stock', 'Stock_Minimo', 'Unidad'];
    
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = products.map(p => [
      escapeCsv(p.barcode || ''),
      escapeCsv(p.name || ''),
      escapeCsv(p.description || ''),
      escapeCsv(p.category_name || ''),
      p.price,
      p.cost,
      p.stock,
      p.min_stock,
      escapeCsv(p.unit || 'unidades')
    ].join(','));

    // Incluir BOM UTF-8 (\uFEFF) para abrir en Excel sin problemas de tildes
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventario_kiosco.csv"');
    res.status(200).send(csvContent);

  } catch (error) {
    console.error('Error al exportar inventario a CSV:', error);
    res.status(500).json({ success: false, message: 'Error al exportar inventario' });
  }
};

