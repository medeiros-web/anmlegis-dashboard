# MEMORY.md

Log de decisões e contexto do projeto — não é instrução de uso (isso fica no
`CLAUDE.md`), é histórico do "porquê" para quem (humano ou agente) voltar aqui
depois. Adicionar entradas novas no topo, mais recentes primeiro.

---

## 2026-07-14 — Quadro de Disponibilidade (novo)

**O que:** Adicionada a seção `sec-disponibilidade` — quadro com as 37
situações minerárias (pesquisa, lavra, licenciamento, lavra garimpeira,
registro de extração, procedimento de disponibilidade) e o regime jurídico
(Livre × Disponibilidade) vigente em cada intervalo de tempo, com a norma que
fundamenta cada transição. Inclui filtros (categoria, status atual, diploma
legal, busca textual), ferramenta "consultar regime em uma data" e API pública
somente-leitura em `GET /api/disponibilidade` (suporta `?categoria=`,
`?status=`, `?data=YYYY-MM-DD`, `?format=csv`).

**Por quê:** Pedido do usuário para transformar o PDF "Legislação
Disponibilidade" (compilação interna, sem data de origem clara nas normas mais
antigas) em um dashboard consultável, com link web e possibilidade de
integração em outros processos (n8n, chatbots, planilhas).

**Decisão de arquitetura — por que aqui e não em projeto novo:** o usuário já
tinha uma plataforma em produção para Direito Minerário
(`medeiros-web/anmlegis-dashboard`, esta mesma) com uma seção "Legislação
Mineral" madura (filtros, sidebar, tema claro/escuro, PWA). Criar um dashboard
isolado teria duplicado infraestrutura e fragmentado a experiência do usuário
final. A integração aqui reaproveita 100% do design system existente
(`.leg-*`, `.badge-*`, `.hero`, `.pill`).

**Pontos de atenção para quem for editar o dataset depois:**
- O dataset (`DISP_DATA`) está **duplicado** por design: uma cópia embutida no
  `index.html` (para funcionar offline via PWA) e outra em
  `api/disponibilidade.js` (para a API pública). Ao corrigir/adicionar uma
  situação, editar as duas cópias juntas — não há single source of truth
  automatizado hoje.
- Datas de vigência (`de`/`ate`) foram inferidas a partir do texto do PDF
  fonte ("Até DD/MM/AAAA" / "A partir de DD/MM/AAAA"). Onde o PDF não trazia
  data expressa (itens 14, 20 e 32), ficou registrado como "sem marco temporal
  expresso no quadro-fonte" — a consulta por data retorna "sem regra vigente
  registrada" para essas situações antes de qualquer data, o que é esperado.
- Item 27 cita "Decreto nº 3.358/2010" (não 2000) — está assim no PDF fonte;
  os itens 29-31 citam "Decreto nº 3.358/2000" para o mesmo assunto. Pode ser
  erro de digitação do documento original da ANM — mantido fiel à fonte, não
  "corrigido" por suposição. Se confirmar que é o mesmo decreto, ajustar nos
  dois arquivos.
- Fonte original: PDF "Legislação Disponibilidade" fornecido pelo usuário
  (compilação interna do escritório, não é publicação oficial da ANM) — o
  aviso "confirme o texto oficial antes de decisões críticas" no rodapé da
  seção e na resposta da API deve ser mantido.
