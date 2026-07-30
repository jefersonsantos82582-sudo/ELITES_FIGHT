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
 * Função para chamar o Google Gemini 1.5 Flash diretamente via API do Google AI Studio
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

async function callGemini(prompt: string): Promise<string> {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY não configurada no Render.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${ENV.geminiApiKey}`;
  
  const response = await axios.post(url, {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
    }
  });

  const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Resposta vazia do Gemini");
  }
  return content;
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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Não foi possível extrair JSON da resposta da IA");
    }

    const result = JSON.parse(jsonMatch[0]) as AIGenerationResponse;

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
