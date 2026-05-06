ALTER TABLE clientes
ADD CONSTRAINT uq_clientes_email UNIQUE (Email);

ALTER TABLE clientes
ADD CONSTRAINT uq_clientes_documento UNIQUE (NroDocumento);

ALTER TABLE usuarios
ADD CONSTRAINT uq_usuarios_email UNIQUE (Email);

CREATE INDEX idx_clientes_email ON clientes (Email);
CREATE INDEX idx_usuarios_email ON usuarios (Email);
