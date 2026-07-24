/**
 * Event bus — every significant LIMS event can trigger workflows.
 * Multi-tenant aware with filter expressions.
 */

import { v4 as uuid } from "uuid";
import { evaluateBoolean } from "./expression.js";
import type {
  SystemEventType,
  WorkflowDefinition,
  WorkflowTrigger,
} from "./types.js";

export interface DomainEvent {
  id: string;
  type: SystemEventType | string;
  tenantId: string;
  timestamp: string;
  payload: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  userId?: string;
  correlationId?: string;
  module?: string;
}

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

export interface TriggerMatch {
  workflow: WorkflowDefinition;
  trigger: WorkflowTrigger;
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private globalHandlers = new Set<EventHandler>();
  private history: DomainEvent[] = [];
  private maxHistory: number;

  constructor(options?: { maxHistory?: number }) {
    this.maxHistory = options?.maxHistory ?? 1000;
  }

  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  onAny(handler: EventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  async emit(
    partial: Omit<DomainEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }
  ): Promise<DomainEvent> {
    const event: DomainEvent = {
      id: partial.id ?? uuid(),
      timestamp: partial.timestamp ?? new Date().toISOString(),
      type: partial.type,
      tenantId: partial.tenantId,
      payload: partial.payload,
      entityType: partial.entityType,
      entityId: partial.entityId,
      userId: partial.userId,
      correlationId: partial.correlationId ?? uuid(),
      module: partial.module,
    };

    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const typed = this.handlers.get(event.type) ?? new Set();
    const wildcard = this.handlers.get("*") ?? new Set();
    const all = [...typed, ...wildcard, ...this.globalHandlers];

    await Promise.all(all.map((h) => Promise.resolve(h(event))));
    return event;
  }

  getHistory(tenantId?: string, limit = 100): DomainEvent[] {
    const filtered = tenantId
      ? this.history.filter((e) => e.tenantId === tenantId)
      : this.history;
    return filtered.slice(-limit);
  }

  clearHistory(): void {
    this.history = [];
  }
}

/**
 * Find published workflows whose triggers match a domain event.
 */
export function matchTriggers(
  workflows: WorkflowDefinition[],
  event: DomainEvent
): TriggerMatch[] {
  const matches: TriggerMatch[] = [];

  for (const workflow of workflows) {
    if (workflow.status !== "published") continue;
    if (workflow.tenantId !== event.tenantId) continue;

    for (const trigger of workflow.triggers) {
      if (!trigger.enabled) continue;
      if (trigger.type !== "event") continue;
      if (trigger.eventType && trigger.eventType !== event.type) continue;

      if (trigger.filter) {
        const ctx = {
          ...event.payload,
          event: event.payload,
          entityType: event.entityType,
          entityId: event.entityId,
          module: event.module,
        };
        try {
          if (!evaluateBoolean(trigger.filter, ctx)) continue;
        } catch {
          continue;
        }
      }

      matches.push({ workflow, trigger });
    }
  }

  return matches;
}

/** Catalog of system events for the designer / docs */
export const SYSTEM_EVENT_CATALOG: {
  type: SystemEventType;
  label: string;
  module: string;
  description: string;
}[] = [
  { type: "sample.created", label: "Sample Created", module: "sample_lifecycle", description: "A new sample record was created" },
  { type: "sample.received", label: "Sample Received", module: "sample_lifecycle", description: "Sample received into the laboratory" },
  { type: "sample.assigned", label: "Sample Assigned", module: "sample_lifecycle", description: "Sample assigned to analyst or workstation" },
  { type: "sample.completed", label: "Sample Completed", module: "sample_lifecycle", description: "All testing on the sample is complete" },
  { type: "test.started", label: "Test Started", module: "test_scheduling", description: "A scheduled test was started" },
  { type: "test.completed", label: "Test Completed", module: "test_scheduling", description: "A test run finished" },
  { type: "result.entered", label: "Result Entered", module: "results_entry", description: "Analytical result was entered" },
  { type: "result.approved", label: "Result Approved", module: "results_entry", description: "Result passed review/approval" },
  { type: "instrument.data_imported", label: "Instrument Data Imported", module: "instrument_integration", description: "Instrument sent or imported data" },
  { type: "inventory.threshold_reached", label: "Inventory Threshold", module: "inventory", description: "Stock fell below reorder threshold" },
  { type: "equipment.calibration_due", label: "Calibration Due", module: "calibration_maintenance", description: "Equipment is due for calibration" },
  { type: "customer.request_submitted", label: "Customer Request", module: "customer_portal", description: "Customer submitted a portal request" },
  { type: "invoice.generated", label: "Invoice Generated", module: "billing", description: "A billing invoice was generated" },
  { type: "user.created", label: "User Created", module: "user_onboarding", description: "A new user account was created" },
  { type: "document.uploaded", label: "Document Uploaded", module: "document_control", description: "A document was uploaded" },
  { type: "api.event_received", label: "API Event Received", module: "api_integrations", description: "Inbound API/webhook event" },
  { type: "schedule.date_reached", label: "Scheduled Date Reached", module: "workflow_automation", description: "A scheduled date/time was reached" },
  { type: "workflow.manual_trigger", label: "Manual Trigger", module: "workflow_automation", description: "User manually started a workflow" },
  { type: "quality_event.opened", label: "Quality Event Opened", module: "quality_events", description: "A quality event was opened" },
  { type: "capa.initiated", label: "CAPA Initiated", module: "capa", description: "Corrective/preventive action started" },
  { type: "non_conformance.reported", label: "Non-Conformance Reported", module: "non_conformance", description: "Non-conformance was reported" },
  { type: "training.due", label: "Training Due", module: "training_records", description: "Training requirement is due" },
  { type: "change_control.submitted", label: "Change Control Submitted", module: "change_control", description: "Change control request submitted" },
];
