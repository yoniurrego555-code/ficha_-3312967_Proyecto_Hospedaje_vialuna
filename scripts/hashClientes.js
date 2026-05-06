require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const bcrypt = require("bcrypt");
const authModel = require("../src/models/auth.model");

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const DEFAULT_CLIENT_PASSWORD = process.env.DEFAULT_CLIENT_PASSWORD || "123456";

async function main() {
  const clientes = await authModel.getAllClientes();

  if (!clientes.length) {
    console.log("No hay clientes para actualizar.");
    return;
  }

  for (const cliente of clientes) {
    const hash = await bcrypt.hash(DEFAULT_CLIENT_PASSWORD, SALT_ROUNDS);
    await authModel.updateClientePassword(cliente.NroDocumento, hash);
    console.log(`Cliente ${cliente.NroDocumento} actualizado.`);
  }

  console.log(`Proceso finalizado. Clientes actualizados: ${clientes.length}. Clave base: ${DEFAULT_CLIENT_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error al actualizar clientes:", error);
    process.exit(1);
  });
