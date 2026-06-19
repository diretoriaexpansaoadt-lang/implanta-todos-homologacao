# Guia de pré-produção

## Arquitetura

- Um serviço Node.js entrega o frontend e as APIs.
- PostgreSQL guarda o estado e o histórico de auditoria.
- S3 ou Cloudflare R2 guarda documentos e imagens.
- SendGrid envia convites e alertas.
- O domínio de homologação deve ser separado do domínio oficial.

Sugestão:

- Homologação: `implanta-hml.audicaodetodos.com.br`
- Produção futura: `implanta.audicaodetodos.com.br`

## 1. Repositório

1. Crie um repositório privado no GitHub.
2. Não envie `.env`, `data`, `private-uploads`, backups ou dados reais.
3. Proteja a branch principal.
4. Ative MFA para todos que possuem acesso.
5. Use uma branch de homologação ou deploy manual enquanto os fluxos estiverem
   sendo avaliados pela equipe.

## 2. Render

1. Crie um novo Blueprint usando `render.yaml`.
2. Selecione o repositório privado.
3. Mantenha `autoDeploy: false` durante a homologação.
4. Preencha as variáveis que aparecem como `sync: false`.
5. Configure `PUBLIC_APP_URL` e `ALLOWED_ORIGIN` com a URL exata da homologação.
6. Confira `/health` após o primeiro deploy.

O serviço não depende de disco persistente quando PostgreSQL e S3/R2 estiverem
configurados.

## Homologação local com Docker

Para subir app, PostgreSQL e armazenamento MinIO em conjunto:

```powershell
docker compose -f docker-compose.homologacao.yml up --build
```

Antes de usar fora de uma máquina isolada, troque todas as senhas e segredos do
arquivo. O console do MinIO ficará em `http://127.0.0.1:9001` e o app em
`http://127.0.0.1:8765`.

## 3. Banco

1. Crie um PostgreSQL exclusivo para homologação.
2. Não reutilize o banco futuro de produção.
3. Guarde `DATABASE_URL` somente no painel do servidor.
4. Execute `npm run migrate:postgres` uma única vez se houver dados JSON a importar.
5. Verifique a existência das tabelas `app_state` e `audit_log`.
6. Configure backup diário e retenção mínima de sete dias.

## 4. Arquivos

1. Crie um bucket privado exclusivo para homologação.
2. Não habilite acesso público.
3. Crie credenciais limitadas apenas ao bucket.
4. Ative versionamento.
5. Ative criptografia no provedor.
6. Configure política de retenção.
7. Teste envio e download com cada perfil.

## 5. Primeiro administrador

Configure:

```env
BOOTSTRAP_ADMIN_EMAIL=administrador@audicaodetodos.com.br
BOOTSTRAP_ADMIN_PASSWORD=uma-senha-temporaria-forte
```

Esse bootstrap só é aplicado quando o usuário ainda não possui hash de senha.
Depois do primeiro login, gere um novo primeiro acesso para o administrador ou
troque a senha. Em seguida, substitua `BOOTSTRAP_ADMIN_PASSWORD` no ambiente por
outro valor longo e aleatório; a variável continua obrigatória, mas não altera
uma senha que já foi protegida.

## 6. E-mail

1. Autentique o domínio no SendGrid.
2. Configure SPF, DKIM e DMARC.
3. Use um remetente de homologação identificável.
4. Envie convites apenas para a equipe de teste.
5. Verifique caixa de entrada, spam e expiração do link.

## 7. Dados de teste

- Não use documentos reais de franqueados na homologação inicial.
- Use nomes e CNPJs fictícios.
- Se dados reais forem indispensáveis, limite o acesso e formalize o uso.
- Exclua os dados de homologação antes da carga oficial.

## 8. Promoção para produção

A versão só deve ir para produção após:

- Aprovação dos fluxos pela equipe;
- Testes por perfil concluídos;
- Política de privacidade e retenção aprovadas;
- Backup e restauração testados;
- Domínio e e-mail oficiais configurados;
- Correções de homologação incorporadas;
- Plano de suporte e responsável operacional definidos.
