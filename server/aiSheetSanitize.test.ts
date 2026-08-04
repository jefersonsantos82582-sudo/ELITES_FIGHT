import { describe, expect, it } from "vitest";
import { sanitizeAIResult } from "./services/aiSheetGenerator";

describe("sanitizeAIResult", () => {
  it("mantém colunas de fórmula válidas e limpa o '=' inicial", () => {
    const out = sanitizeAIResult({
      columns: [
        { name: "Produto", type: "text" },
        { name: "Qtd", type: "number" },
        { name: "Preço", type: "currency" },
        { name: "Total", type: "formula", formula: "=B{row}*C{row}" },
      ],
      sampleRows: [["Item A", "2", "10", "qualquer coisa"]],
    });

    expect(out.columns[3].formula).toBe("B{row}*C{row}");
    // A posição da coluna calculada é esvaziada para o Excel calcular.
    expect(out.sampleRows[0]).toEqual(["Item A", "2", "10", ""]);
  });

  it("rebaixa coluna 'formula' sem fórmula para texto e descarta colunas sem nome", () => {
    const out = sanitizeAIResult({
      columns: [
        { name: "Item", type: "text" },
        { name: "", type: "text" },
        { name: "Calculado", type: "formula" },
      ],
      sampleRows: [["A", "lixo", "B"]],
    });

    expect(out.columns).toHaveLength(2);
    expect(out.columns[1].type).toBe("text");
  });

  it("normaliza linhas com tamanho diferente do número de colunas", () => {
    const out = sanitizeAIResult({
      columns: [
        { name: "A", type: "text" },
        { name: "B", type: "number" },
      ],
      sampleRows: [["só um valor"], ["x", "1", "sobrando"], ["", ""]],
    });

    expect(out.sampleRows).toEqual([["só um valor", ""], ["x", "1"]]);
  });
});
