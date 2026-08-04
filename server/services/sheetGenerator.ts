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

/** Converte um índice de coluna (0-based) na letra usada em fórmulas (A, B, ... AA). */
function columnLetter(index: number): string {
  let n = index + 1;
  let letter = "";
  while (n > 0) {
    const rest = (n - 1) % 26;
    letter = String.fromCharCode(65 + rest) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

const EXAMPLE_TEXT_BY_HINT: { pattern: RegExp; values: string[] }[] = [
  { pattern: /produto|item|mercadoria|bebida/i, values: ["Produto A", "Produto B", "Produto C", "Produto D", "Produto E", "Produto F", "Produto G", "Produto H"] },
  { pattern: /cliente|nome|respons[áa]vel|funcion[áa]rio|aluno|paciente/i, values: ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Alves", "Eduarda Rocha", "Felipe Costa", "Gabriela Mota", "Henrique Sá"] },
  { pattern: /categoria|tipo|setor|grupo|departamento/i, values: ["Categoria 1", "Categoria 2", "Categoria 1", "Categoria 3", "Categoria 2", "Categoria 1", "Categoria 3", "Categoria 2"] },
  { pattern: /status|situa[çc][ãa]o/i, values: ["Pago", "Pendente", "Pago", "Atrasado", "Pago", "Pendente", "Pago", "Pago"] },
  { pattern: /forma de pagamento|pagamento|m[ée]todo/i, values: ["PIX", "Cartão", "Dinheiro", "PIX", "Boleto", "Cartão", "PIX", "Cartão"] },
  { pattern: /observa[çc][ãa]o|coment[áa]rio|nota/i, values: ["-", "Revisar", "-", "Conferido", "-", "Revisar", "-", "-"] },
  { pattern: /e-?mail/i, values: ["ana@email.com", "bruno@email.com", "carla@email.com", "diego@email.com", "eduarda@email.com", "felipe@email.com", "gabriela@email.com", "henrique@email.com"] },
  { pattern: /telefone|celular|whats/i, values: ["(11) 90000-0001", "(11) 90000-0002", "(11) 90000-0003", "(11) 90000-0004", "(11) 90000-0005", "(11) 90000-0006", "(11) 90000-0007", "(11) 90000-0008"] },
];

const EXAMPLE_ROW_COUNT = 8;

/**
 * Monta linhas de exemplo plausíveis quando o modelo não traz nenhuma amostra.
 *
 * Antes, templates sem `sampleRows` geravam planilhas praticamente vazias — só
 * cabeçalho e linhas em branco. Agora toda planilha sai com dados de exemplo
 * coerentes com o tipo e o nome de cada coluna, prontos para o usuário
 * substituir pelos dados reais.
 */
function buildExampleRows(
  cols: ColumnDef[],
  types: NonNullable<ColumnDef["type"]>[]
): unknown[][] {
  const today = new Date();
  const rows: unknown[][] = [];

  for (let r = 0; r < EXAMPLE_ROW_COUNT; r++) {
    const row: unknown[] = cols.map((col, cIdx) => {
      const type = types[cIdx];
      const name = col.name || "";

      if (type === "formula") return "";
      if (type === "date") {
        const d = new Date(today);
        d.setDate(today.getDate() - (EXAMPLE_ROW_COUNT - 1 - r) * 3);
        return d;
      }
      if (type === "time") {
        return `${String(8 + r).padStart(2, "0")}:00`;
      }
      if (type === "currency") {
        return Math.round((150 + r * 87.35) * 100) / 100;
      }
      if (type === "number") {
        if (/percentual|margem|%/i.test(name)) return 10 + r * 2;
        return 5 + r * 3;
      }

      const hint = EXAMPLE_TEXT_BY_HINT.find((h) => h.pattern.test(name));
      if (hint) return hint.values[r % hint.values.length];
      return `Exemplo ${r + 1}`;
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Cria a aba "Resumo": um painel de estatísticas com fórmulas ligadas à aba de
 * dados (total, média, maior, menor e contagem por coluna numérica) e um
 * gráfico de barras proporcional feito com REPT, que funciona em qualquer
 * versão do Excel, Google Sheets e LibreOffice.
 */
function addSummarySheet(
  wb: ExcelJS.Workbook,
  opts: GenerateOptions,
  dataSheetName: string,
  cols: ColumnDef[],
  types: NonNullable<ColumnDef["type"]>[],
  dataStartRow: number,
  dataEndRow: number,
  headerARGB: string,
  accentARGB: string
): void {
  const numericIdx = cols
    .map((_, idx) => idx)
    .filter((idx) => types[idx] === "currency" || types[idx] === "number");
  const labelIdx = cols.findIndex((_, idx) => types[idx] === "text");

  const ws = wb.addWorksheet("Resumo", {
    properties: { tabColor: { argb: headerARGB } },
  });
  ws.getColumn(1).width = 34;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 22;

  // Cabeçalho do painel
  ws.mergeCells(1, 1, 1, 6);
  const title = ws.getCell(1, 1);
  title.value = `${opts.customName.toUpperCase()} — RESUMO`;
  title.font = { name: "Sora", size: 16, bold: true, color: { argb: "FF111827" } };
  title.alignment = { vertical: "middle", horizontal: "center" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerARGB } };
  ws.getRow(1).height = 34;

  ws.mergeCells(2, 1, 2, 6);
  const subtitle = ws.getCell(2, 1);
  subtitle.value = `${opts.templateName} • atualizado automaticamente a partir da aba "${dataSheetName}"`;
  subtitle.font = { name: "Inter", size: 10, italic: true, color: { argb: "FF666666" } };
  subtitle.alignment = { horizontal: "center" };
  ws.getRow(2).height = 20;

  const quoted = `'${dataSheetName.replace(/'/g, "''")}'`;
  const range = (letter: string) => `${quoted}!${letter}${dataStartRow}:${letter}${dataEndRow}`;

  // Tabela de estatísticas
  const statHeaderRow = 4;
  const statHeaders = ["Indicador", "Total", "Média", "Maior", "Menor", "Registros"];
  statHeaders.forEach((label, idx) => {
    const cell = ws.getCell(statHeaderRow, idx + 1);
    cell.value = label;
    cell.font = { name: "Inter", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accentARGB } };
  });
  ws.getRow(statHeaderRow).height = 24;

  let row = statHeaderRow + 1;
  if (numericIdx.length === 0) {
    ws.mergeCells(row, 1, row, 6);
    const cell = ws.getCell(row, 1);
    cell.value = "Este modelo não possui colunas numéricas para resumir.";
    cell.font = { name: "Inter", size: 10, italic: true, color: { argb: "FF666666" } };
    row += 2;
  } else {
    numericIdx.forEach((cIdx, i) => {
      const letter = columnLetter(cIdx);
      const isCurrency = types[cIdx] === "currency";
      const numFmt = isCurrency ? "R$ #,##0.00" : (cols[cIdx].format || "#,##0.00");

      const nameCell = ws.getCell(row, 1);
      nameCell.value = cols[cIdx].name;
      nameCell.font = { name: "Inter", size: 10, bold: true, color: { argb: "FF111827" } };

      const formulas = [
        `SUM(${range(letter)})`,
        `IFERROR(AVERAGE(${range(letter)}),0)`,
        `IFERROR(MAX(${range(letter)}),0)`,
        `IFERROR(MIN(${range(letter)}),0)`,
        `COUNT(${range(letter)})`,
      ];
      formulas.forEach((formula, k) => {
        const cell = ws.getCell(row, k + 2);
        cell.value = { formula };
        cell.numFmt = k === 4 ? "#,##0" : numFmt;
        cell.font = { name: "Inter", size: 10, color: { argb: "FF111827" } };
        cell.alignment = { horizontal: "right" };
      });

      if (i % 2 === 1) {
        for (let c = 1; c <= 6; c++) {
          ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      }
      row += 1;
    });
    row += 1;
  }

  // Gráfico de barras proporcional (REPT) sobre a primeira coluna numérica
  if (numericIdx.length > 0 && labelIdx >= 0) {
    const valueLetter = columnLetter(numericIdx[0]);
    const labelLetter = columnLetter(labelIdx);
    const isCurrency = types[numericIdx[0]] === "currency";

    ws.mergeCells(row, 1, row, 6);
    const chartTitle = ws.getCell(row, 1);
    chartTitle.value = `GRÁFICO — ${cols[numericIdx[0]].name} por ${cols[labelIdx].name}`;
    chartTitle.font = { name: "Sora", size: 12, bold: true, color: { argb: "FF111827" } };
    chartTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerARGB } };
    chartTitle.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(row).height = 24;
    row += 1;

    const chartStart = row;
    const maxRows = Math.min(dataEndRow - dataStartRow + 1, 15);
    for (let i = 0; i < maxRows; i++) {
      const srcRow = dataStartRow + i;
      const labelCell = ws.getCell(row, 1);
      labelCell.value = { formula: `IF(${quoted}!${labelLetter}${srcRow}="","",${quoted}!${labelLetter}${srcRow})` };
      labelCell.font = { name: "Inter", size: 10, color: { argb: "FF111827" } };

      const valueCell = ws.getCell(row, 2);
      valueCell.value = { formula: `IF(${quoted}!${valueLetter}${srcRow}="","",${quoted}!${valueLetter}${srcRow})` };
      valueCell.numFmt = isCurrency ? "R$ #,##0.00" : "#,##0.00";
      valueCell.font = { name: "Inter", size: 10, color: { argb: "FF111827" } };
      valueCell.alignment = { horizontal: "right" };

      ws.mergeCells(row, 3, row, 6);
      const barCell = ws.getCell(row, 3);
      barCell.value = {
        formula: `IFERROR(REPT("█",ROUND(IF(MAX(${range(valueLetter)})=0,0,${quoted}!${valueLetter}${srcRow}/MAX(${range(valueLetter)}))*30,0)),"")`,
      };
      barCell.font = { name: "Inter", size: 10, color: { argb: headerARGB } };
      barCell.alignment = { horizontal: "left" };
      row += 1;
    }

    // Barras de dados nativas do Excel reforçam a leitura visual.
    ws.addConditionalFormatting({
      ref: `B${chartStart}:B${row - 1}`,
      rules: [
        {
          type: "dataBar",
          priority: 1,
          minLength: 0,
          maxLength: 100,
          color: { argb: headerARGB },
          gradient: true,
          showValue: true,
          border: false,
          negativeBarColorSameAsPositive: false,
          negativeBarBorderColorSameAsPositive: false,
          axisPosition: "auto",
          direction: "leftToRight",
          cfvo: [{ type: "min" }, { type: "max" }],
        } as unknown as Parameters<typeof ws.addConditionalFormatting>[0]["rules"][number],
      ],
    });
    row += 1;
  }

  // Instruções de uso
  ws.mergeCells(row, 1, row, 6);
  const howTo = ws.getCell(row, 1);
  howTo.value = "Como usar: preencha a aba de dados. Este resumo e todos os totais são recalculados automaticamente.";
  howTo.font = { name: "Inter", size: 9, italic: true, color: { argb: "FF666666" } };
  howTo.alignment = { horizontal: "left" };

  ws.pageSetup.orientation = "portrait";
  ws.pageSetup.fitToPage = true;
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
  const providedRows = (opts.sampleRows || []).filter(
    (row) => Array.isArray(row) && row.some((v) => v !== undefined && v !== null && v !== "")
  );
  const dataStartRow = 3;

  // Resolve o tipo efetivo de cada coluna uma única vez (usa o tipo salvo,
  // ou infere pelo nome/amostra). É isso que garante que colunas de valor
  // (ex: "Valor", "Preço de Venda", "Total Gasto") sejam somadas automaticamente
  // na linha de TOTAL, mesmo em templates antigos ou planilhas geradas por IA
  // que não têm o campo `type` preenchido.
  const resolvedTypes = cols.map((col, cIdx) =>
    resolveColumnType(col, providedRows.map((row) => row?.[cIdx]))
  );

  // Nenhum modelo sai vazio: sem amostras cadastradas, geramos exemplos
  // plausíveis por tipo/nome de coluna para o usuário apenas substituir.
  const sampleRows = providedRows.length > 0 ? providedRows : buildExampleRows(cols, resolvedTypes);
  const totalDataRows = Math.max(sampleRows.length + 12, 20);

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

  // --- Barras de dados e validação nas colunas numéricas/data ---
  const lastDataRow = summaryRow - 1;
  resolvedTypes.forEach((type, cIdx) => {
    const letter = columnLetter(cIdx);
    if (type === "currency" || type === "number") {
      ws.addConditionalFormatting({
        ref: `${letter}${dataStartRow}:${letter}${lastDataRow}`,
        rules: [
          {
            type: "dataBar",
            priority: cIdx + 1,
            minLength: 0,
            maxLength: 100,
            color: { argb: headerARGB },
            gradient: true,
            showValue: true,
            border: false,
            negativeBarColorSameAsPositive: false,
            negativeBarBorderColorSameAsPositive: false,
            axisPosition: "auto",
            direction: "leftToRight",
            cfvo: [{ type: "min" }, { type: "max" }],
          } as unknown as Parameters<typeof ws.addConditionalFormatting>[0]["rules"][number],
        ],
      });
    }
  });

  // --- Aba de resumo com estatísticas e gráfico ---
  addSummarySheet(
    wb,
    opts,
    sheetName,
    cols,
    resolvedTypes,
    dataStartRow,
    lastDataRow,
    headerARGB,
    accentARGB
  );

  // Print settings
  ws.pageSetup.orientation = "landscape";
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 0;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
