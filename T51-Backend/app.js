require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = express();
const PORT = process.env.PORT || 4000;
const cors = require("cors");
const SECRET_KEY = process.env.JWT_SECRET || "codigo_secreto_2026";

app.use(cors());
app.use(express.json());

/*
//Conexión a base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});
*/
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "admin",
  database: "veterinaria",
});

pool.getConnection((error, conexion) => {
  if (error) {
    console.log("Error de conexión a la base de datos...");
  } else {
    console.log("Conexión exitosa a la base de datos...");
  }
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res
      .status(401)
      .json({ status: 401, message: "El token es obligatorio..." });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res
        .status(401)
        .json({ status: 401, message: "Token inválido..." });
    }

    req.usuario = user;
    next();
  });
};

// Registro de usuario
app.post("/api/register", async (req, res) => {
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

// Login
app.post("/api/login", async (req, res) => {
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

    // Buscar el campo de contraseña (puede ser 'password' o 'contraseña')
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

//Rutas de productos
app.get("/api/productos", (req, res) => {
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

//Rutas de usuarios
app.get("/api/usuarios", (req, res) => {
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

//Rutas de ventas
// Crear venta
app.post("/api/venta", authMiddleware, (req, res) => {
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

//Rutas de facturas
// Ver factura
app.get("/api/factura/:id", authMiddleware, (req, res) => {
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

//Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ status: 500, message: "Error interno del servidor..." });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
