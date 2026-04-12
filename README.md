# Portal Dashboard

Portal multi-tenant white-label. Cada tenant acessa pelo próprio subdomínio; administração da plataforma fica em `admin.*`.

## Stack

- **Front**: Vite + React 18 + TypeScript + TailwindCSS + React Router (deploy na Vercel)
- **Back**: Supabase (Postgres + Auth + Edge Functions)
- **Multi-tenant**: base única com RLS por `tenant_id`

## Estrutura

```
portal-dashboard/
├── src/
│   ├── lib/            # supabase client, tenant resolver
│   ├── components/     # ProtectedRoute
│   ├── pages/          # TenantLogin, TenantDashboard, AdminLogin, AdminDashboard, Landing
│   ├── App.tsx         # roteamento por tipo de host (admin | tenant | root)
│   └── main.tsx
├── supabase/
│   ├── migrations/     # SQL versionado (tenants, profiles, RLS)
│   └── functions/      # Edge functions (Deno)
├── .github/workflows/  # CI
└── vite.config.ts
```

## Setup local

### 1. Instalar dependências

```powershell
npm install
```

### 2. Subir Supabase local (Docker necessário)

```powershell
supabase init        # só na 1ª vez — cria supabase/config.toml
supabase start       # sobe Postgres, Auth, Storage, Studio em containers
```

Ao final, copie o **anon key** impresso e coloque em `.env`:

```powershell
Copy-Item .env.example .env
# edite .env e preencha VITE_SUPABASE_ANON_KEY
```

### 3. Aplicar migrations

```powershell
supabase db reset    # aplica migrations do zero
```

### 4. Rodar o front

```powershell
npm run dev
```

Acesse:
- `http://localhost:5173` → landing
- `http://acme.localhost:5173` → login do tenant `acme`
- `http://admin.localhost:5173` → login admin da plataforma

> Em Windows, `*.localhost` já resolve para 127.0.0.1 automaticamente nos browsers modernos (Chrome/Edge/Firefox). Nenhuma edição de `hosts` necessária.

### 5. Criar um admin da plataforma

No Supabase Studio (`http://127.0.0.1:54323`):

1. Authentication → Add user (email/senha)
2. SQL Editor:
   ```sql
   update public.profiles
     set role = 'platform_admin'
     where id = (select id from auth.users where email = 'voce@exemplo.com');
   ```
3. Para que o middleware leia o role do JWT, também setar em `app_metadata`:
   ```sql
   update auth.users
     set raw_app_meta_data = jsonb_set(
       coalesce(raw_app_meta_data, '{}'::jsonb),
       '{role}', '"platform_admin"'
     )
     where email = 'voce@exemplo.com';
   ```

### 6. Criar um tenant + usuário

```sql
insert into public.tenants (slug, name) values ('acme', 'Acme Corp');

-- depois de criar o usuário via Authentication:
update public.profiles
  set tenant_id = (select id from public.tenants where slug = 'acme'),
      role = 'tenant_admin'
  where id = (select id from auth.users where email = 'user@acme.com');
```

## Deploy

### Front na Vercel

```powershell
vercel link
vercel --prod
```

No painel da Vercel, adicione:
- `VITE_SUPABASE_URL` — URL do projeto Supabase cloud
- `VITE_SUPABASE_ANON_KEY` — anon key do projeto Supabase cloud

Configure um **wildcard domain** (`*.seudominio.com`) para o multi-tenant funcionar.

### Supabase cloud

```powershell
supabase link --project-ref <ref>
supabase db push          # sobe migrations
supabase functions deploy hello
```

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Build de produção |
| `npm run typecheck` | Type check sem emitir |
| `npm run db:start` | `supabase start` |
| `npm run db:reset` | Aplica migrations do zero |
| `npm run db:push` | Aplica migrations no projeto linkado |
| `npm run functions:serve` | Serve edge functions localmente |
