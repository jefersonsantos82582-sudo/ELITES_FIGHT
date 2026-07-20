import ExcelJS from "exceljs";

/**
 * Column definition that drives spreadsheet generation.
 * Matches the JSON structure stored in the `templates.columns` database field.
 */
export interface ColumnDef {
  name: string;
  type: "text" | "number" | "currency" | "date" | "time" | "formula";
  width?: number;
  format?: string;
  formula?: string;
}

export interface GenerateOptions {
  templateName: string;
  customName: string;
  columns: ColumnDef[];
  sampleRows?: unknown[][];
  headerColor?: string;
  accentColor?: string;
  hasWatermark?: boolean;
  extraInfo?: string;
}

/**
 * Convert a hex color (#RRGGBB) to an ARGB hex string that ExcelJS expects.
 */
function hexToARGB(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length === 6) return `FF${clean}`;
  if (clean.length === 8) return clean;
  return "FFD4AF37";
}

/**
 * Generate a professional .xlsx spreadsheet from a template definition.
 * Returns a Buffer ready for storage upload.
 */
export async function generateSpreadsheet(opts: GenerateOptions): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ELITES_FIGHT";
  wb.created = new Date();

  const sheetName = opts.customName.substring(0, 31) || "Planilha";
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 2 }],
    properties: { tabColor: { argb: hexToARGB(opts.headerColor || "#D4AF37") } },
  });

  const headerARGB = hexToARGB(opts.headerColor || "#D4AF37");
  const accentARGB = hexToARGB(opts.accentColor || "#1A1A1A");
  const cols = opts.columns;

  // --- Title row (row 1) ---
  ws.mergeCells(1, 1, 1, cols.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = opts.customName.toUpperCase();
  titleCell.font = { name: "Sora", size: 16, bold: true, color: { argb: "FF111827" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: headerARGB },
  };
  ws.getRow(1).height = 36;

  // --- Header row (row 2) ---
  cols.forEach((col, idx) => {
    const cell = ws.getCell(2, idx + 1);
    cell.value = col.name;
    cell.font = { name: "Inter", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: accentARGB },
    };
    cell.border = {
      top: { style: "thin", color: { argb: headerARGB } },
      bottom: { style: "medium", color: { argb: headerARGB } },
      left: { style: "thin", color: { argb: "FF333333" } },
      right: { style: "thin", color: { argb: "FF333333" } },
    };
  });
  ws.getRow(2).height = 28;

  // Set column widths
  cols.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width || 18;
  });

  // --- Data rows (starting row 3) ---
  const sampleRows = opts.sampleRows || [];
  const dataStartRow = 3;
  const totalDataRows = Math.max(sampleRows.length, 20); // minimum 20 empty rows

  for (let r = 0; r < totalDataRows; r++) {
    const rowIdx = dataStartRow + r;
    const row = ws.getRow(rowIdx);
    const sample = sampleRows[r];

    cols.forEach((col, cIdx) => {
      const cell = ws.getCell(rowIdx, cIdx + 1);
      const colLetter = ws.getColumn(cIdx + 1).letter || String.fromCharCode(65 + cIdx);

      // Alternating row fill for readability
      if (r % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      cell.border = {
        top: { style: "hair", color: { argb: "FFCCCCCC" } },
        bottom: { style: "hair", color: { argb: "FFCCCCCC" } },
        left: { style: "hair", color: { argb: "FFCCCCCC" } },
        right: { style: "hair", color: { argb: "FFCCCCCC" } },
      };

      cell.font = { name: "Inter", size: 10, color: { argb: "FF111827" } };

      if (col.type === "formula" && col.formula) {
        const formula = col.formula.replace(/\{row\}/g, String(rowIdx));
        cell.value = { formula };
      } else if (sample && sample[cIdx] !== undefined && sample[cIdx] !== "") {
        const val = sample[cIdx];
        if (col.type === "number" || col.type === "currency") {
          cell.value = parseFloat(String(val)) || 0;
        } else if (col.type === "date") {
          cell.value = new Date(String(val));
        } else {
          cell.value = String(val);
        }
      }

      // Apply number formats
      if (col.format) {
        if (col.type === "currency") {
          cell.numFmt = 'R$ #,##0.00';
        } else if (col.type === "date") {
          cell.numFmt = 'dd/mm/yyyy';
        } else if (col.type === "time") {
          cell.numFmt = 'hh:mm';
        } else if (col.type === "number") {
          cell.numFmt = col.format;
        } else if (col.type === "formula") {
          cell.numFmt = col.format;
        }
      }

      // Alignment per type
      if (col.type === "currency" || col.type === "number" || col.type === "formula") {
        cell.alignment = { horizontal: "right" };
      } else if (col.type === "date" || col.type === "time") {
        cell.alignment = { horizontal: "center" };
      } else {
        cell.alignment = { horizontal: "left" };
      }
    });

    row.height = 22;
  }

  // --- Summary row (after data) ---
  const summaryRow = dataStartRow + totalDataRows;
  cols.forEach((col, cIdx) => {
    const cell = ws.getCell(summaryRow, cIdx + 1);
    cell.font = { name: "Inter", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: accentARGB },
    };
    cell.border = {
      top: { style: "medium", color: { argb: headerARGB } },
      bottom: { style: "thin", color: { argb: headerARGB } },
    };

    if (col.type === "currency" || col.type === "number") {
      const colLetter = String.fromCharCode(65 + cIdx);
      cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${summaryRow - 1})` };
      cell.numFmt = col.type === "currency" ? 'R$ #,##0.00' : (col.format || '#,##0');
      cell.alignment = { horizontal: "right" };
    } else if (cIdx === 0) {
      cell.value = "TOTAL";
      cell.alignment = { horizontal: "left" };
    }
  });
  ws.getRow(summaryRow).height = 26;

  // --- Extra information, watermark and footer ---
  // Allocate each optional block from a cursor so that their merged ranges
  // never overlap when both are present.
  let footerRow = summaryRow + 2;

  if (opts.extraInfo) {
    const infoRow = footerRow;
    ws.mergeCells(infoRow, 1, infoRow, cols.length);
    const infoCell = ws.getCell(infoRow, 1);
    infoCell.value = opts.extraInfo;
    infoCell.font = { name: "Inter", size: 9, italic: true, color: { argb: "FF666666" } };
    infoCell.alignment = { horizontal: "left" };
    footerRow += 2;
  }

  if (opts.hasWatermark) {
    const wmRow = footerRow;
    ws.mergeCells(wmRow, 1, wmRow, cols.length);
    const wmCell = ws.getCell(wmRow, 1);
    wmCell.value = "Gerado por ELITES_FIGHT — Faça upgrade para remover a marca d'água";
    wmCell.font = { name: "Inter", size: 8, italic: true, color: { argb: "FFD4AF37" } };
    wmCell.alignment = { horizontal: "center" };
    footerRow += 2;
  }

  // --- Footer credit ---
  ws.mergeCells(footerRow, 1, footerRow, cols.length);
  const footerCell = ws.getCell(footerRow, 1);
  footerCell.value = `ELITES_FIGHT | ${new Date().toLocaleDateString('pt-BR')} | ${opts.templateName}`;
  footerCell.font = { name: "Inter", size: 8, color: { argb: "FF999999" } };
  footerCell.alignment = { horizontal: "center" };

  // Auto-filter on header row
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: summaryRow - 1, column: cols.length },
  };

  // Print settings
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
