// Dados da empresa usados no rodapé e nas páginas institucionais (quem
// somos, termos e privacidade). PREENCHA antes de publicar: enquanto um
// campo estiver vazio, a página mostra "[preencher]" no lugar.
export const COMPANY = {
  // Nome do produto nos textos corridos (termos, privacidade, quem somos).
  product: 'YourLesson IA',
  // Nome no logo (navbar, cabeçalhos, rodapé, cartão do verbo): sempre em
  // minúsculas e preto (ver CLAUDE.md).
  brand: 'yourlesson',
  // Razão social ou nome completo do responsável (pessoa física).
  legalName: '',
  // CNPJ ou CPF do responsável.
  document: '',
  // E-mail para dúvidas, suporte e pedidos sobre dados pessoais (LGPD).
  contactEmail: 'guilhermemoriggidesousa@gmail.com',
  // Cidade e estado do foro (ex.: "Campinas/SP").
  forum: '',
  // Data da última atualização dos termos e da política (ex.: "16/10/2026").
  lastUpdated: '16/10/2026',
}

export const fill = (value) => value || '[preencher]'
