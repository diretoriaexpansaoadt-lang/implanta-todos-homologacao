# Implanta TODOS

Plataforma de acompanhamento da implantação das franquias Audição de TODOS.

Esta pasta contém a versão de pré-produção/homologação. Ela mantém a interface
atual, mas substitui o login local por autenticação no servidor, protege as APIs,
remove senhas das respostas e permite PostgreSQL e armazenamento S3/R2.

## Rodar localmente

1. Copie `.env.example` para `.env`.
2. Defina pelo menos `SESSION_SECRET`.
3. Execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

4. Acesse a porta configurada em `.env`. Nesta entrega local: `http://127.0.0.1:8877/`.

No modo local, sem `DATABASE_URL`, o estado continua em `data/app-state.json`.
Novos arquivos ficam em `private-uploads`. Essas pastas não são publicadas pelo
servidor web.

## Credenciais locais antigas

Na primeira inicialização, os usuários `@local` são migrados para hashes:

- `admin@local` / `admin123`
- `consultor@local` / `consultor123`
- `contabilidade@local` / `contabilidade123`
- `franqueado@local` / `franqueado123`

Use essas contas somente em desenvolvimento. Na homologação, configure
`BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_PASSWORD` e altere a senha pelo fluxo
de primeiro acesso.

## Recursos de pré-produção

- Sessão assinada em cookie `HttpOnly`;
- Proteção CSRF;
- Senhas protegidas com `scrypt`;
- Limite de tentativas de login;
- Token de primeiro acesso com expiração e uso único;
- Encerramento e arquivamento da implantação após 100% do checklist;
- Aprovação documental final independente por Administrador e Contabilidade;
- Histórico de implantações e documentos concluídos fora dos dashboards operacionais;
- Autorização das APIs por perfil e unidade;
- Arquivos internos, `.env` e pasta `data` bloqueados;
- Uploads privados locais ou em S3/Cloudflare R2;
- PostgreSQL opcional por `DATABASE_URL`;
- Log de auditoria;
- Cabeçalhos de segurança e CSP;
- Healthcheck em `/health`;
- Dockerfile e Blueprint do Render;
- Scripts de migração e backup.

## PostgreSQL

Instale as dependências e configure:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
```

Para importar o JSON existente:

```powershell
npm install
npm run migrate:postgres
```

O servidor cria automaticamente as tabelas necessárias. O esquema também está em
`sql/schema.sql`.

## Armazenamento de arquivos

Desenvolvimento:

```env
STORAGE_DRIVER=local
UPLOAD_DIR=./private-uploads
```

Homologação:

```env
STORAGE_DRIVER=s3
S3_BUCKET=...
S3_ENDPOINT=...
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

O endpoint pode ser Amazon S3, Cloudflare R2 ou outro serviço compatível.

## Publicação

Consulte:

- `docs/PREPRODUCAO.md`
- `docs/CHECKLIST-HOMOLOGACAO.md`
- `docs/SEGURANCA.md`

O arquivo `render.yaml` cria o serviço e o PostgreSQL. Segredos marcados como
`sync: false` devem ser preenchidos no painel da hospedagem.
