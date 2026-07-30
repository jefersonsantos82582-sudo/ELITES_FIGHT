import ExcelJS from "exceljs";

/**
 * Column definition that drives spreadsheet generation.
 * Matches the JSON structure stored in the `templates.columns` database field.
 */
export interface ColumnDef {
  name: string;
  type?: "text" | "number" | "currency" | "date" | "time" | "formula";
  width?: number;
  format?: string;
  formula?: string;
}

const VALID_TYPES = new Set(["text", "number", "currency", "date", "time", "formula"]);

// Palavras-chave usadas para inferir o tipo de uma coluna quando o template
// (ou a IA) não define `type` explicitamente. Isso garante que a linha de
// TOTAL some automaticamente valores monetários/numéricos mesmo em planilhas
// antigas ou geradas por IA, que nunca vêm com `type` preenchido.
const CURRENCY_NAME_HINTS =
  /valor|preç|prec|custo|venda|saldo|entrada|sa[ií]da|or[çc]ado|realizado|diferen[çc]a|receita|despesa|total gasto|gasto|estimado|mensalidade|sal[áa]rio|pagamento|pre[çc]o/i;
const NUMBER_NAME_HINTS = /quantidade|estoque|m[ií]nimo|qtd|margem|percentual|score|nota\b/i;
const DATE_NAME_HINTS = /\bdata\b|nascimento|in[íi]cio|prazo|vencimento|entrega|cadastro|compra/i;

/**
 * Resolve o tipo efetivo de uma coluna: usa `col.type` quando válido, senão
 * infere a partir do nome da coluna e, em último caso, da amostra de valores.
 */
function resolveColumnType(col: ColumnDef, sampleValues: unknown[]): NonNullable<ColumnDef["type"]> {
  if (col.type && VALID_TYPES.has(col.type)) return col.type;

  const name = col.name || "";
  if (CURRENCY_NAME_HINTS.test(name)) return "currency";
  if (NUMBER_NAME_HINTS.test(name)) return "number";
  if (DATE_NAME_HINTS.test(name)) return "date";

  const nonEmpty = sampleValues.filter((v) => v !== undefined && v !== null && v !== "");
  if (nonEmpty.length > 0 && nonEmpty.every((v) => v !== "" && !isNaN(parseFloat(String(v).replace(",", "."))))) {
    return "number";
  }

  return "text";
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

const DESCRIPTION_COLUMN_NAME = /^descri[çc][ãa]o$|^description$/i;

/**
 * Remove qualquer coluna de "Descrição" de um conjunto de colunas/linhas de
 * amostra. Usado na geração de planilhas normais (não-IA): esse tipo de
 * planilha usa modelos com estrutura fixa e não deve incluir um campo de
 * descrição livre — diferente da geração com IA, que usa a descrição do
 * usuário apenas como entrada para montar a estrutura, não como coluna.
 */
export function stripDescriptionColumn(
  columns: ColumnDef[],
  sampleRows?: unknown[][]
): { columns: ColumnDef[]; sampleRows?: unknown[][] } {
  const dropIndexes = columns
    .map((col, idx) => (DESCRIPTION_COLUMN_NAME.test((col.name || "").trim()) ? idx : -1))
    .filter((idx) => idx !== -1);

  if (dropIndexes.length === 0) {
    return { columns, sampleRows };
  }

  const dropSet = new Set(dropIndexes);
  const filteredColumns = columns.filter((_, idx) => !dropSet.has(idx));
  const filteredSampleRows = sampleRows?.map((row) => row.filter((_, idx) => !dropSet.has(idx)));

  return { columns: filteredColumns, sampleRows: filteredSampleRows };
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

  // Resolve o tipo efetivo de cada coluna uma única vez (usa o tipo salvo,
  // ou infere pelo nome/amostra). É isso que garante que colunas de valor
  // (ex: "Valor", "Preço de Venda", "Total Gasto") sejam somadas automaticamente
  // na linha de TOTAL, mesmo em templates antigos ou planilhas geradas por IA
  // que não têm o campo `type` preenchido.
  const resolvedTypes = cols.map((col, cIdx) =>
    resolveColumnType(col, sampleRows.map((row) => row?.[cIdx]))
  );

  for (let r = 0; r < totalDataRows; r++) {
    const rowIdx = dataStartRow + r;
    const row = ws.getRow(rowIdx);
    const sample = sampleRows[r];

    cols.forEach((col, cIdx) => {
      const cell = ws.getCell(rowIdx, cIdx + 1);
      const colType = resolvedTypes[cIdx];

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

      if (colType === "formula" && col.formula) {
        const formula = col.formula.replace(/\{row\}/g, String(rowIdx));
        cell.value = { formula };
      } else if (sample && sample[cIdx] !== undefined && sample[cIdx] !== "") {
        const val = sample[cIdx];
        if (colType === "number" || colType === "currency") {
          const parsed = parseFloat(String(val).replace(/[^\d,.-]/g, "").replace(",", "."));
          cell.value = isNaN(parsed) ? 0 : parsed;
        } else if (colType === "date") {
          const parsedDate = new Date(String(val));
          cell.value = isNaN(parsedDate.getTime()) ? String(val) : parsedDate;
        } else {
          cell.value = String(val);
        }
      }

      // Apply number formats — aplicado independentemente de `col.format`
      // estar definido, para que colunas de moeda/data sempre fiquem
      // formatadas corretamente mesmo sem configuração manual do admin.
      if (colType === "currency") {
        cell.numFmt = "R$ #,##0.00";
      } else if (colType === "date") {
        cell.numFmt = "dd/mm/yyyy";
      } else if (colType === "time") {
        cell.numFmt = "hh:mm";
      } else if (colType === "number") {
        cell.numFmt = col.format || "#,##0.00";
      } else if (colType === "formula" && col.format) {
        cell.numFmt = col.format;
      }

      // Alignment per type
      if (colType === "currency" || colType === "number" || colType === "formula") {
        cell.alignment = { horizontal: "right" };
      } else if (colType === "date" || colType === "time") {
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
    const colType = resolvedTypes[cIdx];
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

    if (colType === "currency" || colType === "number") {
      const colLetter = String.fromCharCode(65 + cIdx);
      cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${summaryRow - 1})` };
      cell.numFmt = colType === "currency" ? "R$ #,##0.00" : (col.format || "#,##0.00");
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
