import type { CrmCommunication } from "./types";

/** Vendor-neutral log. UI never talks to an email or phone vendor directly. */
export interface CommunicationAdapter {
  record(entry: CrmCommunication): Promise<void>;
}

export class LocalCommunicationAdapter implements CommunicationAdapter {
  async record(): Promise<void> {
    /* Persistence is the tenant CRM overlay. */
  }
}

export const communications: CommunicationAdapter = new LocalCommunicationAdapter();
