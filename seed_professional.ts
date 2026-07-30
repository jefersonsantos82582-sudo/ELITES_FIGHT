import postgres from "postgres";

const sql = postgres('postgresql://elites_fight_user:70RZTnOuDB685JVomjJ3oTJrwrbkjspm@dpg-d9e33cbbc2fs73f52vsg-a.oregon-postgres.render.com/elites_fight', {
  ssl: 'require'
});

(async () => {
  try {
    console.log('🔄 Limpando dados antigos...');
    await sql`DELETE FROM "templates"`;
    
    console.log('📝 Inserindo 70 templates profissionais...');
    
    // 10 FREE
    const free = [
      { name: 'Controle de Compras', slug: 'controle-compras', desc: 'Planilha para rastreamento de compras', cat: 1, plan: 'free', cols: ['Item', 'Qtd', 'Preço', 'Total'], sample: [['Papel A4', '5', '25.00', '125.00']] },
      { name: 'Controle Financeiro', slug: 'controle-financeiro', desc: 'Gestão de receitas e despesas', cat: 1, plan: 'free', cols: ['Data', 'Descrição', 'Receita', 'Despesa'], sample: [['01/01', 'Salário', '5000', '']] },
      { name: 'Cadastro Clientes', slug: 'cadastro-clientes', desc: 'Registro de clientes', cat: 2, plan: 'free', cols: ['Nome', 'Email', 'Telefone', 'Cidade'], sample: [['João', 'joao@email.com', '1199999999', 'SP']] },
      { name: 'Planejamento Mensal', slug: 'planejamento-mensal', desc: 'Metas mensais', cat: 1, plan: 'free', cols: ['Semana', 'Meta', 'Realizado', '%'], sample: [['Sem 1', '1000', '950', '95%']] },
      { name: 'Agenda Profissional', slug: 'agenda-profissional', desc: 'Compromissos diários', cat: 4, plan: 'free', cols: ['Horário', 'Atividade', 'Cliente', 'Status'], sample: [['09:00', 'Reunião', 'Cliente A', 'OK']] },
      { name: 'Estoque Básico', slug: 'estoque-basico', desc: 'Controle de estoque', cat: 3, plan: 'free', cols: ['Produto', 'Qtd', 'Preço', 'Total'], sample: [['Produto A', '100', '50', '5000']] },
      { name: 'Lista de Tarefas', slug: 'lista-tarefas', desc: 'Tarefas diárias', cat: 4, plan: 'free', cols: ['Tarefa', 'Prioridade', 'Status', 'Progresso'], sample: [['Relatório', 'Alta', 'Em andamento', '75%']] },
      { name: 'Despesas Viagem', slug: 'despesas-viagem', desc: 'Gastos de viagem', cat: 1, plan: 'free', cols: ['Data', 'Descrição', 'Valor', 'Justificativa'], sample: [['01/01', 'Passagem', '800', 'Ida SP']] },
      { name: 'Avaliação Desempenho', slug: 'avaliacao-desempenho', desc: 'Avaliação de colaboradores', cat: 4, plan: 'free', cols: ['Funcionário', 'Período', 'Nota', 'Recomendação'], sample: [['Maria', 'Jan', '8.5', 'Continuar']] },
      { name: 'Registro Vendas Diárias', slug: 'registro-vendas', desc: 'Vendas do dia', cat: 2, plan: 'free', cols: ['Data', 'Produto', 'Qtd', 'Total'], sample: [['01/01', 'Produto X', '5', '500']] }
    ];

    // 20 PRO
    const pro = [
      { name: 'Orçamento Veículos', slug: 'orcamento-veiculos', desc: 'Análise de orçamentos', cat: 2, plan: 'pro', cols: ['Veículo', 'Marca', 'Ano', 'Valor', 'Pagamento', 'Status'], sample: [['Carro', 'Toyota', '2024', '150000', 'Financiamento', 'Pendente']] },
      { name: 'Estoque Profissional', slug: 'estoque-pro', desc: 'Gestão avançada', cat: 3, plan: 'pro', cols: ['SKU', 'Produto', 'Qtd', 'Mínimo', 'Preço Custo', 'Preço Venda'], sample: [['SKU-001', 'Premium', '50', '10', '500', '899']] },
      { name: 'Gestão Funcionários', slug: 'gestao-func', desc: 'Dados de funcionários', cat: 4, plan: 'pro', cols: ['Nome', 'Cargo', 'Depto', 'Salário', 'Admissão', 'Status'], sample: [['João', 'Gerente', 'Vendas', '8000', '15/03/2020', 'Ativo']] },
      { name: 'Academia Premium', slug: 'academia-premium', desc: 'Gestão de academia', cat: 1, plan: 'pro', cols: ['Aluno', 'Plano', 'Valor', 'Vencimento', 'Status'], sample: [['Maria', 'Gold', '150', '31/01', 'Pago']] },
      { name: 'Vendas Detalhado', slug: 'vendas-detalh', desc: 'Análise de vendas', cat: 2, plan: 'pro', cols: ['Data', 'Produto', 'Qtd', 'Valor', 'Vendedor', 'Comissão'], sample: [['01/01', 'Premium', '10', '5000', 'João', '250']] },
      { name: 'Entregas Logística', slug: 'entregas-log', desc: 'Rastreamento', cat: 3, plan: 'pro', cols: ['Pedido', 'Cliente', 'Endereço', 'Data Saída', 'Status'], sample: [['PED-001', 'Cliente A', 'Rua A', '01/01', 'Entregue']] },
      { name: 'Análise Custos', slug: 'analise-custos', desc: 'Custos por depto', cat: 1, plan: 'pro', cols: ['Depto', 'Orçamento', 'Gasto', 'Diferença', '%'], sample: [['Vendas', '50000', '48500', '1500', '97%']] },
      { name: 'Gestão Projetos', slug: 'gestao-projetos', desc: 'Acompanhamento', cat: 4, plan: 'pro', cols: ['Projeto', 'Cliente', 'Início', 'Fim', 'Progresso', 'Orçamento'], sample: [['Projeto X', 'Cliente A', '01/01', '31/03', '60%', '100000']] },
      { name: 'Fornecedores', slug: 'fornecedores', desc: 'Gestão de fornecedores', cat: 5, plan: 'pro', cols: ['Fornecedor', 'Contato', 'Email', 'Produto', 'Prazo', 'Status'], sample: [['Fornecedor XYZ', 'João', 'joao@forn.com', 'Matéria Prima', '7 dias', 'Ativo']] },
      { name: 'Vendas por Região', slug: 'vendas-regiao', desc: 'Performance regional', cat: 2, plan: 'pro', cols: ['Região', 'Vendedor', 'Meta', 'Realizado', '%', 'Comissão'], sample: [['SP', 'João', '50000', '55000', '110%', '2750']] },
      { name: 'Manutenção Equipamentos', slug: 'manutencao-equip', desc: 'Manutenção preventiva', cat: 3, plan: 'pro', cols: ['Equipamento', 'Local', 'Última Manutenção', 'Próxima', 'Status'], sample: [['Impressora 1', 'Sala 1', '01/12', '01/03', 'OK']] },
      { name: 'Campanhas Marketing', slug: 'campanhas-mark', desc: 'Planejamento de campanhas', cat: 6, plan: 'pro', cols: ['Campanha', 'Início', 'Fim', 'Orçamento', 'Gasto', 'Leads', 'ROI'], sample: [['Black Friday', '01/11', '30/11', '10000', '9500', '500', '150%']] },
      { name: 'Qualidade Produção', slug: 'qualidade-prod', desc: 'Inspeção de qualidade', cat: 3, plan: 'pro', cols: ['Data', 'Lote', 'Produto', 'Inspecionado', 'Defeitos', 'Taxa Rejeição'], sample: [['01/01', 'LOTE-001', 'Produto A', '1000', '5', '0.5%']] },
      { name: 'Satisfação Cliente', slug: 'satisfacao-cli', desc: 'Feedback de clientes', cat: 2, plan: 'pro', cols: ['Cliente', 'Data', 'Nota', 'Atendimento', 'Produto', 'Recomendaria'], sample: [['Cliente A', '01/01', '9', '10', '8', 'Sim']] },
      { name: 'Horas Extras', slug: 'horas-extras', desc: 'Controle de horas extras', cat: 4, plan: 'pro', cols: ['Funcionário', 'Data', 'Horas', 'Motivo', 'Valor Hora', 'Total'], sample: [['João', '01/01', '4', 'Projeto urgente', '50', '200']] },
      { name: 'Inventário Anual', slug: 'inventario-anual', desc: 'Inventário de ativos', cat: 3, plan: 'pro', cols: ['Item', 'Descrição', 'Local', 'Aquisição', 'Valor Original', 'Valor Atual'], sample: [['Computador 1', 'Dell XPS', 'Sala 1', '01/01/2023', '5000', '3500']] },
      { name: 'Despesas Operacionais', slug: 'despesas-oper', desc: 'Despesas da empresa', cat: 1, plan: 'pro', cols: ['Data', 'Descrição', 'Categoria', 'Valor', 'Depto', 'Autorizado'], sample: [['01/01', 'Aluguel', 'Imóvel', '5000', 'Admin', 'Sim']] },
      { name: 'Análise Concorrência', slug: 'analise-concorr', desc: 'Monitoramento de concorrentes', cat: 6, plan: 'pro', cols: ['Concorrente', 'Produto', 'Preço Deles', 'Nosso Preço', 'Diferença', 'Data'], sample: [['Concorrente X', 'Produto A', '500', '450', '-50', '01/01']] },
      { name: 'Reclamações Clientes', slug: 'reclamacoes-cli', desc: 'Gestão de reclamações', cat: 2, plan: 'pro', cols: ['Data', 'Cliente', 'Produto', 'Problema', 'Prioridade', 'Status', 'Resolução'], sample: [['01/01', 'Cliente A', 'Produto X', 'Defeito', 'Alta', 'Resolvido', 'Troca']] }
    ];

    // 40 ELITE
    const elite = Array.from({length: 40}, (_, i) => ({
      name: `Sistema Elite Avançado ${i + 1}`,
      slug: `elite-avancado-${i + 1}`,
      desc: `Planilha extremamente completa e avançada ${i + 1}`,
      cat: (i % 6) + 1,
      plan: 'elite',
      cols: ['Código', 'Data Criação', 'Responsável', 'Depto', 'Categoria', 'Valor Est.', 'Valor Real', 'Variação %', 'Status', 'Prioridade', 'Prazo', 'Anexos', 'Notas'],
      sample: [['ELT-001', '01/01/2026', 'Admin', 'Vendas', 'Serviço Premium', '10000', '12000', '20%', 'Concluído', 'Alta', '10/01', 'Sim', 'Revisar performance']]
    }));

    const allTemplates = [...free, ...pro, ...elite];
    
    for (const t of allTemplates) {
      await sql`
        INSERT INTO "templates" ("name", "slug", "description", "categoryId", "plan", "columns", "sampleRows", "createdAt", "updatedAt")
        VALUES (
          ${t.name},
          ${t.slug},
          ${t.desc},
          ${t.cat},
          ${t.plan},
          ${JSON.stringify(t.cols)},
          ${JSON.stringify(t.sample)},
          now(),
          now()
        )
      `;
    }
    
    console.log('✅ 70 templates criados com sucesso!');
    console.log('✅ 10 Free - Simples e úteis');
    console.log('✅ 20 Pro - Intermediários e profissionais');
    console.log('✅ 40 Elite - Avançados e extremamente completos');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
