export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function openHtmlReport(html) {
  const reportWindow = window.open("", "_blank", "width=1200,height=800");
  if (!reportWindow) {
    throw new Error("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para este sitio.");
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
  reportWindow.focus();
}

export function buildBasicPrintHtml({ title, subtitle = "", summaryHtml = "", tableHtml = "" }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .muted { color: #6b7280; margin-bottom: 16px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
    .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px; }
    .card small { color: #6b7280; display: block; }
    .card strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d1d5db; padding: 7px; vertical-align: top; text-align: left; }
    th { background: #f3f4f6; }
    a { color: #0f5b85; font-weight: 700; }
    @media print {
      body { margin: 10mm; }
      .no-print { display: none; }
      a { color: #0f5b85; text-decoration: underline; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:10px 14px;border:0;border-radius:8px;background:#0f5b85;color:white;font-weight:bold;cursor:pointer;">Imprimir / Guardar PDF</button>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<div class="muted">${escapeHtml(subtitle)}</div>` : ""}
  ${summaryHtml}
  ${tableHtml}
</body>
</html>`;
}
