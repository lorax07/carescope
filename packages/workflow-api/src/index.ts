import express, { type Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createHandler } from "graphql-http/lib/use/express";
import { createRestRouter } from "./rest.js";
import { workflowGraphQLSchema, getGraphQLSchemaSDL } from "./graphql.js";
import { getPlatform } from "./platform.js";
import { createIntrasiteRouter } from "./intrasite/router.js";

export function createApp(): Application {
  // Ensure platform is bootstrapped
  getPlatform();

  const app: Application = express();
  const corsOrigin = process.env["INTRASITE_CORS_ORIGIN"];
  app.use(
    cors({
      origin: corsOrigin ? corsOrigin.split(",").map((value) => value.trim()) : true,
      credentials: true,
    })
  );
  if (process.env["INTRASITE_TRUST_PROXY"] === "true") {
    app.set("trust proxy", 1);
  }
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (_req, res) => {
    res.json({
      name: "CareScope Workflow API",
      version: "0.1.0",
      rest: "/api/v1",
      graphql: "/graphql",
      schema: "/graphql/schema",
      intrasite: "/api/v1/intrasite",
    });
  });

  app.use("/api/v1/intrasite", createIntrasiteRouter());
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
export * from "./intrasite/store.js";
export * from "./intrasite/router.js";
