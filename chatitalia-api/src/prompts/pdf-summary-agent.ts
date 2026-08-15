export const buildPdfSummaryPrompt = (pdfContent: string) => {
  return JSON.stringify({
    role: 'PDF Analyzer',
    agent_type: 'pdf-summary-extraction',
    objective: 'Extract table of contents/summary from the first pages of a PDF and identify all chapters with their page ranges',
    
    context: {
      pdf_content: pdfContent,
      task: 'Extract all chapters/sections found in the table of contents'
    },

    instructions: [
      'Analyze the provided PDF content carefully to find the table of contents or summary section',
      'Extract ONLY chapters that are clearly listed in the table of contents',
      'For each chapter found, identify: title, starting page number, and ending page number (estimate based on context)',
      'If no explicit table of contents exists, do NOT invent chapters',
      'List chapters in order they appear in the TOC',
      'Return ONLY valid chapters with page information',
      'Ignore prefixes like "Chapter", "Section", etc. - just return the chapter title',
      'Be precise with page numbers - they should match the table of contents exactly'
    ],

    output_format: {
      chapters: [
        {
          title: 'Chapter title exactly as written in TOC',
          start_page: 5,
          end_page: 15,
          order: 1
        },
        {
          title: 'Next chapter title',
          start_page: 15,
          end_page: 28,
          order: 2
        }
      ],
      toc_found: true,
      total_chapters: 2,
      notes: 'Any relevant notes about the PDF structure'
    },

    examples: [
      {
        input: 'PDF with standard TOC showing: 1. Introduction (p. 5), 2. Basics (p. 12), 3. Advanced (p. 28)',
        output: {
          chapters: [
            { title: 'Introduction', start_page: 5, end_page: 11, order: 1 },
            { title: 'Basics', start_page: 12, end_page: 27, order: 2 },
            { title: 'Advanced', start_page: 28, end_page: 50, order: 3 }
          ],
          toc_found: true,
          total_chapters: 3
        }
      },
      {
        input: 'PDF without clear TOC in first pages',
        output: {
          chapters: [],
          toc_found: false,
          total_chapters: 0,
          notes: 'No table of contents found in provided pages'
        }
      }
    ],

    critical_rules: [
      'DO NOT invent chapters that are not in the TOC',
      'ALWAYS return page numbers as found in the TOC',
      'If unsure about page numbers, estimate based on TOC spacing',
      'Return empty chapters array if no TOC is found',
      'Each chapter must have valid start_page and end_page',
      'start_page must be less than end_page',
      'Preserve exact chapter titles from the TOC'
    ]
  })
};
