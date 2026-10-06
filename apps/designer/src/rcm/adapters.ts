export type ClearinghouseSubmission = {
  claimId: string;
  payload: string;
  accepted: boolean;
  controlNumber: string;
  message: string;
};

export type EligibilityInquiry = {
  payerId: string;
  accountId: string;
  memberId?: string;
};

export type EligibilityResponse = {
  status: "active" | "inactive" | "unknown";
  detail: string;
};

export type ParsedRemittance = {
  checkNumber: string;
  payerId: string;
  totalCents: number;
  lines: { claimId: string; paidCents: number; carc: string }[];
};

/** Vendor-neutral boundary for 837/835/270/271/276/277. UI never talks to a clearinghouse directly. */
export interface ClearinghouseAdapter {
  submit837(claimId: string, document: string): Promise<ClearinghouseSubmission>;
  eligibility(inquiry: EligibilityInquiry): Promise<EligibilityResponse>;
  parse835(raw: string): ParsedRemittance;
}

export class SimulatedClearinghouse implements ClearinghouseAdapter {
  async submit837(claimId: string, document: string): Promise<ClearinghouseSubmission> {
    return {
      claimId,
      payload: document,
      accepted: true,
      controlNumber: `ISA-${claimId.replace(/\W/g, "").slice(-6)}`,
      message: "Simulated clearinghouse accepted the 837.",
    };
  }

  async eligibility(inquiry: EligibilityInquiry): Promise<EligibilityResponse> {
    if (inquiry.payerId === "SELF") {
      return { status: "active", detail: "Self-pay does not require eligibility." };
    }
    return { status: "active", detail: `Coverage confirmed for payer ${inquiry.payerId}.` };
  }

  parse835(raw: string): ParsedRemittance {
    const totalCents = Number(raw.match(/total=(\d+)/)?.[1] ?? 0);
    const claimId = raw.match(/claim=([A-Z0-9-]+)/)?.[1] ?? "";
    return {
      checkNumber: raw.match(/check=([A-Z0-9-]+)/)?.[1] ?? "ERA-SIM",
      payerId: raw.match(/payer=([A-Z0-9-]+)/)?.[1] ?? "",
      totalCents,
      lines: claimId ? [{ claimId, paidCents: totalCents, carc: "" }] : [],
    };
  }
}

export const clearinghouse: ClearinghouseAdapter = new SimulatedClearinghouse();
