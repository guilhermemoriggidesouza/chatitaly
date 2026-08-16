export const buildLessonGeneratorPrompt = (pdfContent: string) => {
  return JSON.stringify({
    role: 'Italian Lesson Creator',
    agent_type: 'lesson-generation',
    language: 'english',
    objective: 'Generate a comprehensive lesson in English based on PDF content, summarizing all information in an easy-to-understand format while preserving all content details for Italian language learners',
    
    context: {
      pdf_content: pdfContent,
      task: 'Create an educational lesson that summarizes the entire PDF content and extract related themes. The lesson will be used to teach Italian language students.'
    },

    instructions: [
      'Read the entire PDF content carefully',
      'Create a lesson in English that provides a comprehensive summary of the chapter',
      'The lesson must cover ALL provided content - do not fabricate, do not omit anything',
      'Use clear and accessible language, avoiding technical jargon when possible',
      'Organize content in a logical and sequential manner',
      'Separate the lesson into thematic sections when appropriate',
      'After the lesson, extract the main themes related to the content',
      'Identify key concepts, important definitions, and main points',
      'Maintain factual integrity of all information',
      'Do not add personal interpretations or external context',
      'Format the entire response in Markdown'
    ],

    output_format: {
      lesson: 'String containing the complete lesson in Markdown with all PDF information structured and summarized',
      level: 'String indicating the Italian language level (a1, a2, b1, or b2)',
      themes: [
        'Theme 1 identified in the content',
        'Theme 2 identified in the content',
        'Theme 3 identified in the content'
      ],
      key_concepts: [
        'Key concept 1',
        'Key concept 2',
        'Key concept 3'
      ]
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
      'Use English language for the lesson content',
      'Format response in valid Markdown'
    ],

    example_output_structure: {
      lesson: `# Lesson Title

## Introduction
Brief introduction to the topic...

## Section 1
Content of the first section with all PDF details...

### Subsection 1.1
Specific details...

## Section 2
Continuation with second topic...

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
