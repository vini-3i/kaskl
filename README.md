# Kaskl Vendas — atualização admin reescrita

Projeto fullstack React + Node/Express + Supabase com painel admin refeito.

## O que foi refeito nesta versão

- Cadastro de produto reescrito do zero com formulário em etapas: Básico, Oferta, Conteúdo e Publicação.
- Apenas `nome`, `categoria` e `link de checkout` são obrigatórios.
- Slug, imagem, preços, descrição curta, descrição completa, badge, destaque e agendamento são opcionais.
- Prévia ao vivo do card do produto antes de publicar.
- Checklist de publicação para evitar erro de preenchimento.
- Botão para preencher dados pelo link de checkout Kaiross.
- Mensagens de erro mais claras no frontend e backend.
- Validação Zod mais flexível para preços com vírgula, descrições longas e agendamento.
- UI/UX melhorada para PC e mobile.
- CSS atualizado com inputs responsivos, foco visível e layout mais limpo.
- Build validado com sucesso.
- Auditoria de segurança: Service Role permanece somente no backend; não há uso de `dangerouslySetInnerHTML`, `eval` ou chave Supabase no frontend.

## Rodar localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Acessos:

```txt
Frontend: http://localhost:3000
Backend: http://localhost:3001
Admin: http://localhost:3000/admin/login
```

## Supabase

Execute o SQL em:

```txt
database/supabase.sql
```

Depois configure no `.env`:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=troque_por_um_segredo_forte
CLIENT_ORIGIN=http://localhost:3000
PORT=3001
```

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend.
