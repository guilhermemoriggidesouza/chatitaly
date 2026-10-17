# YourLesson IA

## Identidade visual (seguir em toda mudança de layout)

### Tipografia
- **Títulos e nome da marca (`yourlesson`):** Bricolage Grotesque, peso ExtraBold (800), com as letras um pouco mais juntas (`letter-spacing: -0.02em`). Vale para `h1`–`h4`, títulos de seção, títulos de cartões e modais e para a marca na navbar, na landing e no cartão do verbo.
- **Textos menores** (parágrafos, frases de apoio, legendas, rodapé, botões, campos de formulário): DM Sans.
- As fontes vêm do Google Fonts (`chatitalia-front/index.html`). No CSS, use os tokens em vez de repetir o nome da fonte:
  - `var(--font-heading)` e `var(--font-heading-tracking)` para títulos;
  - `var(--font-sans)` para o resto.
- A regra global de títulos fica no começo de `chatitalia-front/src/App.css`. Elemento novo que funcione como título e não seja `h1`–`h4` (ex.: o nome da marca dentro de um `span`) precisa entrar nela.

### Marca
- No logo (navbar, cabeçalhos, rodapé, telas de login/cadastro, cartão do verbo) e no título da aba, o nome é **`yourlesson`**: tudo em minúsculas e na cor preta (`var(--text)`), na fonte de títulos. O texto vem de `COMPANY.brand` (`chatitalia-front/src/data/company.js`).
- Em textos corridos (termos, privacidade, frases da landing) o produto continua sendo "YourLesson IA" (`COMPANY.product`).

### Cores
- Paleta da bandeira da Itália: verde, vermelho e branco; preto e cinza só para texto e sombras. Use os tokens de `:root` em `App.css` (`--red-*`, `--green-italia*`, `--bg`), nunca cores soltas.
- **Botões são vermelhos** (`--red-vivid`, hover `--red-vivid-hover`). Nas páginas de Verbos e Configurar WhatsApp não pode haver botão verde, nem chips de seleção ou botões deslizantes verdes.
- **Na página de Verbos, os textos de destaque são verdes:** nomes dos tempos e a parte conjugada dos verbos (`--green-italia`).
- Verde de fundo fica para avisos de sucesso (ex.: "Configuração salva").

### Layout
- **Mobile first:** os estilos base são para celular; telas maiores entram por `@media (min-width: ...)`. Sem rolagem horizontal em 390px de largura, alvos de toque com pelo menos 44px.
- Modais com `<dialog>` nativo: no celular sobem como folha presa embaixo; em telas maiores ficam centralizados.
- Cantos arredondados generosos (cartões ~18–22px, botões em pílula `999px`), bordas suaves e sombras leves, como nos componentes existentes.

### Cartão do verbo (`/verbs/card`)
O print desse cartão é enviado no WhatsApp e fica em cache em `chatitalia-api/uploads/verb-cards/`. Depois de mudar o visual do cartão (fontes, cores, layout), apague os arquivos dessa pasta (local e na VM) para os prints serem refeitos.
