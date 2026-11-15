import { createApp } from "./app";
import { initDb } from "./db";

const port = Number(process.env.PORT ?? 3000);
createApp(initDb()).listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
