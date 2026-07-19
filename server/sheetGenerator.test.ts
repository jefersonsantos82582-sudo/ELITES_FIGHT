import { describe, expect, it } from "vitest";
import { generateSpreadsheet, type ColumnDef } from "./services/sheetGenerator";
import ExcelJS from "exceljs";

describe("sheetGenerator", () => {
  const testColumns: ColumnDef[] = [
    { name: "Data", type: "date", width: 15, format: "dd/mm/yyyy" },
    { name: "Descrição", type: "text", width: 30 },
    { name: "Valor", type: "currency", width: 15, format: "R$ #,##0.00" },
    { name: "Saldo", type: "formula", width: 15, formula: "C{row}" },
  ];

  const testSampleRows = [
    [new Date("2024-01-01"), "Receita", 1000, ""],
    [new Date("2024-01-02"), "Despesa", -500, ""],
  ];

  it("should generate a valid .xlsx buffer", async () => {
    const buffer = await generateSpreadsheet({
      templateName: "Controle Financeiro",
      customName: "Minha Planilha Teste",
      columns: testColumns,
      sampleRows: testSampleRows,
      headerColor: "#D4AF37",
      accentColor: "#1A1A1A",
      hasWatermark: false,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should produce a workbook with correct title, headers, and formulas", async () => {
    const buffer = await generateSpreadsheet({
      templateName: "Controle Financeiro",
      customName: "Minha Planilha Teste",
      columns: testColumns,
      sampleRows: testSampleRows,
      headerColor: "#D4AF37",
      accentColor: "#1A1A1A",
      hasWatermark: false,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];

    expect(ws).toBeDefined();
    expect(ws.name).toBe("Minha Planilha Teste");

    // Title row (row 1)
    const titleCell = ws.getCell(1, 1);
    expect(titleCell.value).toBe("MINHA PLANILHA TESTE");
    expect(titleCell.font?.bold).toBe(true);
    expect(titleCell.font?.size).toBe(16);

    // Header row (row 2)
    expect(ws.getCell(2, 1).value).toBe("Data");
    expect(ws.getCell(2, 2).value).toBe("Descrição");
    expect(ws.getCell(2, 3).value).toBe("Valor");
    expect(ws.getCell(2, 4).value).toBe("Saldo");

    // Check header borders
    const headerCell = ws.getCell(2, 1);
    expect(headerCell.border?.top?.style).toBe("thin");
    expect(headerCell.border?.bottom?.style).toBe("medium");

    // Check header fill color
    expect(headerCell.fill?.type).toBe("pattern");

    // Data rows (row 3, 4)
    const dataCell = ws.getCell(3, 2);
    expect(dataCell.value).toBe("Receita");

    // Formula column should have formula
    const formulaCell = ws.getCell(3, 4);
    expect(formulaCell.value).toBeDefined();

    // Summary row should have SUM formula for currency column
    const summaryRow = 3 + Math.max(testSampleRows.length, 20);
    const summaryCell = ws.getCell(summaryRow, 3);
    const summaryValue = summaryCell.value as any;
    expect(summaryValue?.formula).toContain("SUM");

    // First column of summary should say "TOTAL"
    expect(ws.getCell(summaryRow, 1).value).toBe("TOTAL");
  });

  it("should include watermark when hasWatermark is true", async () => {
    const buffer = await generateSpreadsheet({
      templateName: "Test Template",
      customName: "Watermark Test",
      columns: testColumns,
      headerColor: "#D4AF37",
      accentColor: "#1A1A1A",
      hasWatermark: true,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];

    // Search for watermark text in all cells
    let foundWatermark = false;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === "string" && cell.value.includes("ELITES_FIGHT")) {
          foundWatermark = true;
        }
      });
    });

    expect(foundWatermark).toBe(true);
  });

  it("should apply correct number formats for currency and date", async () => {
    const buffer = await generateSpreadsheet({
      templateName: "Test",
      customName: "Format Test",
      columns: testColumns,
      sampleRows: testSampleRows,
      headerColor: "#D4AF37",
      accentColor: "#1A1A1A",
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];

    // Currency column (col 3) should have R$ format
    const currencyCell = ws.getCell(3, 3);
    expect(currencyCell.numFmt).toContain("R$");

    // Date column (col 1) should have dd/mm/yyyy format
    const dateCell = ws.getCell(3, 1);
    expect(dateCell.numFmt).toContain("dd/mm");
  });
});
