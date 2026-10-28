export type CorePlan = {
  id: string;
  plan: string;
  volume: string;
  priceLabel: string;
  /** Ongoing annual price. Null when the plan is quoted. */
  annual: number | null;
  /** Annual price in the first year. Null when the plan is quoted. */
  firstYearAnnual: number | null;
};

export type ModuleOffer = {
  slug: string;
  title: string;
  priceLabel: string;
  monthly: number;
  included: boolean;
};

export type ImplementationOffer = {
  id: string;
  name: string;
  priceLabel: string;
  once: number;
};

export type SupportOffer = {
  id: string;
  name: string;
  priceLabel: string;
  /** Percent of the ongoing annual core price. */
  percent: number;
  detail: string;
};

export const CORE_PLANS: readonly CorePlan[] = [
  { id: "starter", plan: "Starter", volume: "Under 10K", priceLabel: "1st year free, then $15K / year", annual: 15_000, firstYearAnnual: 0 },
  { id: "essential", plan: "Essential", volume: "10K–25K", priceLabel: "$50K / year", annual: 50_000, firstYearAnnual: 50_000 },
  { id: "professional", plan: "Professional", volume: "25K–50K", priceLabel: "$100K / year", annual: 100_000, firstYearAnnual: 100_000 },
  { id: "growth", plan: "Growth", volume: "50K–100K", priceLabel: "$200K / year", annual: 200_000, firstYearAnnual: 200_000 },
  { id: "scale", plan: "Scale", volume: "100K–250K", priceLabel: "$400K / year", annual: 400_000, firstYearAnnual: 400_000 },
  { id: "advanced", plan: "Advanced", volume: "250K–500K", priceLabel: "$800K / year", annual: 800_000, firstYearAnnual: 800_000 },
  { id: "premier", plan: "Premier", volume: "500K–1M", priceLabel: "$1.6M / year", annual: 1_600_000, firstYearAnnual: 1_600_000 },
  { id: "enterprise", plan: "Enterprise", volume: "1M+", priceLabel: "Custom", annual: null, firstYearAnnual: null },
];

export const MODULE_OFFERS: readonly ModuleOffer[] = [
  { slug: "operations", title: "Sequence Operations", priceLabel: "Included", monthly: 0, included: true },
  { slug: "instruments", title: "Sequence Instruments", priceLabel: "+$1,500/mo", monthly: 1_500, included: false },
  { slug: "compliance", title: "Sequence Compliance", priceLabel: "+$1,500/mo", monthly: 1_500, included: false },
  { slug: "client", title: "Sequence Client", priceLabel: "+$1,000/mo", monthly: 1_000, included: false },
  { slug: "revenue", title: "Sequence Revenue", priceLabel: "+$2,500/mo", monthly: 2_500, included: false },
  { slug: "insights", title: "Sequence Insights", priceLabel: "+$1,000/mo", monthly: 1_000, included: false },
];

export const IMPLEMENTATION: readonly ImplementationOffer[] = [
  { id: "database", name: "Database Transfer", priceLabel: "+$8,000", once: 8_000 },
  { id: "installation", name: "Core System Installation", priceLabel: "+$5,000", once: 5_000 },
  { id: "validation", name: "Validation Deliverables", priceLabel: "+$8,000", once: 8_000 },
];

export const SUPPORT: readonly SupportOffer[] = [
  {
    id: "standard",
    name: "Standard",
    priceLabel: "Included",
    percent: 0,
    detail: "Monday to Friday, business hours, by email. A reply within one business day for the modules you subscribe to.",
  },
  {
    id: "priority",
    name: "Priority",
    priceLabel: "15% of the annual plan",
    percent: 15,
    detail: "Phone and email during business hours. Critical issues are answered within 4 hours.",
  },
  {
    id: "premium",
    name: "Premium",
    priceLabel: "22% of the annual plan",
    percent: 22,
    detail: "Critical issues are covered 24×7, with a reply within 1 hour, a named contact, and a quarterly review.",
  },
];

export type PlanSelection = {
  coreId: string;
  modules: readonly string[];
  implementation: readonly string[];
  supportId: string;
};

export type MoneyLine = {
  label: string;
  value: string;
};

