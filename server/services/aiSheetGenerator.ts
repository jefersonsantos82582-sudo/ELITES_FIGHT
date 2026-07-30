import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import axios from "axios";

export interface AIGenerationRequest {
  modelType: "bebidas" | "produtos" | "clientes";
  description: string;
  customName: string;
  rowCount?: number;
}

export interface AIGenerationResponse {
  columns: Array<{
    name: string;
    width?: number;
    type?: "text" | "number" | "currency" | "date" | "time";
  }>;
  sampleRows: string[][];
}

const MODEL_PROMPTS = {
  bebidas: `Você é um especialista em criar planilhas de controle de bebidas para bares, restaurantes e lojas.
Gere uma estrutura de planilha profissional para controle de bebidas com as seguintes colunas:
- ID da Bebida
- Nome da Bebida
- Categoria (Cerveja, Vinho, Destilado, Refrigerante, Suco, Água, Chá, Café, Energético)
- Marca
- Tamanho/Volume
- Preço de Custo
- Preço de Venda
- Estoque Atual
- Estoque Mínimo
- Fornecedor
- Data da Última Compra
- Status (Ativo/Inativo)

Para cada coluna, defina também o campo "type" com um dos valores: "text", "number", "currency" ou "date".
Use "currency" para colunas de preço/valor monetário (Preço de Custo, Preço de Venda), "number" para colunas numéricas que não são dinheiro (Estoque Atual, Estoque Mínimo) e "date" para datas. Isso é obrigatório: colunas monetárias e numéricas SEMPRE precisam de "type" para que o total seja calculado automaticamente na planilha.

Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "columns": [
    {"name": "ID", "width": 8, "type": "text"},
    {"name": "Nome", "width": 20, "type": "text"},
    {"name": "Preço de Custo", "width": 14, "type": "currency"},
    {"name": "Preço de Venda", "width": 14, "type": "currency"},
    {"name": "Estoque Atual", "width": 12, "type": "number"},
    ...
  ],
  "sampleRows": [
    ["1", "Brahma 600ml", "Cerveja", "Brahma", "600ml", "2.50", "8.00", "45", "10", "Distribuidora XYZ", "2024-07-15", "Ativo"],
    ...
  ]
}

Gere pelo menos 5 linhas de exemplo realistas.`,

  produtos: `Você é um especialista em criar planilhas de controle de produtos para lojas, e-commerce e distribuidoras.
Gere uma estrutura de planilha profissional para controle de produtos com as seguintes colunas:
- SKU
- Nome do Produto
- Categoria
- Marca
- Descrição
- Preço de Custo
- Preço de Venda
- Margem (%)
- Estoque Atual
- Estoque Mínimo
- Localização no Estoque
- Fornecedor
- Data de Cadastro
- Status (Ativo/Inativo)

Para cada coluna, defina também o campo "type" com um dos valores: "text", "number", "currency" ou "date".
Use "currency" para colunas de preço/valor monetário (Preço de Custo, Preço de Venda), "number" para colunas numéricas que não são dinheiro (Margem %, Estoque Atual, Estoque Mínimo) e "date" para datas. Isso é obrigatório: colunas monetárias e numéricas SEMPRE precisam de "type" para que o total seja calculado automaticamente na planilha.

Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "columns": [
    {"name": "SKU", "width": 12, "type": "text"},
    {"name": "Nome", "width": 25, "type": "text"},
    {"name": "Preço de Custo", "width": 14, "type": "currency"},
    {"name": "Preço de Venda", "width": 14, "type": "currency"},
    {"name": "Estoque Atual", "width": 12, "type": "number"},
    ...
  ],
  "sampleRows": [
    ["SKU001", "Notebook Dell Inspiron 15", "Eletrônicos", "Dell", "Notebook 15.6\" Intel i5", "1800.00", "2499.00", "38.83", "12", "5", "Prateleira A1", "Tech Distributor", "2024-01-10", "Ativo"],
    ...
  ]
}

Gere pelo menos 5 linhas de exemplo realistas e variadas.`,

  clientes: `Você é um especialista em criar planilhas de gestão de clientes para empresas, consultórios e serviços.
Gere uma estrutura de planilha profissional para gestão de clientes com as seguintes colunas:
- ID do Cliente
- Nome Completo
- Email
- Telefone
- CPF/CNPJ
- Endereço
- Cidade
- Estado
- CEP
- Data de Cadastro
- Última Compra
- Total Gasto
- Categoria (Bronze/Prata/Ouro)
- Status (Ativo/Inativo)

Para cada coluna, defina também o campo "type" com um dos valores: "text", "number", "currency" ou "date".
Use "currency" para colunas de valor monetário (Total Gasto), "number" para colunas numéricas que não são dinheiro e "date" para datas. Isso é obrigatório: colunas monetárias e numéricas SEMPRE precisam de "type" para que o total seja calculado automaticamente na planilha.

Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "columns": [
    {"name": "ID", "width": 8, "type": "text"},
    {"name": "Nome", "width": 22, "type": "text"},
    {"name": "Total Gasto", "width": 14, "type": "currency"},
    ...
  ],
  "sampleRows": [
    ["1", "João Silva Santos", "joao.silva@email.com", "(11) 98765-4321", "123.456.789-00", "Rua das Flores 123", "São Paulo", "SP", "01234-567", "2024-01-15", "2024-07-10", "1250.50", "Ouro", "Ativo"],
    ...
  ]
}

Gere pelo menos 5 linhas de exemplo realistas com dados variados.`,
};

