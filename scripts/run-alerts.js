const base = process.env.PUBLIC_APP_URL || `http://127.0.0.1:${process.env.PORT || 8765}`;

console.error(
  `A execução manual de alertas agora exige uma sessão administrativa por segurança.\n` +
  `Use o botão da área administrativa ou uma rotina autenticada apontando para ${base}/api/alerts/run.`
);
process.exit(1);
