CREATE TABLE IF NOT EXISTS roles (
  IDRol INT AUTO_INCREMENT PRIMARY KEY,
  Nombre VARCHAR(100) NOT NULL,
  Descripcion VARCHAR(255) NULL,
  Estado TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS permisos (
  IDPermiso INT AUTO_INCREMENT PRIMARY KEY,
  NombrePermisos VARCHAR(120) NOT NULL,
  EstadoPermisos VARCHAR(40) NOT NULL DEFAULT 'Activo',
  Descripcion VARCHAR(255) NULL,
  IsActive TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rolespermisos (
  IDRolPermiso INT AUTO_INCREMENT PRIMARY KEY,
  IDRol INT NOT NULL,
  IDPermiso INT NOT NULL,
  CONSTRAINT fk_rolespermisos_roles
    FOREIGN KEY (IDRol) REFERENCES roles(IDRol),
  CONSTRAINT fk_rolespermisos_permisos
    FOREIGN KEY (IDPermiso) REFERENCES permisos(IDPermiso),
  CONSTRAINT uq_rolespermisos UNIQUE (IDRol, IDPermiso)
);

CREATE TABLE IF NOT EXISTS usuarios (
  IDUsuario INT AUTO_INCREMENT PRIMARY KEY,
  Nombre VARCHAR(100) NOT NULL,
  Apellido VARCHAR(100) NULL,
  Email VARCHAR(150) NOT NULL,
  Telefono VARCHAR(30) NULL,
  Username VARCHAR(80) NOT NULL,
  Password VARCHAR(120) NOT NULL,
  Estado TINYINT(1) NOT NULL DEFAULT 1,
  IDRol INT NOT NULL,
  CONSTRAINT fk_usuarios_roles
    FOREIGN KEY (IDRol) REFERENCES roles(IDRol),
  CONSTRAINT uq_usuarios_email UNIQUE (Email),
  CONSTRAINT uq_usuarios_username UNIQUE (Username)
);

INSERT INTO roles (Nombre, Descripcion, Estado)
SELECT 'Administrador', 'Acceso total al sistema', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(Nombre) = 'administrador');

INSERT INTO roles (Nombre, Descripcion, Estado)
SELECT 'Cliente', 'Acceso limitado a funciones de cliente', 1
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(Nombre) = 'cliente');
