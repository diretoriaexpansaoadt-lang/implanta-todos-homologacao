# Segurança e limites da homologação

## Controles implementados

- Senhas não são devolvidas ao frontend.
- As senhas são derivadas com `scrypt` e salt aleatório.
- A sessão é assinada e armazenada em cookie `HttpOnly`.
- Operações de escrita exigem token CSRF.
- As APIs verificam perfil e unidade.
- O servidor publica apenas os arquivos estáticos explicitamente permitidos.
- Uploads são privados e exigem sessão para download.
- Tipos e tamanhos de upload são limitados.
- Ações sensíveis são gravadas em auditoria.
- Cabeçalhos CSP, HSTS, frame protection e `nosniff` estão habilitados.

## Decisões para homologação

O estado operacional ainda é armazenado como um documento JSONB único no
PostgreSQL. Isso preserva o comportamento da interface e reduz o risco de
reescrever as regras antes do feedback da equipe.

Antes de uma escala grande, recomenda-se normalizar as entidades em tabelas
separadas e trocar o salvamento do estado completo por operações menores e
transacionais.

## Pendências antes da produção oficial

- Revisão jurídica e LGPD;
- Política formal de retenção e exclusão;
- Recuperação de senha por e-mail;
- MFA para administradores dentro do app, se exigido;
- Antivírus ou varredura de documentos;
- Teste de invasão;
- Monitoramento centralizado de erros;
- Normalização do banco para alta concorrência;
- Teste de carga;
- Plano de resposta a incidentes.

## Incidente

Em caso de suspeita:

1. Desative o serviço ou bloqueie o usuário afetado.
2. Troque `SESSION_SECRET` para invalidar todas as sessões.
3. Revogue chaves do banco, bucket, SendGrid e WhatsApp.
4. Preserve logs e horários.
5. Restaure de backup se necessário.
6. Avalie obrigação de comunicação conforme a LGPD.
