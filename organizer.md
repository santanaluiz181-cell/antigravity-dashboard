# Auto-Organizer Checkpoint: Antigravity Dashboards & Motion Studio

## 1. Meta Geral
Estação local e página interativa no GitHub Pages combinando a estrutura editorial de `claude.com/resources/articles/dashboards-and-motion` com a identidade visual, fontes (`Google Sans Flex`, `Google Sans Code`, `Google Symbols`) e física de partículas reativas ao mouse (`MainParticlesComponent.Cr9vcqqS.js`) extraídas via `/REA` de `https://antigravity.google/`.

## 2. Arquivos Principais
- [src/App.tsx](file:///e:/Downloads_C/Antigravity%20Dashboard/src/App.tsx): Layout editorial estilo artigo interativo (`Article & Live Demos`) + alternador para `Focused Workbench`, metadados em 4 colunas, sumário fixo lateral, suporte trilíngue (`EN | 中文 | PT`) e seção `Related architecture pillars`.
- [src/components/AntigravityMotionPlayer.tsx](file:///e:/Downloads_C/Antigravity%20Dashboard/src/components/AntigravityMotionPlayer.tsx): Explicador animado em código (4 cenas, sliders de orçamento de tokens e velocidade, código editável sincronizado).
- [src/data/staticShowcaseData.ts](file:///e:/Downloads_C/Antigravity%20Dashboard/src/data/staticShowcaseData.ts): Simulador client-side determinístico para funcionamento 100% vivo no GitHub Pages mesmo sem daemon Hono `:4320`.
- [public/logo.svg](file:///e:/Downloads_C/Antigravity%20Dashboard/public/logo.svg) & [docs/assets/logo.svg](file:///e:/Downloads_C/Antigravity%20Dashboard/docs/assets/logo.svg): Logo oficial vetorizada em Cubic Bézier.

## 3. URLs Verificadas
- **GitHub Repository:** `https://github.com/santanaluiz181-cell/antigravity-dashboard` (`main` + `gh-pages`)
- **Live GitHub Pages:** `https://santanaluiz181-cell.github.io/antigravity-dashboard/`
- **Local Dev Server:** `http://localhost:5175` (UI) + `http://127.0.0.1:4320` (Hono API)
