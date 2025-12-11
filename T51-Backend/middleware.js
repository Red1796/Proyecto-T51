const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "codigo_secreto_2026";

// Middleware de autenticación
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

module.exports = { authMiddleware, SECRET_KEY };
