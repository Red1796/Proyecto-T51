require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas de la API
app.use("/api", routes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ status: 500, message: "Error interno del servidor..." });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});
