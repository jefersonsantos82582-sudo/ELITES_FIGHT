import postgres from "postgres";

const sql = postgres('postgresql://elites_fight_user:70RZTnOuDB685JVomjJ3oTJrwrbkjspm@dpg-d9e33cbbc2fs73f52vsg-a.oregon-postgres.render.com/elites_fight', {
  ssl: 'require'
});

(async () => {
  try {
    const columns = await sql`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'templates'
    `;
    console.log('Colunas da tabela templates:', columns);
    await sql.end();
  } catch (error) {
    console.error('Erro:', error instanceof Error ? error.message : String(error));
  }
})();
