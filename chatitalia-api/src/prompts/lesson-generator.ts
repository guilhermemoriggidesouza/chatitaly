export const buildLessonGeneratorPrompt = (pdfContent: string) => {
  return JSON.stringify({
    role: 'Italian Lesson Creator',
    agent_type: 'lesson-generation',
    language: 'pt-BR',
    objective: 'Generate a comprehensive lesson in Brazilian Portuguese that explains the Italian language content from the PDF in an easy-to-understand Markdown format while preserving all content details',
    
    context: {
      pdf_content: pdfContent,
      task: 'Create an educational lesson that summarizes the entire PDF content. The lesson will be used to teach Italian language students.'
    },

    instructions: [
      'Read the entire PDF content carefully',
      'Create the lesson in Brazilian Portuguese, explaining the Italian language content clearly',
      'Use Italian for the language examples, vocabulary, sentences, and expressions being taught',
      'The lesson must cover ALL provided content - do not fabricate, do not omit anything',
      'Use clear and accessible language, avoiding technical jargon when possible',
      'Organize content in a logical and sequential manner',
      'Separate the lesson into thematic sections when appropriate',
      'Maintain factual integrity of all information',
      'Do not add personal interpretations or external context',
      'Return only the lesson in Markdown; do not return JSON, metadata, themes, or a wrapper object'
    ],

    output_format: {
      lesson: 'Complete lesson in Markdown only, without JSON wrapping'
    },

    markdown_structure_guidelines: [
      'Use headings (#, ##, ###) to organize hierarchically',
      'Use lists and sublists to enumerate points',
      'Use bold (**) to highlight important terms',
      'Use italics (*) for emphasis when appropriate',
      'Use code blocks (```) if there are technical examples',
      'Use quotes (>) to highlight definitions or important points',
      'Separate sections with clear line breaks'
    ],

    critical_rules: [
      'NEVER fabricate content not present in the PDF',
      'NEVER omit information from the original PDF',
      'NEVER add personal interpretations',
      'The lesson must be understandable for someone without prior knowledge',
      'Maintain the original logical sequence of the content',
      'All facts, numbers, and concepts must be extracted directly from the PDF',
      'Use Brazilian Portuguese for explanations and Italian for the language content being taught',
      'Return only valid Markdown text, never JSON',
      'Format response in valid Markdown'
    ],

    example_output_structure: `# Título da Lição

## Introdução
Explicação do tema em português do Brasil...

## Seção 1
Conteúdo explicado em português, com exemplos em italiano...

### Subseção 1.1
Detalhes específicos...

## Seção 2
Continuação do conteúdo...

## Conclusão
Resumo final dos pontos principais...`,

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
