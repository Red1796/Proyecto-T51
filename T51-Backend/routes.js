const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const { authMiddleware, SECRET_KEY } = require("./middleware");

const router = express.Router();

// AUTENTICACIÓN

router.post("/register", async (req, res) => {
  const { nombre, correo, contraseña } = req.body;

  if (!nombre || !correo || !contraseña) {
    return res.status(400).json({
      status: 400,
      message: "nombre, correo y contraseña son requeridos...",
    });
  }

  const saltRound = 10;
  const passwordHash = await bcrypt.hash(contraseña, saltRound);

  const sql =
    "INSERT INTO Usuario (nombre, correo, contraseña) VALUES (?, ?, ?)";

  pool.query(sql, [nombre, correo, passwordHash], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ status: 500, message: "Error al registrar usuario..." });
    }

    res
      .status(201)
      .json({ status: 201, message: "Usuario registrado exitosamente..." });
  });
});

router.post("/login", async (req, res) => {
  const { username, correo, password } = req.body;
  const userCorreo = correo || username;

  if (!userCorreo || !password) {
    return res
      .status(400)
      .json({ status: 400, message: "correo y contraseña son requeridos..." });
  }

  const sql = "SELECT * FROM Usuario WHERE correo = ?";

  pool.query(sql, [userCorreo], async (err, results) => {
    if (err) {
      console.error("Error en query:", err);
      return res
        .status(500)
        .json({ status: 500, message: "Error en la consulta sql..." });
    }

    if (results.length === 0) {
      console.log(`Usuario no encontrado: ${userCorreo}`);
      return res
        .status(401)
        .json({ status: 401, message: "Credenciales inválidas testing..." });
    }

    const usuario = results[0];
    console.log("Usuario encontrado:", usuario);

    const passwordField = usuario.password || usuario.contraseña;

    if (!passwordField) {
      console.error("No se encontró campo de contraseña");
      return res.status(500).json({
        status: 500,
        message: "Error en la configuración del usuario...",
      });
    }

    const isMatch = await bcrypt.compare(password, passwordField);

    if (!isMatch) {
      console.log("Contraseña no coincide");
      return res
        .status(401)
        .json({ status: 401, message: "Credenciales inválidas testing 2..." });
    }

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({ status: 200, message: "success", token: token });
  });
});

// PRODUCTOS

router.get("/productos", (req, res) => {
  const sql = "SELECT * FROM Producto";

  pool.query(sql, (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ status: 500, message: "Error al obtener productos..." });
    }

    res.status(200).json({ status: 200, data: results });
  });
});

router.post("/productos", authMiddleware, (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;

  if (!nombre || !precio) {
    return res.status(400).json({
      status: 400,
      message: "nombre y precio son requeridos...",
    });
  }

  const sql =
    "INSERT INTO Producto (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)";

  pool.query(
    sql,
    [nombre, descripcion || null, precio, stock || 0],
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ status: 500, message: "Error al crear producto..." });
      }

      res.status(201).json({
        status: 201,
        message: "Producto creado exitosamente...",
        data: { id: result.insertId },
      });
    }
  );
});

// USUARIOS

router.get("/usuarios", (req, res) => {
  const sql = "SELECT id, nombre, correo FROM Usuario";

  pool.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error al obtener usuarios:", err.sqlMessage);
      return res
        .status(500)
        .json({ status: 500, message: "Error al obtener usuarios" });
    }

    res.status(200).json({ status: 200, data: results });
  });
});

// VENTAS

router.get("/ventas", authMiddleware, (req, res) => {
  const sql = `
    SELECT v.*, u.nombre as usuario, c.nombre as cliente 
    FROM Venta v 
    JOIN Usuario u ON v.id_usuario = u.id 
    JOIN Cliente c ON v.id_cliente = c.id 
    ORDER BY v.fecha DESC
  `;

  pool.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error al obtener ventas:", err.sqlMessage);
      return res
        .status(500)
        .json({ status: 500, message: "Error al obtener ventas..." });
    }

    res.status(200).json({ status: 200, data: results });
  });
});

router.post("/venta", authMiddleware, (req, res) => {
  const { id_cliente, productos } = req.body;
  const id_usuario = req.usuario.id;

  if (!id_cliente || !productos || !Array.isArray(productos)) {
    return res
      .status(400)
      .json({ status: 400, message: "Datos incompletos..." });
  }

  const fecha = new Date();
  let total = 0;
  productos.forEach((p) => (total += p.precio * p.cantidad));

  const sqlVenta =
    "INSERT INTO Venta (id_usuario, id_cliente, fecha, total) VALUES (?, ?, ?, ?)";

  pool.query(
    sqlVenta,
    [id_usuario, id_cliente, fecha, total],
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ status: 500, message: "Error al crear venta..." });
      }

      const id_venta = result.insertId;
      const detalles = productos.map((p) => [
        id_venta,
        p.id,
        p.cantidad,
        p.precio * p.cantidad,
      ]);

      const sqlDetalles =
        "INSERT INTO DetalleVenta (id_venta, id_producto, cantidad, subtotal) VALUES ?";

      pool.query(sqlDetalles, [detalles], (err2) => {
        if (err2) {
          return res.status(500).json({
            status: 500,
            message: "Error al guardar detalles de venta...",
          });
        }

        res.status(201).json({
          status: 201,
          message: "Venta registrada exitosamente...",
          data: { id_venta },
        });
      });
    }
  );
});

// FACTURAS

router.get("/factura/:id", authMiddleware, (req, res) => {
  const id_venta = req.params.id;

  const sqlVenta =
    "SELECT v.*, u.nombre as usuario, c.nombre as cliente, c.telefono FROM Venta v JOIN Usuario u ON v.id_usuario = u.id JOIN Cliente c ON v.id_cliente = c.id WHERE v.id = ?";

  pool.query(sqlVenta, [id_venta], (err, ventas) => {
    if (err || ventas.length === 0) {
      return res
        .status(404)
        .json({ status: 404, message: "Venta no encontrada..." });
    }

    const sqlDetalles =
      "SELECT dv.*, p.nombre as producto FROM DetalleVenta dv JOIN Producto p ON dv.id_producto = p.id WHERE dv.id_venta = ?";

    pool.query(sqlDetalles, [id_venta], (err2, detalles) => {
      if (err2) {
        return res.status(500).json({
          status: 500,
          message: "Error al obtener detalles de venta...",
        });
      }

      res.status(200).json({
        status: 200,
        veterinaria: {
          nombre: "Veterinaria Proyecto",
          direccion: "Calle 123",
          telefono: "5555-5555",
        },
        venta: ventas[0],
        detalles,
      });
    });
  });
});

module.exports = router;
