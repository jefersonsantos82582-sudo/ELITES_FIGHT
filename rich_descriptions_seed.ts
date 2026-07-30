import postgres from "postgres";

const sql = postgres('postgresql://elites_fight_user:70RZTnOuDB685JVomjJ3oTJrwrbkjspm@dpg-d9e33cbbc2fs73f52vsg-a.oregon-postgres.render.com/elites_fight', {
  ssl: 'require'
});

(async () => {
  try {
    console.log('🔄 Limpando dados antigos...');
    await sql`DELETE FROM "templates"`;
    
    // Categorias: 1: Finanças, 2: Vendas, 3: Estoque, 4: RH, 5: Marketing, 6: Compras
    
    // Cores Free (Simples e elegantes)
    const coresFree = [
      { a: '#06b6d4', h: '#0891b2' }, // Ciano Claro
      { a: '#84cc16', h: '#65a30d' }, // Verde Limão
      { a: '#eab308', h: '#ca8a04' }, // Amarelo Ouro
      { a: '#3b82f6', h: '#2563eb' }, // Azul Céu
      { a: '#f43f5e', h: '#e11d48' }  // Coral Suave
    ];
    
    // Cores Pro (Modernas e diferenciadas)
    const coresPro = [
      { a: '#0891b2', h: '#164e63' }, // Ciano Cromático
      { a: '#1e3a8a', h: '#172554' }, // Azul Metálico
      { a: '#a855f7', h: '#7e22ce' }, // Roxo Neon
      { a: '#22c55e', h: '#15803d' }, // Verde Elétrico
      { a: '#9ca3af', h: '#4b5563' }, // Prata Brilhante
      { a: '#60a5fa', h: '#2563eb' }, // Azul Cristal
      { a: '#ec4899', h: '#be185d' }, // Rosa Neon
      { a: '#fcd34d', h: '#d97706' }, // Dourado Suave
      { a: '#f97316', h: '#c2410c' }, // Laranja Fogo
      { a: '#10b981', h: '#047857' }  // Verde Esmeralda
    ];
    
    // Cores Elite (Premium, sofisticadas e profissionais)
    const coresElite = [
      { a: '#991b1b', h: '#450a0a' }, // Vermelho Dourado Fosco
      { a: '#fbbf24', h: '#b45309' }, // Ouro Real
      { a: '#111827', h: '#000000' }, // Preto Obsidiana
      { a: '#172554', h: '#080f26' }, // Azul Galáxia
      { a: '#be123c', h: '#881337' }, // Rubi Metálico
      { a: '#d1d5db', h: '#6b7280' }, // Platina Elite
      { a: '#b45309', h: '#78350f' }, // Bronze Luxo
      { a: '#374151', h: '#111827' }, // Titânio Escuro
      { a: '#7e22ce', h: '#4c1d95' }, // Ametista Real
      { a: '#1f2937', h: '#030712' }, // Carbono Premium
      { a: '#0f766e', h: '#042f2e' }, // Esmeralda Imperial
      { a: '#4338ca', h: '#134e4a' }, // Safira Escura
      { a: '#b91c1c', h: '#7f1d1d' }, // Carmesim Luxo
      { a: '#4f46e5', h: '#312e81' }, // Índigo Real
      { a: '#6d28d9', h: '#4c1d95' }  // Violeta Nobre
    ];

    // 10 FREE - Simples e úteis
    const free = [
      { 
        name: 'Controle de Compras Residenciais', 
        slug: 'controle-compras', 
        desc: 'Organize suas idas ao supermercado de forma eficiente. Esta planilha permite listar itens, quantidades e prever o valor total da compra antes mesmo de chegar ao caixa, ajudando no controle do orçamento doméstico.', 
        cat: 6, plan: 'free', cols: ['Item', 'Qtd', 'Preço Unitário', 'Total Estimado', 'Comprado?'], sample: [['Arroz 5kg', '2', '25.00', '50.00', 'Não']] 
      },
      { 
        name: 'Controle Financeiro Pessoal', 
        slug: 'controle-financeiro', 
        desc: 'Mantenha suas finanças pessoais em dia. Registre todas as suas fontes de renda e despesas diárias para saber exatamente para onde seu dinheiro está indo e quanto sobra no final do mês.', 
        cat: 1, plan: 'free', cols: ['Data', 'Descrição', 'Categoria', 'Receita', 'Despesa', 'Saldo Atual'], sample: [['01/01/2026', 'Salário', 'Renda Fixa', '5000.00', '', '5000.00']] 
      },
      { 
        name: 'Cadastro Básico de Clientes', 
        slug: 'cadastro-clientes', 
        desc: 'Ideal para autônomos e pequenos negócios que precisam organizar os contatos de seus clientes. Mantenha telefones, e-mails e endereços sempre à mão para facilitar o atendimento.', 
        cat: 2, plan: 'free', cols: ['Nome Completo', 'Email', 'Telefone/WhatsApp', 'Cidade/Estado', 'Observações'], sample: [['João Silva', 'joao@email.com', '(11) 99999-9999', 'São Paulo/SP', 'Cliente desde 2025']] 
      },
      { 
        name: 'Planejamento Mensal de Metas', 
        slug: 'planejamento-mensal', 
        desc: 'Acompanhe seus objetivos semana a semana. Defina metas claras e registre o que foi realizado para calcular automaticamente o seu percentual de progresso ao longo do mês.', 
        cat: 1, plan: 'free', cols: ['Semana', 'Objetivo Principal', 'Meta Numérica', 'Realizado', 'Progresso %'], sample: [['Semana 1', 'Economizar', '1000.00', '950.00', '95%']] 
      },
      { 
        name: 'Agenda Profissional Diária', 
        slug: 'agenda-profissional', 
        desc: 'Nunca mais perca um compromisso. Organize sua rotina diária separando por horários, detalhando a atividade e o cliente envolvido, com um status rápido para saber o que já foi concluído.', 
        cat: 4, plan: 'free', cols: ['Horário', 'Atividade', 'Cliente/Contato', 'Local', 'Status'], sample: [['09:00', 'Reunião Inicial', 'Cliente Alpha', 'Online', 'Confirmado']] 
      },
      { 
        name: 'Controle de Estoque Simples', 
        slug: 'estoque-basico', 
        desc: 'A solução perfeita para pequenos lojistas. Registre seus produtos, acompanhe a quantidade disponível em tempo real e saiba o valor total investido no seu inventário atual.', 
        cat: 3, plan: 'free', cols: ['Nome do Produto', 'Qtd em Estoque', 'Preço Unitário', 'Valor Total', 'Categoria'], sample: [['Camiseta Básica', '100', '50.00', '5000.00', 'Vestuário']] 
      },
      { 
        name: 'Lista de Tarefas Diárias', 
        slug: 'lista-tarefas', 
        desc: 'Aumente sua produtividade organizando suas obrigações por nível de prioridade. Acompanhe o status e o prazo limite de cada tarefa para garantir que nada fique para trás.', 
        cat: 4, plan: 'free', cols: ['Tarefa a Realizar', 'Nível de Prioridade', 'Status Atual', 'Data Limite', 'Notas'], sample: [['Enviar relatório', 'Alta', 'Em andamento', '05/01/2026', 'Falta revisão final']] 
      },
      { 
        name: 'Controle de Despesas de Viagem', 
        slug: 'despesas-viagem', 
        desc: 'Organize os gastos das suas viagens a trabalho ou lazer. Categorize cada despesa, desde passagens até alimentação, facilitando a prestação de contas ou o controle do seu orçamento.', 
        cat: 1, plan: 'free', cols: ['Data', 'Descrição do Gasto', 'Categoria', 'Valor (R$)', 'Comprovante?'], sample: [['01/01/2026', 'Passagem Aérea', 'Transporte', '800.00', 'Sim']] 
      },
      { 
        name: 'Avaliação de Desempenho', 
        slug: 'avaliacao-desempenho', 
        desc: 'Ferramenta simples para líderes de pequenas equipes. Registre notas periódicas para seus colaboradores e anote feedbacks construtivos para acompanhar a evolução de cada um.', 
        cat: 4, plan: 'free', cols: ['Nome do Funcionário', 'Mês Avaliado', 'Nota (0-10)', 'Ponto Forte', 'Ponto a Melhorar'], sample: [['Maria Oliveira', 'Jan/2026', '8.5', 'Pontualidade', 'Comunicação']] 
      },
      { 
        name: 'Registro de Vendas Diárias', 
        slug: 'registro-vendas', 
        desc: 'Ideal para o comércio varejista. Anote rapidamente cada venda realizada no dia, incluindo o produto, a quantidade e o valor, obtendo o faturamento total diário de forma simples.', 
        cat: 2, plan: 'free', cols: ['Data da Venda', 'Produto Vendido', 'Quantidade', 'Valor Total (R$)', 'Forma Pagamento'], sample: [['01/01/2026', 'Produto X', '5', '500.00', 'PIX']] 
      }
    ];

    // 20 PRO - Intermediários e profissionais
    const pro = [
      { 
        name: 'Orçamento Profissional de Veículos', 
        slug: 'orcamento-veiculos', 
        desc: 'Ferramenta indispensável para concessionárias e revendedores. Analise propostas de financiamento, registre detalhes específicos do veículo e acompanhe o status de aprovação de cada negociação.', 
        cat: 2, plan: 'pro', cols: ['Veículo', 'Marca/Modelo', 'Ano Fab.', 'Valor Proposto', 'Forma Pagamento', 'Entrada (R$)', 'Status Aprovação'], sample: [['Carro Executivo', 'Toyota Corolla', '2024', '150000.00', 'Financiamento 60x', '50000.00', 'Aprovado']] 
      },
      { 
        name: 'Gestão Avançada de Estoque (SKU)', 
        slug: 'estoque-pro', 
        desc: 'Controle profissional de inventário para e-commerce e varejo. Utilize códigos SKU, defina alertas de estoque mínimo para reposição e gerencie sua margem de lucro com preços de custo e venda.', 
        cat: 3, plan: 'pro', cols: ['Código SKU', 'Produto', 'Qtd Atual', 'Mínimo Ideal', 'Preço de Custo', 'Preço de Venda', 'Margem Bruta'], sample: [['SKU-001', 'Smartphone Pro', '50', '10', '1500.00', '2899.00', '48%']] 
      },
      { 
        name: 'Controle Completo de Funcionários', 
        slug: 'gestao-func', 
        desc: 'Sistema de RH estruturado para médias empresas. Mantenha o histórico completo da sua equipe, incluindo dados de admissão, evolução salarial, departamento e status contratual.', 
        cat: 4, plan: 'pro', cols: ['Nome Completo', 'Cargo Atual', 'Departamento', 'Salário (R$)', 'Data Admissão', 'Tipo Contrato', 'Status'], sample: [['João Silva', 'Gerente Comercial', 'Vendas', '8000.00', '15/03/2020', 'CLT', 'Ativo']] 
      },
      { 
        name: 'Gestão de Academia e Planos', 
        slug: 'academia-premium', 
        desc: 'Desenvolvido especificamente para academias e estúdios. Controle os planos ativos de cada aluno, acompanhe as datas de vencimento e identifique rapidamente inadimplências para ação de cobrança.', 
        cat: 1, plan: 'pro', cols: ['Nome do Aluno', 'Plano Contratado', 'Valor Mensalidade', 'Vencimento', 'Status Pagamento', 'Última Frequência'], sample: [['Maria Santos', 'Plano Anual Gold', '150.00', '31/01/2026', 'Em Dia', '05/01/2026']] 
      },
      { 
        name: 'Análise Detalhada de Vendas', 
        slug: 'vendas-detalh', 
        desc: 'Dashboard em formato de planilha para gestores comerciais. Acompanhe não apenas o faturamento, mas também o desempenho individual de cada vendedor e o cálculo automático de comissões.', 
        cat: 2, plan: 'pro', cols: ['Data da Venda', 'Produto/Serviço', 'Quantidade', 'Valor Total', 'Vendedor Responsável', 'Taxa Comissão', 'Comissão Devida'], sample: [['01/01/2026', 'Pacote Premium', '10', '5000.00', 'Carlos Mendes', '5%', '250.00']] 
      },
      { 
        name: 'Rastreamento de Entregas Logísticas', 
        slug: 'entregas-log', 
        desc: 'Solução para empresas com frota própria ou que dependem de transportadoras. Monitore cada pedido desde a expedição até a assinatura do cliente, controlando prazos e rotas.', 
        cat: 3, plan: 'pro', cols: ['Código Pedido', 'Cliente Destino', 'Endereço Completo', 'Transportadora', 'Data Expedição', 'Previsão Entrega', 'Status Atual'], sample: [['PED-2026-001', 'Empresa Alpha', 'Rua Central, 123 - SP', 'Loggi', '01/01/2026', '03/01/2026', 'Em Rota']] 
      },
      { 
        name: 'Análise de Custos por Departamento', 
        slug: 'analise-custos', 
        desc: 'Ferramenta de controladoria para acompanhamento de Budget. Compare o orçamento previsto com o gasto real de cada setor da empresa e identifique rapidamente onde há excesso de despesas.', 
        cat: 1, plan: 'pro', cols: ['Departamento', 'Centro de Custo', 'Orçamento Previsto', 'Gasto Realizado', 'Diferença (R$)', 'Utilização %', 'Status'], sample: [['Comercial', 'CC-01', '50000.00', '48500.00', '1500.00', '97%', 'Dentro da Meta']] 
      },
      { 
        name: 'Gestão de Projetos e Prazos', 
        slug: 'gestao-projetos', 
        desc: 'Acompanhamento estruturado para gerentes de projeto. Controle o cronograma, defina os responsáveis por cada entrega, monitore o progresso percentual e o orçamento consumido.', 
        cat: 4, plan: 'pro', cols: ['Nome do Projeto', 'Cliente/Setor', 'Data Início', 'Data Conclusão', 'Responsável', 'Progresso %', 'Orçamento (R$)'], sample: [['Implantação ERP', 'TI Interna', '01/01/2026', '31/03/2026', 'Ana Paula', '60%', '100000.00']] 
      },
      { 
        name: 'Controle e Avaliação de Fornecedores', 
        slug: 'fornecedores', 
        desc: 'Otimize seu setor de compras (Procurement). Mantenha o cadastro de seus parceiros de negócios e avalie a qualidade das entregas e o cumprimento de prazos para futuras negociações.', 
        cat: 6, plan: 'pro', cols: ['Razão Social Fornecedor', 'Contato Principal', 'Email Corporativo', 'Categoria Fornecimento', 'Prazo Médio (Dias)', 'Avaliação (1-5)', 'Status Parceria'], sample: [['Indústria XYZ Ltda', 'Carlos', 'comercial@xyz.com', 'Matéria Prima B', '7', '4.5', 'Homologado']] 
      },
      { 
        name: 'Performance de Vendas por Região', 
        slug: 'vendas-regiao', 
        desc: 'Ideal para empresas com atuação nacional ou regional. Analise qual área geográfica traz mais resultados, compare com as metas estabelecidas e identifique oportunidades de expansão.', 
        cat: 2, plan: 'pro', cols: ['Região Geográfica', 'Gerente Regional', 'Meta Estabelecida', 'Faturamento Real', 'Atingimento %', 'Produto Destaque', 'Comissão Total'], sample: [['Sudeste - SP', 'João Silva', '500000.00', '550000.00', '110%', 'Serviço Premium', '27500.00']] 
      },
      { 
        name: 'Cronograma de Manutenção de Equipamentos', 
        slug: 'manutencao-equip', 
        desc: 'Evite paradas na sua produção. Controle rigorosamente as manutenções preventivas e corretivas do seu maquinário, definindo responsáveis e os custos envolvidos em cada intervenção.', 
        cat: 3, plan: 'pro', cols: ['Identificação Equipamento', 'Localização/Setor', 'Última Manutenção', 'Próxima Revisão', 'Técnico Responsável', 'Status Atual', 'Custo Acumulado'], sample: [['Torno CNC 01', 'Fábrica - Galpão 2', '01/12/2025', '01/03/2026', 'Equipe Externa', 'Operacional', '1500.00']] 
      },
      { 
        name: 'Gestão de Campanhas de Marketing', 
        slug: 'campanhas-mark', 
        desc: 'Acompanhe o retorno sobre investimento (ROI) de suas ações publicitárias. Registre o orçamento destinado a cada campanha, os leads gerados e o custo real de aquisição de clientes.', 
        cat: 5, plan: 'pro', cols: ['Nome da Campanha', 'Plataforma (Ads)', 'Período Execução', 'Orçamento Mídia', 'Gasto Atualizado', 'Leads Gerados', 'ROI Estimado %'], sample: [['Black Friday 2026', 'Meta Ads + Google', '01 a 30/11', '10000.00', '9500.00', '500', '150%']] 
      },
      { 
        name: 'Controle de Qualidade na Produção', 
        slug: 'qualidade-prod', 
        desc: 'Ferramenta essencial para o setor industrial. Registre as inspeções de lotes produzidos, contabilize itens com defeito e calcule automaticamente a taxa de rejeição para melhoria contínua.', 
        cat: 3, plan: 'pro', cols: ['Data Inspeção', 'Número do Lote', 'Produto Inspecionado', 'Qtd Amostra', 'Itens Reprovados', 'Taxa Rejeição %', 'Inspetor'], sample: [['01/01/2026', 'LOTE-2026-01', 'Peça Metálica A', '1000', '5', '0.5%', 'Roberto']] 
      },
      { 
        name: 'Pesquisa de Satisfação do Cliente (NPS)', 
        slug: 'satisfacao-cli', 
        desc: 'Mensure a lealdade dos seus consumidores. Tabule os resultados de pesquisas de satisfação, analisando notas de atendimento, qualidade do produto e a probabilidade de recomendação.', 
        cat: 2, plan: 'pro', cols: ['Nome do Cliente/Empresa', 'Data da Pesquisa', 'Nota Geral (NPS)', 'Qualidade Atendimento', 'Qualidade Produto', 'Feedback Descritivo', 'Recomendaria?'], sample: [['Empresa ABC S.A.', '01/01/2026', '9 (Promotor)', '10', '8', 'Excelente suporte técnico', 'Sim']] 
      },
      { 
        name: 'Controle de Horas Extras e Banco', 
        slug: 'horas-extras', 
        desc: 'Gestão transparente da jornada extraordinária da sua equipe. Registre as horas excedentes, justifique os motivos, aprove com a gerência e calcule o impacto financeiro na folha de pagamento.', 
        cat: 4, plan: 'pro', cols: ['Colaborador', 'Data Ocorrência', 'Total Horas (HH:MM)', 'Motivo Justificado', 'Aprovação Gestor', 'Valor Hora (R$)', 'Custo Total'], sample: [['João Silva', '01/01/2026', '04:00', 'Fechamento contábil', 'Aprovado', '50.00', '200.00']] 
      },
      { 
        name: 'Inventário Anual de Ativos Físicos', 
        slug: 'inventario-anual', 
        desc: 'Controle patrimonial completo para a sua empresa. Cadastre móveis e equipamentos, registre a data de aquisição e acompanhe o valor atualizado considerando a depreciação ao longo do tempo.', 
        cat: 3, plan: 'pro', cols: ['Item Patrimonial (Tag)', 'Descrição Detalhada', 'Localização Física', 'Data Aquisição', 'Valor Original (R$)', 'Depreciação Acumulada', 'Valor Atualizado'], sample: [['PAT-001', 'Notebook Dell XPS 15', 'Mesa 01 - TI', '01/01/2023', '5000.00', '1500.00', '3500.00']] 
      },
      { 
        name: 'Gestão de Despesas Operacionais (OPEX)', 
        slug: 'despesas-oper', 
        desc: 'Controle rigoroso dos custos fixos e variáveis que mantêm seu negócio funcionando. Categorize aluguéis, contas de consumo e serviços, exigindo aprovação para pagamentos de alto valor.', 
        cat: 1, plan: 'pro', cols: ['Data Vencimento', 'Descrição da Despesa', 'Categoria OPEX', 'Valor a Pagar (R$)', 'Centro de Custo', 'Status Pagamento', 'Aprovação Diretoria'], sample: [['05/01/2026', 'Aluguel Sede SP', 'Infraestrutura', '5000.00', 'Administrativo', 'Agendado', 'Aprovado']] 
      },
      { 
        name: 'Monitoramento e Análise da Concorrência', 
        slug: 'analise-concorr', 
        desc: 'Inteligência de mercado para posicionamento estratégico. Compare seus preços e ofertas com os principais concorrentes do setor para ajustar sua estratégia comercial e de marketing.', 
        cat: 5, plan: 'pro', cols: ['Empresa Concorrente', 'Produto/Serviço Comparado', 'Preço Concorrente', 'Nosso Preço Praticado', 'Diferença (R$)', 'Estratégia Adotada', 'Data Coleta'], sample: [['Concorrente Master', 'Plano Enterprise', '500.00', '450.00', '-50.00', 'Liderança por preço', '01/01/2026']] 
      },
      { 
        name: 'Gestão de Reclamações e Ouvidoria', 
        slug: 'reclamacoes-cli', 
        desc: 'Transforme problemas em oportunidades de fidelização. Acompanhe os tickets abertos pelos clientes, defina níveis de prioridade e garanta que todas as resoluções sejam aplicadas no prazo.', 
        cat: 2, plan: 'pro', cols: ['Data Abertura', 'Cliente Reclamante', 'Produto/Serviço Afetado', 'Descrição do Problema', 'Nível Prioridade', 'Status Atual', 'Ação de Resolução'], sample: [['01/01/2026', 'Cliente Insatisfeito', 'Serviço Web', 'Instabilidade no acesso', 'Alta', 'Resolvido', 'Crédito na próxima fatura']] 
      },
      { 
        name: 'Controle de Compras e Cotações', 
        slug: 'compras-cotacoes', 
        desc: 'Otimize os custos de aquisição da sua empresa. Compare propostas de múltiplos fornecedores lado a lado, identifique o melhor preço e calcule a economia gerada em cada negociação.', 
        cat: 6, plan: 'pro', cols: ['Produto/Serviço Desejado', 'Proposta Fornecedor A', 'Proposta Fornecedor B', 'Proposta Fornecedor C', 'Fornecedor Vencedor', 'Valor Fechado', 'Economia Gerada'], sample: [['Notebooks Corporativos (10x)', 'R$ 45.000', 'R$ 42.000', 'R$ 48.000', 'Fornecedor B', 'R$ 42.000', 'R$ 3.000']] 
      }
    ];

    // 40 ELITE - Avançados e premium com descrições super detalhadas
    const eliteDescriptions = [
      'Dashboard financeiro completo com projeções de fluxo de caixa, análise de liquidez, indicadores de endividamento e consolidação de resultados DRE para apresentações ao conselho administrativo.',
      'Plataforma integrada de CRM (Customer Relationship Management) com funil de vendas avançado, previsão de fechamento (forecast), taxa de conversão por etapa e análise de churn rate.',
      'Sistema master de Supply Chain com previsão de demanda baseada em histórico, cálculo de lote econômico de compras (LEC), giro de estoque e integração com curva ABC de produtos.',
      'Painel executivo de Capital Humano (People Analytics) com indicadores de turnover, absenteísmo, custo total por colaborador, pesquisa de clima organizacional e mapa de sucessão de lideranças.',
      'Controle estratégico de Marketing Digital com atribuição multicanal, cálculo de CAC (Custo de Aquisição de Clientes), LTV (Lifetime Value), ROAS de campanhas e análise de funil de marketing.',
      'Gestão corporativa de Procurement e Strategic Sourcing com matriz de risco de fornecedores, saving acumulado por categoria, compliance de contratos e análise de spend management.',
      'Análise de viabilidade econômica de projetos (VPL, TIR e Payback), com simulação de cenários otimistas e pessimistas, análise de sensibilidade e cronograma de desembolso financeiro.',
      'Gestão de Key Account Management (Contas Estratégicas) com mapeamento de stakeholders, matriz de relacionamento, plano de ação anual (account plan) e histórico de negociações complexas.',
      'Controle avançado de frota corporativa com cálculo de TCO (Total Cost of Ownership), depreciação, custo por quilômetro rodado, gestão de multas e agendamento de manutenções preventivas.',
      'Sistema de avaliação de desempenho 360 graus com matriz Nine Box, plano de desenvolvimento individual (PDI), calibração de resultados e correlação com política de remuneração variável.',
      'Dashboard de Business Intelligence (BI) para e-commerce com análise de cohort, abandono de carrinho, ticket médio, produtos mais vendidos em cross-sell e mapa de calor de vendas regionais.',
      'Gestão de contratos de facilities e serviços terceirizados com acompanhamento de SLAs (Service Level Agreements), penalidades por descumprimento, reajustes inflacionários e datas de renovação.'
    ];

    const eliteCategorias = [1, 2, 3, 4, 5, 6]; 
    const elitePrefixes = ['Sistema Corporativo', 'Dashboard Executivo', 'Gestão Estratégica', 'Painel Diretoria', 'Controle Master', 'Análise Premium', 'Plataforma Integrada', 'BI Avançado'];
    
    const elite = Array.from({length: 40}, (_, i) => {
      const prefix = elitePrefixes[i % elitePrefixes.length];
      const cat = eliteCategorias[i % eliteCategorias.length];
      const descIndex = i % eliteDescriptions.length;
      
      let catName = '';
      if (cat === 1) catName = 'Financeiro 360º';
      else if (cat === 2) catName = 'Vendas & CRM';
      else if (cat === 3) catName = 'Supply Chain';
      else if (cat === 4) catName = 'Capital Humano';
      else if (cat === 5) catName = 'Marketing Analytics';
      else if (cat === 6) catName = 'Procurement';
      
      return {
        name: `${prefix} de ${catName} ${Math.floor(i/8) + 1}`,
        slug: `elite-${cat}-${i + 1}`,
        desc: eliteDescriptions[descIndex],
        cat: cat,
        plan: 'elite',
        cols: ['ID Único', 'Métrica Estratégica', 'Responsável (C-Level)', 'Centro de Custo', 'Meta Trimestral', 'Realizado YTD (R$)', 'Projeção EOY (R$)', 'Variação vs Meta (%)', 'Status Executivo', 'Risco Associado', 'Plano de Ação', 'Impacto Financeiro', 'Parecer da Diretoria'],
        sample: [[`ELT-2026-${String(i+1).padStart(3, '0')}`, 'Aumento de Receita Recorrente', 'Diretor Comercial', 'Operações', 'R$ 5.000.000', 'R$ 3.500.000', 'R$ 5.200.000', '+4.0%', 'Superando Expectativas', 'Baixo', 'Manter estratégia de Upsell', 'Alto Positivo', 'Aprovado para expansão de bônus']]
      };
    });

    const allTemplates = [...free, ...pro, ...elite];
    
    for (let i = 0; i < allTemplates.length; i++) {
      const t = allTemplates[i];
      
      let cor;
      if (t.plan === 'free') {
        cor = coresFree[i % coresFree.length];
      } else if (t.plan === 'pro') {
        cor = coresPro[i % coresPro.length];
      } else {
        cor = coresElite[i % coresElite.length];
      }
      
      await sql`
        INSERT INTO "templates" ("name", "slug", "description", "categoryId", "plan", "columns", "sampleRows", "accentColor", "headerColor", "createdAt", "updatedAt")
        VALUES (
          ${t.name},
          ${t.slug},
          ${t.desc},
          ${t.cat},
          ${t.plan},
          ${JSON.stringify(t.cols)},
          ${JSON.stringify(t.sample)},
          ${cor.a},
          ${cor.h},
          now(),
          now()
        )
      `;
    }
    
    console.log('✅ 70 templates PERFEITAMENTE DESCRITOS E PERSONALIZADOS criados!');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
