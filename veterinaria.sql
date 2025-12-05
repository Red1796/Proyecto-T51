-- Script de creación de base de datos

CREATE DATABASE IF NOT EXISTS veterinaria;
USE veterinaria;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS Usuario (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS Producto (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    precio DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS Cliente (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(150),
    direccion VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS Venta (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_cliente INT NOT NULL,
    fecha DATETIME NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id),
    FOREIGN KEY (id_cliente) REFERENCES Cliente(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Detalles de Venta
CREATE TABLE IF NOT EXISTS DetalleVenta (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_venta) REFERENCES Venta(id),
    FOREIGN KEY (id_producto) REFERENCES Producto(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar datos de prueba

-- Usuario de prueba (contraseña: "123456" hasheada)
INSERT INTO Usuario (nombre, correo, contraseña) VALUES 
('Admin', 'admin@veterinaria.com', '$2b$10$0l.KuC0CmVyB40Dk6j6Rcej02aHVH6qZtUkWgsn5QrOyOEKw5zqDW');

-- Productos de prueba
INSERT INTO Producto (nombre, descripcion, precio, stock) VALUES 
('Vacuna Antirrábica', 'Vacuna contra la rabia para perros y gatos', 45.00, 50),
('Desparasitante', 'Desparasitante interno para mascotas', 25.00, 100),
('Antibiótico', 'Antibiótico de amplio espectro', 35.00, 75),
('Vitaminas', 'Complejo vitamínico para mascotas', 30.00, 60);

-- Clientes de prueba
INSERT INTO Cliente (nombre, telefono, correo, direccion) VALUES 
('Cliente 1', '555-1234', 'cliente1@email.com', 'Calle 1, Casa 1'),
('Cliente 2', '555-5678', 'cliente2@email.com', 'Calle 2, Casa 2'),
('Cliente 3', '555-9012', 'cliente3@email.com', 'Calle 3, Casa 3');
