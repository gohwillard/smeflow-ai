import "dotenv/config";

import { app } from "./app.js";
import { getJwtConfig } from "./config/auth.js";

const port = Number(process.env.PORT) || 4000;

getJwtConfig();

app.listen(port, () => {
  console.log(`SMEFlow API is running on http://localhost:${port}`);
});
