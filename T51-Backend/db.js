const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

pool.getConnection((error, conexion) => {
  if (error) {
    console.log("❌ Error de conexión a la base de datos...");
    console.log("Detalles del error:", error.message);
    console.log("Código:", error.code);
  } else {
    console.log("✅ Conexión exitosa a la base de datos...");
    conexion.release();
  }
});

module.exports = pool;
