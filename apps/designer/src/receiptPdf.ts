import type { SampleRecord } from "./samples";

function pdfText(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** One-page PDF of the paperwork scanned when the sample was received. */
export function receiptPdfDocument(sample: SampleRecord): string {
  const rows: Array<[string, string]> = [
    ["Sample ID", String(sample.sampleId)],
    ["Accession ID", sample.accessionId],
    ["Order ID", sample.orderId],
    ["Received", sample.received],
    ["Client", sample.client],
    ["Matrix", sample.matrix],
    ["Tests", sample.tests],
    ["Priority", sample.priority],
    ["Site", sample.site],
    ["Custody", sample.custody],
  ];
  const draw = [
    "0.96 0.94 0.90 rg",
    "0 0 612 792 re f",
    "0.12 0.16 0.22 rg",
    "BT /F1 20 Tf 54 734 Td (SAMPLE RECEIPT) Tj ET",
    "BT /F2 11 Tf 54 712 Td (Scanned paperwork attached at receipt) Tj ET",
  ];
  let y = 668;
  for (const [label, value] of rows) {
    draw.push(
      "0.72 0.68 0.62 RG",
      "1 w",
      `54 ${y - 10} 504 32 re S`,
      "0.28 0.32 0.38 rg",
      `BT /F2 9 Tf 66 ${y} Td (${pdfText(label)}) Tj ET`,
      "0.08 0.1 0.14 rg",
      `BT /F1 12 Tf 190 ${y - 1} Td (${pdfText(value)}) Tj ET`,
    );
    y -= 46;
  }
  draw.push("0.35 0.38 0.44 rg", "BT /F2 9 Tf 54 72 Td (Scan copy. Filed with the order at sample receipt.) Tj ET");
  const stream = draw.join("\n");

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  function add(object: string) {
    offsets.push(body.length);
    body += object;
  }
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  add(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n",
  );
  add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
  add("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n");
  add("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  const xrefAt = body.length;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += xref;
  body += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return body;
}

export function receiptPdfUrl(sample: SampleRecord): string {
  const blob = new Blob([receiptPdfDocument(sample)], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}