/**
 * Função para chamar o Google Gemini diretamente via API do Google AI Studio.
 *
 * Observação importante: o modelo "gemini-1.5-flash" foi descontinuado pelo Google
 * e depois "gemini-2.5-flash" também deixou de estar disponível para novas
 * contas/chaves ("This model models/gemini-2.5-flash is no longer available to
 * new users"). Por isso usamos o alias "gemini-flash-latest", que a própria
 * Google atualiza automaticamente para o modelo Flash estável mais recente
 * (hoje gemini-3.6-flash), evitando que a chave quebre de novo a cada
 * descontinuação. Os tokens de raciocínio (thinking) são contabilizados dentro
 * de maxOutputTokens, então um limite baixo (ex: 2000) fazia o modelo gastar
 * tudo "pensando" e não sobrar texto para a resposta final — por isso a regex
 * não encontrava o JSON. A correção: desligar o thinking (thinkingBudget: 0) e
 * aumentar a folga de tokens de saída.
 */
// Schema estrito: obriga o Gemini a devolver JSON já no formato esperado,
// em vez de confiar que ele "escreva" um JSON válido sozinho (isso evitava
// erros de sintaxe como vírgula/colchete faltando no meio do array).
const SHEET_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    columns: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          width: { type: "NUMBER" },
          type: { type: "STRING", enum: ["text", "number", "currency", "date", "time"] },
        },
        required: ["name", "type"],
      },
    },
    sampleRows: {
      type: "ARRAY",
      items: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
    },
  },
  required: ["columns", "sampleRows"],
};

// Ordem de tentativa dos modelos: primeiro o alias "latest" (sempre válido,
// a Google troca o modelo por trás dele sozinha), depois modelos fixos como
// rede de segurança caso o alias tenha algum problema pontual.
const GEMINI_MODEL_FALLBACKS = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
];

// A partir da série Gemini 3 o parâmetro para controlar o "thinking" mudou de
// thinkingConfig.thinkingBudget (número de tokens, aceitava 0 = desligado)
// para thinkingConfig.thinkingLevel ("minimal" | "low" | "medium" | "high").
// Mandar thinkingBudget para um modelo 3.x (ou vice-versa) resulta em erro
// 400 "Request contains an invalid argument" — por isso o config precisa ser
// montado por modelo, e não fixo.
function isGemini3Model(model: string): boolean {
  return /gemini-3|gemini-flash-latest|gemini-pro-latest/.test(model);
}

function getThinkingConfig(model: string): Record<string, unknown> {
  return isGemini3Model(model)
    ? { thinkingLevel: "minimal" }
    : { thinkingBudget: 0 };
}

