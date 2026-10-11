// Colinha dos tempos verbais mostrada no modal "O que cada tempo significa".
// Mesma ordem e mesmos nomes da página de conjugação (services/conjugator.js).
// Nos exemplos, o trecho entre *asteriscos* é o verbo conjugado (vai em destaque).
export const TENSE_GUIDE = [
  {
    id: 'indicativo',
    label: 'Indicativo',
    summary: 'Fatos e certezas: o que acontece, aconteceu ou vai acontecer.',
    tenses: [
      {
        label: 'Presente',
        original: 'Presente',
        use: 'O que acontece agora, hábitos e também o futuro próximo.',
        example: { it: '*Parlo* italiano ogni giorno.', pt: 'Falo italiano todos os dias.' },
      },
      {
        label: 'Pretérito perfeito',
        original: 'Passato prossimo',
        use: 'Ação que já terminou. É o passado mais usado na conversa.',
        example: { it: 'Ieri *ho parlato* con Maria.', pt: 'Ontem falei com a Maria.' },
      },
      {
        label: 'Pretérito imperfeito',
        original: 'Imperfetto',
        use: 'Hábitos e descrições no passado, ou algo que estava acontecendo.',
        example: { it: 'Da bambino *parlavo* poco.', pt: 'Quando criança, eu falava pouco.' },
      },
      {
        label: 'Mais-que-perfeito',
        original: 'Trapassato prossimo',
        use: 'Ação que aconteceu antes de outra no passado.',
        example: {
          it: '*Avevo* già *parlato* con lui quando sei arrivato.',
          pt: 'Eu já tinha falado com ele quando você chegou.',
        },
      },
      {
        label: 'Passado remoto',
        original: 'Passato remoto',
        use: 'Ação concluída num passado distante. Comum em livros e na fala do sul da Itália.',
        example: { it: 'Garibaldi *parlò* alla folla.', pt: 'Garibaldi falou à multidão.' },
      },
      {
        label: 'Mais-que-perfeito remoto',
        original: 'Trapassato remoto',
        use: 'Ação logo anterior a outra no passado remoto. Aparece quase só na escrita.',
        example: { it: 'Dopo che *ebbe parlato*, uscì.', pt: 'Depois que falou, saiu.' },
      },
      {
        label: 'Futuro simples',
        original: 'Futuro semplice',
        use: 'O que vai acontecer. Também serve para suposições.',
        example: { it: 'Domani *parlerò* con il direttore.', pt: 'Amanhã falarei com o diretor.' },
      },
      {
        label: 'Futuro composto',
        original: 'Futuro anteriore',
        use: 'Ação que já estará concluída antes de outra no futuro.',
        example: {
          it: 'Quando *avrò parlato* con lei, ti chiamerò.',
          pt: 'Quando eu tiver falado com ela, te ligo.',
        },
      },
    ],
  },
  {
    id: 'congiuntivo',
    label: 'Subjuntivo',
    summary: 'Dúvida, desejo, opinião e hipótese. Quase sempre vem depois de “che” ou “se”.',
    tenses: [
      {
        label: 'Presente',
        original: 'Congiuntivo presente',
        use: 'Opinião, dúvida ou desejo sobre o presente.',
        example: { it: 'Penso che lui *parli* bene.', pt: 'Acho que ele fala bem.' },
      },
      {
        label: 'Pretérito perfeito',
        original: 'Congiuntivo passato',
        use: 'Opinião ou dúvida sobre algo que já aconteceu.',
        example: { it: 'Credo che *abbia parlato* con tutti.', pt: 'Acho que ele falou com todos.' },
      },
      {
        label: 'Pretérito imperfeito',
        original: 'Congiuntivo imperfetto',
        use: 'Hipóteses e desejos: o “se eu fizesse” do português.',
        example: {
          it: 'Se *parlassi* italiano, lavorerei a Roma.',
          pt: 'Se eu falasse italiano, trabalharia em Roma.',
        },
      },
      {
        label: 'Mais-que-perfeito',
        original: 'Congiuntivo trapassato',
        use: 'Hipótese sobre o passado que não aconteceu: “se eu tivesse feito”.',
        example: {
          it: 'Se *avessi parlato* prima, sarebbe stato diverso.',
          pt: 'Se eu tivesse falado antes, teria sido diferente.',
        },
      },
    ],
  },
  {
    id: 'condizionale',
    label: 'Condicional',
    summary: 'O que aconteceria sob uma condição. Também é a forma educada de pedir.',
    tenses: [
      {
        label: 'Presente',
        original: 'Condizionale presente',
        use: 'O que aconteceria agora ou no futuro, e pedidos com educação.',
        example: {
          it: '*Parlerei* con lui, ma non ho tempo.',
          pt: 'Eu falaria com ele, mas não tenho tempo.',
        },
      },
      {
        label: 'Passado',
        original: 'Condizionale passato',
        use: 'O que teria acontecido, mas não aconteceu.',
        example: {
          it: '*Avrei parlato* con lui, ma era già uscito.',
          pt: 'Eu teria falado com ele, mas ele já tinha saído.',
        },
      },
    ],
  },
  {
    id: 'imperativo',
    label: 'Imperativo',
    summary: 'Ordens, pedidos, conselhos e instruções.',
    tenses: [
      {
        label: 'Presente',
        original: 'Imperativo',
        use: 'Para pedir ou mandar alguém fazer algo. Não existe para “io”.',
        example: { it: '*Parla* più piano!', pt: 'Fale mais devagar!' },
      },
    ],
  },
  {
    id: 'forme-nominali',
    label: 'Infinitivo, particípio, gerúndio',
    summary: 'Formas que não mudam conforme a pessoa.',
    tenses: [
      {
        label: 'Infinitivo',
        original: 'Infinito',
        use: 'O nome do verbo. Aparece depois de outros verbos e de preposições.',
        example: { it: 'Voglio *parlare* con te.', pt: 'Quero falar com você.' },
      },
      {
        label: 'Particípio',
        original: 'Participio',
        use: 'Junto com “avere” ou “essere”, forma todos os tempos compostos.',
        example: { it: 'Ho *parlato* troppo.', pt: 'Falei demais.' },
      },
      {
        label: 'Gerúndio',
        original: 'Gerundio',
        use: 'Ação em andamento, normalmente com “stare”.',
        example: { it: 'Sto *parlando* al telefono.', pt: 'Estou falando ao telefone.' },
      },
    ],
  },
]
