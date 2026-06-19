# Checklist de homologação

## Acesso

- [ ] Login correto funciona.
- [ ] Senha incorreta é recusada.
- [ ] Muitas tentativas são temporariamente bloqueadas.
- [ ] Logout encerra a sessão.
- [ ] Sessão expirada retorna para o login.
- [ ] Link de primeiro acesso expira.
- [ ] Link de primeiro acesso não funciona duas vezes.
- [ ] Nova senha exige dez caracteres, maiúscula, minúscula e número.

## Perfis

- [ ] Administrador visualiza e gerencia tudo.
- [ ] Consultor visualiza todas as unidades, mas não cadastra usuários.
- [ ] Contabilidade acessa somente documentos autorizados.
- [ ] Franqueado visualiza apenas sua própria unidade.
- [ ] Franqueado não consegue abrir arquivo de outra unidade.
- [ ] Alterar o HTML ou chamar uma API manualmente não contorna as permissões.

## Usuários

- [ ] Novo usuário é salvo.
- [ ] Convite gera link, não envia senha em texto.
- [ ] “Copiar 1º acesso” copia login e link individual.
- [ ] Usuário desativado não consegue entrar.
- [ ] Mudança de perfil altera imediatamente as permissões.

## Arquivos

- [ ] PDF é aceito.
- [ ] JPEG, PNG e WebP são aceitos.
- [ ] Executáveis e tipos desconhecidos são recusados.
- [ ] Arquivo acima do limite é recusado.
- [ ] Documento pode ser baixado apenas após login.
- [ ] Arquivos não aparecem como URLs públicas do bucket.

## Operação

- [ ] Checklist é salvo após atualizar a página.
- [ ] Ao atingir 100%, Administrador e Consultor visualizam o botão de conclusão.
- [ ] Concluir a implantação remove a unidade dos dashboards e mantém o histórico.
- [ ] Unidade arquivada não aceita novas alterações no checklist.
- [ ] Duas pessoas conseguem trabalhar sem perda aparente de dados.
- [ ] Aprovação e recusa de documento funcionam.
- [ ] O OK documental final só aparece quando todos os documentos estão aprovados.
- [ ] Administrador e Contabilidade registram aprovações finais independentes.
- [ ] Após os dois OKs, a unidade sai da fila ativa e aparece no arquivo documental.
- [ ] Notificações chegam aos perfis corretos.
- [ ] O cálculo de 70% permanece correto.
- [ ] Exportações não incluem hash, senha ou token.
- [ ] `/data/app-state.json` retorna acesso negado.
- [ ] `/.env` retorna acesso negado.
- [ ] `/health` retorna `status: ok`.

## Infraestrutura

- [ ] PostgreSQL está ativo.
- [ ] Bucket está privado.
- [ ] Backup diário está configurado.
- [ ] Uma restauração foi testada.
- [ ] Alertas de indisponibilidade estão configurados.
- [ ] Contas da hospedagem, GitHub, domínio e e-mail possuem MFA.

## Aprovação

- [ ] Responsável de implantação aprovou.
- [ ] Contabilidade aprovou.
- [ ] Consultoria aprovou.
- [ ] Um franqueado piloto aprovou.
- [ ] Responsável por segurança/LGPD aprovou.
