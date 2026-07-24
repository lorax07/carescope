import { createApp } from "./index.js";

const port = Number(process.env["PORT"] ?? 4000);
const app = createApp();

app.listen(port, () => {
  console.log(`CareScope Workflow API listening on http://localhost:${port}`);
  console.log(`  REST    → http://localhost:${port}/api/v1`);
  console.log(`  GraphQL → http://localhost:${port}/graphql`);
});
