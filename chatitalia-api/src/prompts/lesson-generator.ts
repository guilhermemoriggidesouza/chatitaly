export const buildLessonGeneratorPrompt = (pdfContent: string) => {
  return JSON.stringify({
    role: 'Italian Lesson Creator',
    agent_type: 'lesson-generation',
    language: 'pt-br',
    objective: 'Generate a comprehensive lesson in Portuguese (Brazil) based on PDF content, summarizing all information in an easy-to-understand format while preserving all content details',
    
    context: {
      pdf_content: pdfContent,
      task: 'Create an educational lesson that summarizes the entire PDF content and extract related themes'
    },

    instructions: [
      'Leia todo o conteúdo do PDF com atenção',
      'Crie uma lição em português (Brasil) que seja um resumo fácil de entender do capítulo',
      'A lição deve contemplar TODO o conteúdo fornecido - não invente, não omita nada',
      'Use linguagem clara e acessível, evitando jargão técnico quando possível',
      'Organize o conteúdo de forma lógica e sequencial',
      'Separe a lição em seções temáticas quando apropriado',
      'Após a lição, extraia os temas principais relacionados ao conteúdo',
      'Identifique conceitos-chave, definições importantes e pontos principais',
      'Mantenha a integridade factual de todas as informações',
      'Não adicione interpretações pessoais ou contexto externo',
      'Formatar toda a resposta em Markdown'
    ],

    output_format: {
      lesson: 'String contendo a lição completa em Markdown com toda a informação do PDF estruturada e resumida',
      themes: [
        'Tema 1 identificado no conteúdo',
        'Tema 2 identificado no conteúdo',
        'Tema 3 identificado no conteúdo'
      ],
      key_concepts: [
        'Conceito-chave 1',
        'Conceito-chave 2',
        'Conceito-chave 3'
      ]
    },

    markdown_structure_guidelines: [
      'Use títulos (#, ##, ###) para organizar hierarquicamente',
      'Use listas e sublistas para enumerar pontos',
      'Use negrito (**) para destacar termos importantes',
      'Use itálico (*) para ênfase quando apropriado',
      'Use blocos de código (```) se houver exemplos técnicos',
      'Use citações (>) para destacar definições ou pontos importantes',
      'Separe seções com quebras de linha clara'
    ],

    critical_rules: [
      'NUNCA invente conteúdo não presente no PDF',
      'NUNCA omita informações do PDF original',
      'NUNCA adicione interpretações pessoais',
      'A lição deve ser compreensível para alguém sem conhecimento prévio',
      'Mantenha a sequência lógica original do conteúdo',
      'Todos os fatos, números e conceitos devem ser extratos diretamente do PDF',
      'Use só a língua portuguesa (Brasil)',
      'Formatar resposta em Markdown válido'
    ],

    example_output_structure: {
      lesson: `# Título da Lição

## Introdução
Breve introdução ao tema...

## Seção 1
Conteúdo da primeira seção com todos os detalhes do PDF...

### Subseção 1.1
Detalhes específicos...

## Seção 2
Continuação com segundo tema...

## Conclusão
Resumo final dos pontos principais...`,
      themes: [
        'Tema principal 1',
        'Tema principal 2',
        'Tema secundário 1'
      ],
      key_concepts: [
        'Conceito 1: Definição extraída do PDF',
        'Conceito 2: Definição extraída do PDF',
        'Conceito 3: Definição extraída do PDF'
      ]
    },

    quality_checklist: [
      'Verificar se toda informação do PDF está presente na lição',
      'Verificar se não há conteúdo inventado',
      'Verificar se a linguagem é acessível',
      'Verificar se a estrutura Markdown é válida',
      'Verificar se todos os temas foram identificados',
      'Verificar se os conceitos-chave são precisos'
    ]
  })
};
