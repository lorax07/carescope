/**
 * Shared platform singleton for the API process.
 */
import {
  createWorkflowPlatform,
  type WorkflowPlatform,
} from "@carescope/workflow-core";

const TENANT = process.env["CARESCOPE_TENANT_ID"] ?? "demo-lab";
const USER = process.env["CARESCOPE_SYSTEM_USER"] ?? "system";

let platform: WorkflowPlatform | null = null;

export function getPlatform(): WorkflowPlatform {
  if (!platform) {
    platform = createWorkflowPlatform({
      seedTemplates: { tenantId: TENANT, createdBy: USER },
    });
  }
  return platform;
}

export function getDefaultTenant(): string {
  return TENANT;
}

export function resetPlatformForTests(): WorkflowPlatform {
  platform = createWorkflowPlatform({
    seedTemplates: { tenantId: TENANT, createdBy: USER },
  });
  return platform;
}