export type PlanQuote = {
  custom: boolean;
  core: CorePlan;
  modules: ModuleOffer[];
  implementation: ImplementationOffer[];
  support: SupportOffer;
  modulesAnnual: number;
  supportAnnual: number | null;
  oneTime: number;
  yearOne: number | null;
  ongoing: number | null;
  lines: {
    core: MoneyLine;
    modules: MoneyLine[];
    support: MoneyLine;
    implementation: MoneyLine[];
    totals: MoneyLine[];
  };
};

export function modulePriceLabel(slug: string): string {
  return MODULE_OFFERS.find((offer) => offer.slug === slug)?.priceLabel ?? "";
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function isPricingEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function supportAmount(annual: number, percent: number): number {
  return Math.round((annual * percent) / 100);
}

export function quotePlan(selection: PlanSelection): PlanQuote {
  const core = CORE_PLANS.find((plan) => plan.id === selection.coreId) ?? CORE_PLANS[0];
  const chosen = new Set(selection.modules);
  chosen.add("operations");
  const modules = MODULE_OFFERS.filter((offer) => chosen.has(offer.slug));
  const implementation = IMPLEMENTATION.filter((item) => selection.implementation.includes(item.id));
  const support = SUPPORT.find((tier) => tier.id === selection.supportId) ?? SUPPORT[0];
  const custom = core.annual == null || core.firstYearAnnual == null;
  const modulesAnnual = modules.reduce((sum, offer) => sum + offer.monthly, 0) * 12;
  const oneTime = implementation.reduce((sum, item) => sum + item.once, 0);
  const supportAnnual = custom || core.annual == null ? null : supportAmount(core.annual, support.percent);
  const yearOne = custom || supportAnnual == null || core.firstYearAnnual == null ? null : core.firstYearAnnual + supportAnnual + modulesAnnual;
  const ongoing = custom || supportAnnual == null || core.annual == null ? null : core.annual + supportAnnual + modulesAnnual;

  const coreValue = custom
    ? "Custom"
    : core.firstYearAnnual === 0 && core.annual != null
      ? `Year 1 free, then ${formatMoney(core.annual)} / year`
      : `${formatMoney(core.annual ?? 0)} / year`;
  const supportValue = custom
    ? "Included in the custom quote"
    : support.percent === 0
      ? "Included"
      : `${formatMoney(supportAnnual ?? 0)} / year`;

  const totals: MoneyLine[] = [];
  if (custom || yearOne == null || ongoing == null) {
    totals.push({ label: "Subscription", value: "Custom" });
  } else if (yearOne !== ongoing) {
    totals.push({ label: "First year", value: formatMoney(yearOne) });
    totals.push({ label: "After the first year", value: `${formatMoney(ongoing)} / year` });
  } else {
    totals.push({ label: "Annual subscription", value: `${formatMoney(yearOne)} / year` });
  }
  totals.push({ label: "One time", value: formatMoney(oneTime) });

  return {
    custom,
    core,
    modules,
    implementation,
    support,
    modulesAnnual,
    supportAnnual,
    oneTime,
    yearOne,
    ongoing,
    lines: {
      core: { label: `${core.plan}, ${core.volume} samples`, value: coreValue },
      modules: modules.map((offer) => ({
        label: offer.title,
        value: offer.monthly === 0 ? "Included" : `${formatMoney(offer.monthly)} / month`,
      })),
      support: { label: support.name, value: supportValue },
      implementation: implementation.map((item) => ({ label: item.name, value: formatMoney(item.once) })),
      totals,
    },
  };
}

const HELVETICA: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191, "(": 333, ")": 333,
  "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278, "0": 556, "1": 556, "2": 556, "3": 556,
  "4": 556, "5": 556, "6": 556, "7": 556, "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584,
  ">": 584, "?": 556, "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 611, F: 556, G: 778, H: 722, I: 278,
  J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667,
  W: 944, X: 667, Y: 667, Z: 611, "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333, a: 556, b: 556,
  c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556,
  p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
};

