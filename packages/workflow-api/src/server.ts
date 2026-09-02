import { createApp } from "./index.js";
import { initIntrasite } from "./intrasite/store.js";

const port = Number(process.env["PORT"] ?? 4000);

const app = createApp();

initIntrasite()
  .then(() => {
    app.listen(port, () => {
      console.log(`CareScope Workflow API listening on http://localhost:${port}`);
      console.log(`  REST      → http://localhost:${port}/api/v1`);
      console.log(`  Intrasite → http://localhost:${port}/api/v1/intrasite`);
      console.log(`  GraphQL   → http://localhost:${port}/graphql`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize Intrasite:", error);
    process.exit(1);
  });
