import type { SpreadsheetSheet } from "./spreadsheet";

export function renderSheet(root: HTMLElement, sheet: SpreadsheetSheet) {
  root.replaceChildren();
  const viewport = document.createElement("div");
  viewport.className = "sheet-viewport";
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", sheet.name);
  const table = document.createElement("table");
  table.setAttribute("aria-label", sheet.name);
  table.setAttribute("aria-rowcount", String(sheet.rows.length));
  viewport.append(table);
  root.append(viewport);
  const paint = () => {
    const start = Math.max(0, Math.floor(viewport.scrollTop / 32) - 5);
    const end = Math.min(sheet.rows.length, start + 50);
    table.replaceChildren();
    const spacer = (height: number) => {
      if (!height) return;
      const row = table.insertRow();
      row.setAttribute("aria-hidden", "true");
      row.style.height = height + "px";
      row.insertCell().colSpan = 257;
    };
    spacer(start * 32);
    for (let index = start; index < end; index++) {
      const row = table.insertRow();
      row.setAttribute("aria-rowindex", String(index + 1));
      const number = document.createElement("th");
      number.scope = "row";
      number.textContent = String(index + 1);
      row.append(number);
      for (const value of sheet.rows[index])
        row.insertCell().textContent = value;
    }
    spacer((sheet.rows.length - end) * 32);
  };
  viewport.addEventListener("scroll", paint);
  paint();
}