export function pdfSafe(text: string): string {
  return text
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("×", "x")
    .replace(/[^\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function textWidth(text: string, size: number, bold: boolean): number {
  const units = [...pdfSafe(text).replaceAll("\\(", "(").replaceAll("\\)", ")").replaceAll("\\\\", "\\")].reduce(
    (sum, char) => sum + (HELVETICA[char] ?? 500),
    0,
  );
  return (units / 1000) * size * (bold ? 1.04 : 1);
}

export function buildPricingPdf(quote: PlanQuote, email: string, dateLabel: string): Uint8Array {
  const left = 48;
  const right = 564;
  const commands: string[] = [];
  const ink = (rgb: string) => commands.push(`${rgb} rg`);
  const textAt = (text: string, x: number, y: number, size: number, bold = false) => {
    commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfSafe(text)}) Tj ET`);
  };
  const pair = (label: string, value: string, y: number, size: number, bold = false) => {
    textAt(label, left, y, size, bold);
    textAt(value, right - textWidth(value, size, bold), y, size, bold);
  };

  commands.push("0.043 0.122 0.267 rg");
  commands.push("0 742 612 50 re f");
  ink("1 1 1");
  textAt("Sequence pricing", left, 764, 18, true);
  textAt("One page, from the prices on the pricing page", left, 750, 9);

  let y = 718;
  ink("0.086 0.094 0.114");
  textAt(`Prepared for ${email.trim()}`, left, y, 11, true);
  y -= 16;
  ink("0.361 0.396 0.439");
  textAt(dateLabel, left, y, 9);
  y -= 24;

  ink("0.086 0.094 0.114");
  textAt("Your plan", left, y, 12, true);
  y -= 18;
  pair(quote.lines.core.label, quote.lines.core.value, y, 10, true);
  y -= 16;
  ink("0.361 0.396 0.439");
  textAt("Modules", left, y, 8, true);
  y -= 13;
  ink("0.086 0.094 0.114");
  for (const line of quote.lines.modules) {
    pair(line.label, line.value, y, 10);
    y -= 14;
  }
  pair(`Support, ${quote.lines.support.label}`, quote.lines.support.value, y, 10);
  y -= 14;
  if (quote.lines.implementation.length === 0) {
    pair("Implementation", "None", y, 10);
    y -= 14;
  } else {
    for (const line of quote.lines.implementation) {
      pair(line.label, line.value, y, 10);
      y -= 14;
    }
  }

  y -= 6;
  commands.push("0.965 0.961 0.957 rg");
  commands.push(`36 ${y - 8 - quote.lines.totals.length * 16} 540 ${quote.lines.totals.length * 16 + 16} re f`);
  ink("0.043 0.122 0.267");
  for (const line of quote.lines.totals) {
    pair(line.label, line.value, y, 11, true);
    y -= 16;
  }

  y -= 16;
  ink("0.086 0.094 0.114");
  textAt("Prices on this page", left, y, 12, true);
  y -= 16;
  ink("0.361 0.396 0.439");
  textAt("Core product, annual samples", left, y, 8, true);
  y -= 13;
  ink("0.086 0.094 0.114");
  for (const plan of CORE_PLANS) {
    pair(`${plan.plan}  ${plan.volume}`, plan.priceLabel, y, 9);
    y -= 12;
  }
  y -= 6;
  ink("0.361 0.396 0.439");
  textAt("Modules", left, y, 8, true);
  y -= 13;
  ink("0.086 0.094 0.114");
  for (const offer of MODULE_OFFERS) {
    pair(offer.title, offer.priceLabel, y, 9);
    y -= 12;
  }
  y -= 6;
  ink("0.361 0.396 0.439");
  textAt("First-time implementation, one time", left, y, 8, true);
  y -= 13;
  ink("0.086 0.094 0.114");
  for (const item of IMPLEMENTATION) {
    pair(item.name, item.priceLabel, y, 9);
    y -= 12;
  }
  y -= 6;
  ink("0.361 0.396 0.439");
  textAt("Support", left, y, 8, true);
  y -= 13;
  ink("0.086 0.094 0.114");
  for (const tier of SUPPORT) {
    pair(tier.name, tier.priceLabel, y, 9);
    y -= 12;
  }
  y -= 8;
  ink("0.361 0.396 0.439");
  textAt("On a $100,000 plan, Priority is $15,000 a year and Premium is $22,000 a year.", left, y, 8);
  y -= 12;
  textAt("Enterprise pricing and support are quoted. Carescope.", left, y, 8);

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

export function downloadPricingPdf(bytes: Uint8Array, filename = "sequence-pricing.pdf"): void {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const url = URL.createObjectURL(new Blob([copy], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