async function callGemini(prompt: string): Promise<string> {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY não configurada no Render.");
  }

  let lastError: Error | null = null;

  for (const model of GEMINI_MODEL_FALLBACKS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.geminiApiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        // Modelos "3.x" continuam gastando tokens de thinking mesmo em nível
        // mínimo, então damos mais folga de saída para não estourar o limite
        // antes do JSON final ser escrito.
        maxOutputTokens: isGemini3Model(model) ? 16000 : 8192,
        responseMimeType: "application/json",
        responseSchema: SHEET_RESPONSE_SCHEMA,
        thinkingConfig: getThinkingConfig(model),
      }
    };

    let response;
    try {
      response = await axios.post(url, body);
    } catch (err) {
      // O axios só devolve "Request failed with status code XXX" por padrão,
      // escondendo o motivo real que o Google manda no corpo do erro (modelo
      // não encontrado/descontinuado, parâmetro incompatível com a versão do
      // modelo, sem billing habilitado, quota excedida, etc).
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const googleMessage = err.response?.data?.error?.message || JSON.stringify(err.response?.data)?.slice(0, 500);
        console.error(`[AI Sheet Generator] Erro HTTP do Gemini (modelo ${model}):`, status, googleMessage);
        lastError = new Error(`Gemini retornou erro ${status ?? ""}: ${googleMessage || err.message}`);
        // Modelo não encontrado/descontinuado (404), não disponível para essa
        // chave (403) ou requisição rejeitada (400, ex: parâmetro incompatível)
        // — tenta o próximo modelo da lista em vez de falhar direto.
        if (status === 404 || status === 403 || status === 400) {
          continue;
        }
        throw lastError;
      }
      throw err;
    }

    const candidate = response.data?.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text;

    if (!content) {
      const finishReason = candidate?.finishReason;
      console.error(
        `[AI Sheet Generator] Resposta vazia do Gemini (modelo ${model}). finishReason:`,
        finishReason,
        "payload:",
        JSON.stringify(response.data).slice(0, 1000)
      );
      lastError = new Error(
        finishReason === "MAX_TOKENS"
          ? "Resposta vazia do Gemini: limite de tokens atingido antes de gerar a resposta final."
          : "Resposta vazia do Gemini"
      );
      continue;
    }
    return content;
  }

  throw lastError ?? new Error("Nenhum modelo Gemini disponível respondeu.");
}

/**
 * Tenta fazer parse de um JSON que pode vir com pequenos problemas de sintaxe
 * (vírgula sobrando, ou resposta cortada no meio de um array/objeto porque o
 * modelo estourou o limite de tokens). Em vez de falhar direto, tenta reparar:
 * 1) remove vírgulas soltas antes de "]"/"}"
 * 2) se ainda assim não for válido, corta a string no último elemento completo
 *    e fecha os colchetes/chaves pendentes.
 */
function parseJsonWithRepair(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // ignora e tenta reparar
  }

  const withoutTrailingCommas = raw.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(withoutTrailingCommas);
  } catch {
    // ignora e tenta reparar por truncamento
  }

  const repaired = closeTruncatedJson(withoutTrailingCommas);
  return JSON.parse(repaired);
}

function closeTruncatedJson(str: string): string {
  let inString = false;
  let escape = false;
  let lastSafeIndex = -1;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
    if (ch === "," || ch === "}" || ch === "]") {
      lastSafeIndex = i;
    }
  }

  if (lastSafeIndex === -1) {
    return str;
  }

  let truncated = str.slice(0, lastSafeIndex + 1).replace(/,\s*$/, "");

  // Recalcula quais colchetes/chaves ainda estão abertos até o ponto de corte
  const remainingStack: string[] = [];
  let inStr2 = false;
  let esc2 = false;
  for (let i = 0; i < truncated.length; i++) {
    const ch = truncated[i];
    if (inStr2) {
      if (esc2) {
        esc2 = false;
      } else if (ch === "\\") {
        esc2 = true;
      } else if (ch === '"') {
        inStr2 = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr2 = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      remainingStack.push(ch);
    } else if (ch === "}" || ch === "]") {
      remainingStack.pop();
    }
  }

  const closing = remainingStack
    .reverse()
    .map((c) => (c === "{" ? "}" : "]"))
    .join("");

  return truncated + closing;
}

/**
 * Tenta fazer parse de um JSON que pode vir com pequenos problemas de sintaxe
 * (vírgula sobrando, ou resposta cortada no meio de um array/objeto porque o
 * modelo estourou o limite de tokens). Em vez de falhar direto, tenta reparar:
 * 1) remove vírgulas soltas antes de "]"/"}"
 * 2) se ainda assim não for válido, corta a string no último elemento completo
 *    e fecha os colchetes/chaves pendentes.
 */
