import { describe, expect, it } from "vitest";
import { APP_CONNECTORS, INITIAL_MESSAGES, CONNECT_INTERFACES, catalogInstrument, connectorById, initialConnectState, interfaceById, isInterfaceChannel, matchesQuery, channelFromSetup, emptyChannelSetup, messageIsSuccess, messageOn, suggestInteraction, withAppConnection, withAttempt, withConfiguredChannel, withInstrumentIntegration, withQuarantine, withTokenReplaced } from "./connectModel";

describe("sequence connect message handling", () => {
  it("delivers a timeout on retry and records the attempt", () => {
    const timeout = INITIAL_MESSAGES.find((message) => message.id === "MSG-24022");
    expect(timeout).toBeTruthy();
    const next = withAttempt(timeout!, "Nov 17, 4:22 PM CT", false);
    expect(next.status).toBe("delivered");
    expect(next.steps.at(-1)?.detail).toBe("Destination accepted the message.");
    expect(next.steps.some((step) => step.detail.includes("timed out"))).toBe(true);
  });

  it("keeps a missing patient failed and writes the same rejection again", () => {
    const missing = INITIAL_MESSAGES.find((message) => message.id === "MSG-24018");
    const next = withAttempt(missing!, "Nov 17, 4:30 PM CT", false);
    expect(next.status).toBe("failed");
    expect(next.steps.at(-1)?.label).toBe("Delivery attempt 2");
    expect(next.steps.at(-1)?.detail).toContain("V-104428");
  });

  it("lets a replaced token succeed on the following retry", () => {
    const denied = INITIAL_MESSAGES.find((message) => message.id === "MSG-24031");
    const replaced = withTokenReplaced(denied!, "Nov 17, 4:40 PM CT");
    expect(withAttempt(denied!, "Nov 17, 4:41 PM CT", false).status).toBe("failed");
    expect(withAttempt(replaced, "Nov 17, 4:42 PM CT", false).status).toBe("delivered");
  });

  it("blocks a retry after a file is quarantined", () => {
    const file = INITIAL_MESSAGES.find((message) => message.id === "MSG-24040");
    const held = withQuarantine(file!, "Nov 17, 4:45 PM CT");
    const retried = withAttempt(held, "Nov 17, 4:46 PM CT", false);
    expect(retried.status).toBe("held");
    expect(retried.steps.at(-1)?.label).toBe("Retry blocked");
  });

  it("starts an app API connection once and keeps the categories", () => {
    const slack = connectorById("slack");
    expect(slack?.category).toBe("Messaging");
    expect(new Set(APP_CONNECTORS.map((item) => item.category))).toEqual(new Set(["Messaging", "CRM", "Email", "EHR", "Storage", "Identity"]));
    const started = withAppConnection(initialConnectState(), slack!, "  north-lab  ", "Nov 17, 5:00 PM CT");
    expect(started.connections).toEqual([{ connectorId: "slack", account: "north-lab", interfaceId: "app-slack" }]);
    expect(started.interfaces.at(-1)?.endpoint).toBe("https://hooks.slack.com/services/north-lab");
    expect(started.interfaces.filter(isInterfaceChannel).map((item) => item.id)).toEqual(CONNECT_INTERFACES.filter(isInterfaceChannel).map((item) => item.id));
    expect(started.interfaces.filter(isInterfaceChannel).some((item) => item.kind === "Instrument gateway" || item.id.startsWith("app-"))).toBe(false);
    expect(started.messages[0]?.status).toBe("delivered");
    expect(started.messages[0]?.steps[0]?.label).toBe("API connection started");
    expect(withAppConnection(started, slack!, "other", "Nov 17, 5:01 PM CT").connections).toHaveLength(1);
    expect(withAppConnection(initialConnectState(), slack!, "   ", "Nov 17, 5:02 PM CT").connections).toHaveLength(0);
  });

  it("starts one instrument integration for a lab", () => {
    const alinity = catalogInstrument("alinity-c");
    const seeded = initialConnectState();
    expect(seeded.instruments.map((item) => item.catalogId)).toEqual(["cobas-8000", "xn-1000", "bact-alert", "hplc-1260"]);
    const started = withInstrumentIntegration(seeded, alinity!, "East Lab", "lab-east", "Nov 17, 5:10 PM CT");
    expect(started.instruments.at(-1)).toMatchObject({ catalogId: "alinity-c", site: "East Lab", labId: "lab-east", interfaceId: "gw-alinity-c" });
    expect(started.interfaces.some((item) => item.id === "gw-alinity-c")).toBe(true);
    expect(started.messages[0]?.steps[0]?.label).toBe("Integration started");
    expect(withInstrumentIntegration(started, alinity!, "East Lab", "lab-east", "Nov 17, 5:11 PM CT").instruments.filter((item) => item.catalogId === "alinity-c")).toHaveLength(1);
    expect(withInstrumentIntegration(seeded, alinity!, "   ", "lab-east", "Nov 17, 5:12 PM CT").instruments).toHaveLength(seeded.instruments.length);
  });

  it("builds an HL7 EHR channel and rejects a missing MLLP host", () => {
    const setup = emptyChannelSetup();
    expect(channelFromSetup(setup).ok).toBe(false);
    const ready = channelFromSetup({
      ...setup,
      name: "North orders",
      ehrSystem: "North Hospital Epic",
      host: "10.4.1.20",
      port: "2576",
      sendingApp: "EPIC",
      sendingFacility: "NORTH",
    });
    expect(ready.ok).toBe(true);
    if (ready.ok) {
      expect(ready.input).toMatchObject({ fromSystem: "North Hospital Epic", toSystem: "Sequence", endpoint: "MLLP 10.4.1.20:2576", interaction: "Unidirectional (One-Way Push)" });
      expect(ready.input.note).toContain("Orders");
      expect(ready.input.note).toContain("MSH-3 EPIC");
    }
    expect(suggestInteraction("Webhook", "out-of-sequence")).toBe("Publish-Subscribe (Event-Driven / Webhook)");
    expect(suggestInteraction("FHIR R4", "into-sequence")).toBe("Synchronous Request-Response (Real-Time Query)");
  });

  it("records a configured channel and reads message days", () => {
    const epic = INITIAL_MESSAGES.find((message) => message.id === "MSG-24022");
    expect(messageOn(epic!)).toBe("2026-11-17");
    expect(messageIsSuccess(epic!)).toBe(false);
    const delivered = INITIAL_MESSAGES.find((message) => message.id === "MSG-24019");
    expect(messageIsSuccess(delivered!)).toBe(true);
    const next = withConfiguredChannel(initialConnectState(), {
      name: "West campus ADT",
      fromSystem: "West Hospital",
      toSystem: "Sequence",
      kind: "HL7 v2",
      interaction: "Unidirectional (One-Way Push)",
      endpoint: "MLLP 10.8.1.4:2575",
      note: "ADT from the west campus.",
    });
    expect(next.interfaces.at(-1)).toMatchObject({ id: "ch-west-campus-adt", interaction: "Unidirectional (One-Way Push)", fromSystem: "West Hospital" });
    expect(next.interfaces.filter(isInterfaceChannel).some((item) => item.id === "ch-west-campus-adt")).toBe(true);
  });

  it("searches the audit by error text and payload", () => {
    const channel = interfaceById(CONNECT_INTERFACES, "north-orm");
    const hit = INITIAL_MESSAGES.filter((message) => matchesQuery(message, channel?.name ?? "", "V-104428"));
    expect(hit.map((message) => message.id)).toContain("MSG-24018");
    expect(INITIAL_MESSAGES.filter((message) => matchesQuery(message, "", "invalid_token")).map((message) => message.id)).toEqual(["MSG-24031"]);
  });
});
