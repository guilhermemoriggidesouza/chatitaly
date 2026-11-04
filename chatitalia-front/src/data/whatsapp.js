// O Don Italiano no WhatsApp: textos usados na landing e na página de venda.

// Vídeo do anúncio (vertical, 9:16) e a capa enquanto não toca.
export const WHATSAPP_VIDEO = {
  src: '/video/anuncio-don-whatsapp.mp4',
  poster: '/screenshots/shot-whatsapp.jpg',
}

// Como funciona, em 3 passos.
export const WHATSAPP_STEPS = [
  {
    title: 'Você escolhe a hora',
    text: 'Diga em quais dias e em que horário quer receber. Pode ser no café da manhã, no ônibus ou na fila do mercado.',
  },
  {
    title: 'O Don manda a lição do dia',
    text: 'Chega o verbo do dia, com a conjugação, frases de exemplo e o áudio, e uma pergunta sobre o tema que você está estudando.',
  },
  {
    title: 'Você responde, ele corrige',
    text: 'Responda por texto ou áudio. O Don aponta cada erro, explica o porquê e continua a conversa.',
  },
]

// O que o assinante recebe no WhatsApp.
export const WHATSAPP_FEATURES = [
  {
    icon: '🖼️',
    title: 'Verbo do dia',
    text: 'Um cartão com a conjugação completa do verbo, uma frase de exemplo em cada tempo e o áudio do Don lendo tudo.',
  },
  {
    icon: '❓',
    title: 'Pergunta do dia',
    text: 'O Don pergunta sobre os temas das suas lições, sempre com um assunto diferente.',
  },
  {
    icon: '🎙️',
    title: 'Responda por texto ou áudio',
    text: 'Você responde como preferir e o Don corrige os seus erros na hora, no nível em que você está.',
  },
  {
    icon: '🇧🇷',
    title: 'Explicações em português',
    text: 'No começo (A1 e A2), o Don explica cada correção em português. Do B1 em diante, a conversa é toda em italiano.',
  },
]

// Exemplo de correção no padrão do Don (aparece como conversa de WhatsApp).
export const WHATSAPP_SAMPLE_CHAT = {
  student: 'Io sono 30 anni e mi piace di cucinare',
  don: [
    "Você disse 'io sono 30 anni', mas na verdade é 'ho 30 anni', porque em italiano a idade se diz com o verbo 'avere'.",
    "Você disse 'mi piace di cucinare', mas na verdade é 'mi piace cucinare', porque depois de 'mi piace' não vai 'di'.",
  ],
  question: 'Che cosa cucini di solito per la tua famiglia?',
}