function parseJsonWithRepair(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // ignora e tenta reparar
  }

  const withoutTrailingCommas = raw.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(withoutTrailingCommas);
  } catch {
    // ignora e tenta reparar por truncamento
  }

  const repaired = closeTruncatedJson(withoutTrailingCommas);
  return JSON.parse(repaired);
}

function closeTruncatedJson(str: string): string {
  let inString = false;
  let escape = false;
  let lastSafeIndex = -1;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
    if (ch === "," || ch === "}" || ch === "]") {
      lastSafeIndex = i;
    }
  }

  if (lastSafeIndex === -1) {
    return str;
  }

  let truncated = str.slice(0, lastSafeIndex + 1).replace(/,\s*$/, "");

  // Recalcula quais colchetes/chaves ainda estão abertos até o ponto de corte
  const remainingStack: string[] = [];
  let inStr2 = false;
  let esc2 = false;
  for (let i = 0; i < truncated.length; i++) {
    const ch = truncated[i];
    if (inStr2) {
      if (esc2) {
        esc2 = false;
      } else if (ch === "\\") {
        esc2 = true;
      } else if (ch === '"') {
        inStr2 = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr2 = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      remainingStack.push(ch);
    } else if (ch === "}" || ch === "]") {
      remainingStack.pop();
    }
  }

  const closing = remainingStack
    .reverse()
    .map((c) => (c === "{" ? "}" : "]"))
    .join("");

  return truncated + closing;
}

export async function generateSheetWithAI(
  request: AIGenerationRequest
): Promise<AIGenerationResponse> {
  const prompt = MODEL_PROMPTS[request.modelType];
  const userMessage = `${prompt}

IMPORTANTE — instrução do cliente tem prioridade sobre a lista de colunas acima:
A lista de colunas sugerida acima é apenas um PONTO DE PARTIDA. O que o cliente pediu abaixo em "Pedido do cliente" é a fonte da verdade e DEVE ser refletido na estrutura final da planilha:
- Se o cliente mencionar colunas/campos específicos que não estão na lista sugerida, ADICIONE essas colunas.
- Se o cliente disser que não precisa de alguma coluna da lista sugerida, REMOVA essa coluna.
- Se o cliente pedir para renomear, reordenar ou focar em algum aspecto específico, siga o pedido dele.
- Se o cliente descrever um negócio/uso diferente do genérico (ex.: tipo específico de produto, setor, forma de cobrança, etc.), adapte os nomes das colunas e os dados de exemplo para esse contexto real, não apenas o genérico.
- Só use a lista sugerida como está se o cliente não tiver pedido nada que a contradiga ou complemente.

Pedido do cliente (siga isso rigorosamente): "${request.description}"

Gere ${request.rowCount || 5} linhas de dados de exemplo coerentes com o pedido do cliente.`;

  try {
    let content: string;

    // Tenta usar Gemini se a chave estiver configurada, senão tenta usar o invokeLLM padrão (OpenAI)
    if (ENV.geminiApiKey) {
      console.log("[AI Generator] Usando Google Gemini...");
      content = await callGemini(userMessage);
    } else {
      console.log("[AI Generator] Usando OpenAI/Manus Forge...");
      const response = await invokeLLM({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        max_tokens: 2000,
      });
      content = response.choices?.[0]?.message?.content as string;
    }

    if (!content) {
      throw new Error("Nenhuma resposta recebida da IA");
    }

    // Remove possíveis cercas de código markdown (```json ... ```) antes de extrair o JSON
    const cleanedContent = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON from response
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(
        "[AI Sheet Generator] Conteúdo recebido sem JSON:",
        content.slice(0, 500)
      );
      throw new Error("Não foi possível extrair JSON da resposta da IA");
    }

    const result = parseJsonWithRepair(jsonMatch[0]) as AIGenerationResponse;

    // Validate response structure
    if (!Array.isArray(result.columns) || !Array.isArray(result.sampleRows)) {
      throw new Error("Estrutura de resposta inválida da IA");
    }

    return result;
  } catch (error) {
    console.error("[AI Sheet Generator] Erro ao gerar planilha com IA:", error);
    throw new Error(
      error instanceof Error
        ? `Erro ao gerar planilha com IA: ${error.message}`
        : "Erro desconhecido ao gerar planilha com IA"
    );
  }
}
