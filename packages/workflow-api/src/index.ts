import express, { type Application } from "express";
import cors from "cors";
import { createHandler } from "graphql-http/lib/use/express";
import { createRestRouter } from "./rest.js";
import { workflowGraphQLSchema, getGraphQLSchemaSDL } from "./graphql.js";
import { getPlatform } from "./platform.js";

export function createApp(): Application {
  // Ensure platform is bootstrapped
  getPlatform();

  const app: Application = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: "CareScope Workflow API",
      version: "0.1.0",
      rest: "/api/v1",
      graphql: "/graphql",
      schema: "/graphql/schema",
    });
  });

  app.use("/api/v1", createRestRouter());

  app.all(
    "/graphql",
    createHandler({
      schema: workflowGraphQLSchema,
    })
  );

  app.get("/graphql/schema", (_req, res) => {
    res.type("text/plain").send(getGraphQLSchemaSDL());
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  );

  return app;
}

export * from "./platform.js";
export * from "./rest.js";
export * from "./graphql.js";
