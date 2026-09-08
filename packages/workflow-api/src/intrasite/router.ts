import { Router, type Request, type Response, type NextFunction } from "express";
import {
  assertLoginRateLimit,
  clearLoginRateLimit,
  cookieName,
  cookieSecure,
  jwtExpiresSeconds,
  signToken,
  verifyPassword,
  verifyToken,
} from "./auth.js";
import { LAB_MODULE_CATALOG, runInfraQuery } from "./catalog.js";
import {
  getIntrasiteStore,
  instanceHostPattern,
  labHeader,
  tenantHeader,
} from "./store.js";
import type { Client, SessionUser } from "./types.js";
import { normalizeEmail } from "./util.js";

type AuthedRequest = Request & { intrasiteUser?: SessionUser };

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function httpError(error: unknown, res: Response): void {
  const status = Number((error as { status?: number }).status ?? 500);
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
}

function readToken(req: Request): string | null {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const fromCookie = req.cookies?.[cookieName()];
  return typeof fromCookie === "string" && fromCookie ? fromCookie : null;
}

function publicUser(user: SessionUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(cookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: jwtExpiresSeconds() * 1000,
  });
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readToken(req);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.intrasiteUser = user;
  next();
}

export function createIntrasiteRouter(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "carescope-intrasite",
      time: new Date().toISOString(),
    });
  });

  router.get("/meta", (_req, res) => {
    const store = getIntrasiteStore();
    res.json({
      product: "CareScope Intrasite",
      store: store.kind,
      tenantHeader: tenantHeader(),
      labHeader: labHeader(),
      instanceHostPattern: instanceHostPattern(),
    });
  });

  router.post(
    "/auth/login",
    asyncHandler(async (req, res) => {
      try {
        const email = normalizeEmail(String(req.body?.email ?? ""));
        const password = String(req.body?.password ?? "");
        if (!email || !password) {
          res.status(400).json({ error: "Email and password are required" });
          return;
        }
        assertLoginRateLimit(email);
        const record = await getIntrasiteStore().getUserByEmail(email);
        if (!record || !(await verifyPassword(password, record.passwordHash))) {
          res.status(401).json({ error: "Invalid email or password" });
          return;
        }
        clearLoginRateLimit(email);
        const session: SessionUser = {
          id: record.id,
          email: record.email,
          name: record.name,
          role: record.role,
        };
        const token = signToken(session);
        setSessionCookie(res, token);
        res.json({ token, user: publicUser(session) });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.post("/auth/logout", (_req, res) => {
    res.clearCookie(cookieName(), { path: "/" });
    res.status(204).end();
  });

  router.get("/auth/me", requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: publicUser(req.intrasiteUser!) });
  });

  router.get(
    "/clients",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json({ clients: await getIntrasiteStore().listClients() });
    })
  );

  router.post(
    "/clients",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const client = await getIntrasiteStore().createClient({
          name: String(req.body?.name ?? ""),
          slug: req.body?.slug ? String(req.body.slug) : undefined,
        });
        res.status(201).json({ client, routing: routingFor(client) });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.get(
    "/clients/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const client = await getIntrasiteStore().getClient(String(req.params["id"] ?? ""));
      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }
      const store = getIntrasiteStore();
      const labs = await store.listLabs(client.id);
      const dossier = await store.getDossier(client.id);
      const requests = await store.listModuleRequests(client.id);
      const closeRequest = await store.getCloseRequest(client.id);
      res.json({
        client,
        labs,
        routing: routingFor(client),
        dossier,
        requests,
        closeRequest,
        moduleCatalog: LAB_MODULE_CATALOG,
      });
    })
  );

  router.patch(
    "/clients/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const client = await getIntrasiteStore().updateClient(String(req.params["id"] ?? ""), {
          name: req.body?.name ? String(req.body.name) : undefined,
          status: req.body?.status,
        });
        if (!client) {
          res.status(404).json({ error: "Client not found" });
          return;
        }
        res.json({ client, routing: routingFor(client) });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.get(
    "/clients/:id/labs",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const labs = await getIntrasiteStore().listLabs(String(req.params["id"] ?? ""));
        res.json({ labs });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.post(
    "/clients/:id/labs",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const lab = await getIntrasiteStore().createLab(String(req.params["id"] ?? ""), {
          name: String(req.body?.name ?? ""),
          slug: req.body?.slug ? String(req.body.slug) : undefined,
          siteCode: req.body?.siteCode ? String(req.body.siteCode) : undefined,
        });
        res.status(201).json({ lab });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.get(
    "/clients/:id/dossier",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const dossier = await getIntrasiteStore().getDossier(String(req.params["id"] ?? ""));
        res.json({ dossier, moduleCatalog: LAB_MODULE_CATALOG });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.post(
    "/clients/:id/query",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const clientId = String(req.params["id"] ?? "");
        const store = getIntrasiteStore();
        const client = await store.getClient(clientId);
        if (!client) {
          res.status(404).json({ error: "Client not found" });
          return;
        }
        const labs = await store.listLabs(clientId);
        const dossier = await store.getDossier(clientId);
        const environment =
          req.body?.environment === "dev1" ||
          req.body?.environment === "dev2" ||
          req.body?.environment === "qa"
            ? String(req.body.environment)
            : undefined;
        res.json(runInfraQuery(String(req.body?.sql ?? ""), labs, dossier, environment));
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.get(
    "/clients/:id/module-requests",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const labId = typeof req.query.labId === "string" ? req.query.labId : undefined;
        const requests = await getIntrasiteStore().listModuleRequests(
          String(req.params["id"] ?? ""),
          labId
        );
        res.json({ requests });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.post(
    "/clients/:id/labs/:labId/module-requests",
    requireAuth,
    asyncHandler(async (req: AuthedRequest, res) => {
      try {
        const request = await getIntrasiteStore().createModuleRequest(
          String(req.params["id"] ?? ""),
          String(req.params["labId"] ?? ""),
          {
            moduleId: String(req.body?.moduleId ?? ""),
            action: req.body?.action === "remove" ? "remove" : "add",
            requestedBy: req.intrasiteUser?.name ?? "Intrasite operator",
          }
        );
        res.status(201).json({ request });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.post(
    "/clients/:id/module-requests/:requestId/approve",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const step = req.body?.step === "business" ? "business" : "secondary";
        const request = await getIntrasiteStore().approveModuleRequest(
          String(req.params["id"] ?? ""),
          String(req.params["requestId"] ?? ""),
          step
        );
        res.json({ request });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.post(
    "/clients/:id/close-requests",
    requireAuth,
    asyncHandler(async (req: AuthedRequest, res) => {
      try {
        const request = await getIntrasiteStore().createCloseRequest(
          String(req.params["id"] ?? ""),
          req.intrasiteUser?.name ?? "Intrasite operator"
        );
        res.status(201).json({ request });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.post(
    "/clients/:id/close-requests/:requestId/approve",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const step = req.body?.step === "business" ? "business" : "secondary";
        const request = await getIntrasiteStore().approveCloseRequest(
          String(req.params["id"] ?? ""),
          String(req.params["requestId"] ?? ""),
          step
        );
        res.json({ request });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  router.delete(
    "/clients/:id/labs/:labId/modules/:moduleId",
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const lab = await getIntrasiteStore().removeLabModule(
          String(req.params["id"] ?? ""),
          String(req.params["labId"] ?? ""),
          String(req.params["moduleId"] ?? "")
        );
        res.json({ lab });
      } catch (error) {
        httpError(error, res);
      }
    })
  );

  return router;
}

function routingFor(client: Client) {
  return {
    tenantHeader: tenantHeader(),
    tenantValue: client.slug,
    labHeader: labHeader(),
    host: instanceHostPattern().replace("{slug}", client.slug),
    databaseName: client.databaseName,
    isolation: client.isolation,
  };
}
