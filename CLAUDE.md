# CLAUDE.md

Instruções para agentes trabalhando neste repositório.

## Projeto

**Plataforma Jurídico-Mineral** — dashboard PWA do escritório Medeiros Assessoria
Jurídica, especializado em Direito Minerário e defesa de receitas da ANM (CFEM,
TAH, Taxa de Vistoria e multas). Inclui catálogo de legislação mineral, súmulas
ANM, jurisprudência STF/STJ, calculadoras, checklists, peças processuais e um
assistente jurídico (chat com LLM: Claude / GPT / Gemini configuráveis).

- **Repositório GitHub:** `medeiros-web/anmlegis-dashboard` (privado)
- **Domínio:** ver projeto Vercel `anmlegis-dashboard` (link exato em `vercel ls` /
  painel Vercel — pode haver domínio customizado configurado à parte)
- Não confundir com o projeto irmão `medeiros-web/anm` (React/Vite, em
  `anm.chatatender.ia.br`, migração Supabase→Neon) — são plataformas distintas.

## Stack

- **Frontend:** HTML/CSS/JS puro em um único `index.html` (~4900 linhas) — sem
  build step, sem framework. Estado de navegação é feito via `show(id)`
  alternando `.section.active`; não há roteamento por URL/hash.
- **Backend:** Node.js + Express (`server.js`) servindo o estático e carregando
  os handlers de `api/*.js` (mesmo código roda como função serverless na Vercel
  via `vercel.json` → rotas explícitas para cada `/api/<nome>`).
- **Banco:** Neon Postgres (usado por `api/settings.js`, `api/users.js`,
  `api/login.js` — configurações de LLM e autenticação admin).
- **PWA:** `manifest.json` + `sw.js` + ícones em `icons/` — funciona offline.
- **Deploy:** Vercel (projeto ligado ao repo) e/ou Docker + Portainer
  (`Dockerfile`, `docker-compose.yml`).

## Comandos

```bash
npm install
npm start           # node server.js — http://localhost:3000
```

Não há build, lint ou test script configurado neste projeto.

## Convenções

- **Tudo em um arquivo.** Novas seções de conteúdo (ex.: uma nova página do
  dashboard) entram como `<div id="sec-<id>" class="section">` dentro do mesmo
  `index.html`, seguindo o padrão das seções existentes (`sec-legmineral`,
  `sec-cfem`, etc.). Registrar sempre em **três lugares** no `<script>` final:
  1. array `sections` (habilita o toggle)
  2. objeto `titles` (título exibido no topo/mobile)
  3. array de busca global (`{ section, title, keywords }`, perto de
     `pareceres`/`disponibilidade`) — sem isso a busca (🔍) não encontra a seção
- Navegação: item na sidebar (`#sidebar-nav`, `onclick="show('id')"`) e,
  opcionalmente, botão em `#bottom-nav` (mobile) — o bottom-nav tem só 5 slots,
  evite adicionar novos itens ali; prefira `.nav-item-highlight` na sidebar.
- **Padrões visuais reutilizáveis** (não recriar do zero): `.hero` (banner de
  seção), `.leg-stat-row`/`.leg-stat` (cards de estatística), `.leg-layout` +
  `.leg-sidebar`/`.leg-sb-item` (sidebar de categorias) + `.leg-filters` (botões
  de filtro mobile), `.leg-card` (card de conteúdo), `.badge-*`/`.pill` (tags).
  Variáveis de tema em `:root`/`[data-theme="light"]` no topo do `<style>`.
- **APIs em `api/*.js`** exportam `module.exports = async function handler(req,
  res) {...}` (convenção dupla Vercel serverless / Express via `wrap()` em
  `server.js`). Sempre setar CORS (`Access-Control-Allow-Origin: *`) e responder
  `OPTIONS` — e registrar a rota em **dois lugares**: `server.js` (`app.get/post`)
  e `vercel.json` (`routes`, antes do catch-all `/(.*)"→"/index.html"`).
- Dataset estático embutido no `index.html` (ex.: `DISP_DATA`) deve ficar
  **idêntico** ao usado pela API correspondente em `api/*.js` — são duplicados
  intencionalmente (offline-first no front, API pública no back); ao editar um,
  editar o outro.
- Segredos (chaves LLM, `DATABASE_URL`, `JWT_SECRET`) via variáveis de ambiente
  no Portainer/Vercel — nunca hardcode no `index.html` ou nos `api/*.js`.

## Seções principais do index.html (linha aproximada pode mudar)

- `sec-home`, `sec-cfem`, `sec-tah`, `sec-multas`, `sec-vistoria` — receitas ANM
- `sec-sumulas`, `sec-legislacao`, `sec-jurisprudencia` — normas e precedentes
- `sec-legmineral` — catálogo de legislação mineral (cards por norma)
- `sec-disponibilidade` — quadro de situações × regime (Livre/Disponibilidade)
  ao longo do tempo, com consulta por data e API de integração
  (`GET /api/disponibilidade`)
- `sec-calculos`, `sec-estrategia`, `sec-checklist`, `sec-antipadroes`,
  `sec-pecas`, `sec-pareceres` — ferramentas operacionais
- `sec-config`, `sec-admin` — configuração de LLM e gestão de usuários (admin)
- Chat flutuante (`#chat-fab`/`#chat-panel`) — assistente jurídico multi-provider
  (`api/chat.js`)

## Deploy

- `vercel.json` usa `"routes"` (formato legado v2) com uma entrada explícita por
  função de API e catch-all para `index.html` — ao adicionar uma nova API,
  adicionar a rota **antes** do catch-all.
- Alternativa Docker: `Dockerfile` + `docker-compose.yml` para Portainer, na
  mesma infra dos demais stacks do escritório (`portainer.chatatender.ia.br`).
