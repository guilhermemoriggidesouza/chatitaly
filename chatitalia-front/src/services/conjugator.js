// Conjugador de verbos REGULARES italianos: radical + terminação por regra
// fixa. Cada forma volta em segmentos `{ text, highlight }` pra página poder
// destacar o que é conjugação (terminação e auxiliar) do que é radical.
//
// Só vale pra verbo totalmente regular — a lista vem do backend (GET /verbs).
// Nomes de modos e tempos vão em português (`label`); o nome italiano do
// tempo fica em `original`. Pronomes e formas continuam em italiano.

const PRONOUNS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro']

// Terminações dos tempos simples, por grupo, na ordem de PRONOUNS.
const ENDINGS = {
  presente: {
    are: ['o', 'i', 'a', 'iamo', 'ate', 'ano'],
    ere: ['o', 'i', 'e', 'iamo', 'ete', 'ono'],
    ire: ['o', 'i', 'e', 'iamo', 'ite', 'ono'],
    isc: ['isco', 'isci', 'isce', 'iamo', 'ite', 'iscono'],
  },
  imperfetto: {
    are: ['avo', 'avi', 'ava', 'avamo', 'avate', 'avano'],
    ere: ['evo', 'evi', 'eva', 'evamo', 'evate', 'evano'],
    ire: ['ivo', 'ivi', 'iva', 'ivamo', 'ivate', 'ivano'],
  },
  passatoRemoto: {
    are: ['ai', 'asti', 'ò', 'ammo', 'aste', 'arono'],
    ere: ['ei', 'esti', 'é', 'emmo', 'este', 'erono'],
    ire: ['ii', 'isti', 'ì', 'immo', 'iste', 'irono'],
  },
  futuro: {
    are: ['erò', 'erai', 'erà', 'eremo', 'erete', 'eranno'],
    ere: ['erò', 'erai', 'erà', 'eremo', 'erete', 'eranno'],
    ire: ['irò', 'irai', 'irà', 'iremo', 'irete', 'iranno'],
  },
  congiuntivoPresente: {
    are: ['i', 'i', 'i', 'iamo', 'iate', 'ino'],
    ere: ['a', 'a', 'a', 'iamo', 'iate', 'ano'],
    ire: ['a', 'a', 'a', 'iamo', 'iate', 'ano'],
    isc: ['isca', 'isca', 'isca', 'iamo', 'iate', 'iscano'],
  },
  congiuntivoImperfetto: {
    are: ['assi', 'assi', 'asse', 'assimo', 'aste', 'assero'],
    ere: ['essi', 'essi', 'esse', 'essimo', 'este', 'essero'],
    ire: ['issi', 'issi', 'isse', 'issimo', 'iste', 'issero'],
  },
  condizionale: {
    are: ['erei', 'eresti', 'erebbe', 'eremmo', 'ereste', 'erebbero'],
    ere: ['erei', 'eresti', 'erebbe', 'eremmo', 'ereste', 'erebbero'],
    ire: ['irei', 'iresti', 'irebbe', 'iremmo', 'ireste', 'irebbero'],
  },
  // Não existe imperativo de "io".
  imperativo: {
    are: [null, 'a', 'i', 'iamo', 'ate', 'ino'],
    ere: [null, 'i', 'a', 'iamo', 'ete', 'ano'],
    ire: [null, 'i', 'a', 'iamo', 'ite', 'ano'],
    isc: [null, 'isci', 'isca', 'iamo', 'ite', 'iscano'],
  },
}

// Segunda forma do passato remoto em -ere (credei / credetti). Não se usa
// quando o radical termina em "t" (battere -> battei, nunca "battetti").
const PASSATO_REMOTO_ERE_ALT = ['etti', null, 'ette', null, null, 'ettero']

// Auxiliares já conjugados (são irregulares), usados nos tempos compostos.
const AUXILIARIES = {
  avere: {
    presente: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'],
    imperfetto: ['avevo', 'avevi', 'aveva', 'avevamo', 'avevate', 'avevano'],
    passatoRemoto: ['ebbi', 'avesti', 'ebbe', 'avemmo', 'aveste', 'ebbero'],
    futuro: ['avrò', 'avrai', 'avrà', 'avremo', 'avrete', 'avranno'],
    congiuntivoPresente: ['abbia', 'abbia', 'abbia', 'abbiamo', 'abbiate', 'abbiano'],
    congiuntivoImperfetto: ['avessi', 'avessi', 'avesse', 'avessimo', 'aveste', 'avessero'],
    condizionale: ['avrei', 'avresti', 'avrebbe', 'avremmo', 'avreste', 'avrebbero'],
    gerundio: 'avendo',
  },
  essere: {
    presente: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'],
    imperfetto: ['ero', 'eri', 'era', 'eravamo', 'eravate', 'erano'],
    passatoRemoto: ['fui', 'fosti', 'fu', 'fummo', 'foste', 'furono'],
    futuro: ['sarò', 'sarai', 'sarà', 'saremo', 'sarete', 'saranno'],
    congiuntivoPresente: ['sia', 'sia', 'sia', 'siamo', 'siate', 'siano'],
    congiuntivoImperfetto: ['fossi', 'fossi', 'fosse', 'fossimo', 'foste', 'fossero'],
    condizionale: ['sarei', 'saresti', 'sarebbe', 'saremmo', 'sareste', 'sarebbero'],
    gerundio: 'essendo',
  },
}

const PARTICIPLE = { are: 'ato', ere: 'uto', ire: 'ito' }
const PRESENT_PARTICIPLE = { are: 'ante', ere: 'ente', ire: 'ente' }
const GERUND = { are: 'ando', ere: 'endo', ire: 'endo' }

const plain = (text) => ({ text, highlight: false })
const strong = (text) => ({ text, highlight: true })

// "parlare" -> { stem: "parl", group: "are" }. Null se não for -are/-ere/-ire.
export function analyzeVerb(infinitive) {
  const word = String(infinitive ?? '').trim().toLowerCase()
  const group = word.slice(-3)
  if (word.length < 4 || !PARTICIPLE[group]) return null
  return { stem: word.slice(0, -3), group }
}

export function conjugate(verb) {
  const analysis = analyzeVerb(verb?.infinitive)
  if (!analysis) return null

  const { stem, group } = analysis
  const auxiliary = AUXILIARIES[verb.auxiliary] ? verb.auxiliary : 'avere'
  const withEssere = auxiliary === 'essere'
  const endingsOf = (tense) => (verb.isc && ENDINGS[tense].isc) || ENDINGS[tense][group]

  // Com "essere" o particípio concorda: arrivato/a (singular), arrivati/e (plural).
  const participle = (plural) => {
    const base = PARTICIPLE[group]
    if (!withEssere) return base
    return plural ? `${base.slice(0, -1)}i/e` : `${base}/a`
  }

  const rows = (pronouns, forms) => pronouns.map((pronoun, index) => ({ pronoun, parts: forms[index] }))

  const simple = (tense, pronouns = PRONOUNS) =>
    rows(
      pronouns,
      endingsOf(tense).map((ending) => (ending === null ? [plain('—')] : [plain(stem), strong(ending)]))
    )

  const compound = (auxTense, pronouns = PRONOUNS) =>
    rows(
      pronouns,
      AUXILIARIES[auxiliary][auxTense].map((aux, index) => [
        strong(aux),
        plain(` ${stem}`),
        strong(participle(index >= 3)),
      ])
    )

  const passatoRemoto = () => {
    const showAlt = group === 'ere' && !stem.endsWith('t')
    return rows(
      PRONOUNS,
      ENDINGS.passatoRemoto[group].map((ending, index) => {
        const alt = showAlt ? PASSATO_REMOTO_ERE_ALT[index] : null
        const parts = [plain(stem), strong(ending)]
        return alt ? [...parts, plain(` / ${stem}`), strong(alt)] : parts
      })
    )
  }

  const che = PRONOUNS.map((pronoun) => `che ${pronoun}`)
  const nonFinite = ['presente', 'passado']

  return {
    stem,
    group: verb.isc ? 'isc' : group,
    auxiliary,
    moods: [
      {
        id: 'indicativo',
        label: 'Indicativo',
        tenses: [
          { id: 'presente', label: 'Presente', original: 'Presente', rows: simple('presente') },
          { id: 'passato-prossimo', label: 'Pretérito perfeito', original: 'Passato prossimo', rows: compound('presente') },
          { id: 'imperfetto', label: 'Pretérito imperfeito', original: 'Imperfetto', rows: simple('imperfetto') },
          { id: 'trapassato-prossimo', label: 'Mais-que-perfeito', original: 'Trapassato prossimo', rows: compound('imperfetto') },
          { id: 'passato-remoto', label: 'Passado remoto', original: 'Passato remoto', rows: passatoRemoto() },
          { id: 'trapassato-remoto', label: 'Mais-que-perfeito remoto', original: 'Trapassato remoto', rows: compound('passatoRemoto') },
          { id: 'futuro-semplice', label: 'Futuro simples', original: 'Futuro semplice', rows: simple('futuro') },
          { id: 'futuro-anteriore', label: 'Futuro composto', original: 'Futuro anteriore', rows: compound('futuro') },
        ],
      },
      {
        id: 'congiuntivo',
        label: 'Subjuntivo',
        tenses: [
          { id: 'presente', label: 'Presente', original: 'Presente', rows: simple('congiuntivoPresente', che) },
          { id: 'passato', label: 'Pretérito perfeito', original: 'Passato', rows: compound('congiuntivoPresente', che) },
          { id: 'imperfetto', label: 'Pretérito imperfeito', original: 'Imperfetto', rows: simple('congiuntivoImperfetto', che) },
          { id: 'trapassato', label: 'Mais-que-perfeito', original: 'Trapassato', rows: compound('congiuntivoImperfetto', che) },
        ],
      },
      {
        id: 'condizionale',
        label: 'Condicional',
        tenses: [
          { id: 'presente', label: 'Presente', original: 'Presente', rows: simple('condizionale') },
          { id: 'passato', label: 'Passado', original: 'Passato', rows: compound('condizionale') },
        ],
      },
      {
        id: 'imperativo',
        label: 'Imperativo',
        tenses: [{ id: 'presente', label: 'Presente', original: 'Presente', rows: simple('imperativo') }],
      },
      {
        id: 'forme-nominali',
        label: 'Infinitivo, particípio, gerúndio',
        tenses: [
          {
            id: 'infinito',
            label: 'Infinitivo',
            original: 'Infinito',
            rows: rows(nonFinite, [
              [plain(stem), strong(group)],
              [strong(auxiliary), plain(` ${stem}`), strong(participle(false))],
            ]),
          },
          {
            id: 'participio',
            label: 'Particípio',
            original: 'Participio',
            rows: rows(nonFinite, [
              [plain(stem), strong(PRESENT_PARTICIPLE[group])],
              [plain(stem), strong(participle(false))],
            ]),
          },
          {
            id: 'gerundio',
            label: 'Gerúndio',
            original: 'Gerundio',
            rows: rows(nonFinite, [
              [plain(stem), strong(GERUND[group])],
              [strong(AUXILIARIES[auxiliary].gerundio), plain(` ${stem}`), strong(participle(false))],
            ]),
          },
        ],
      },
    ],
  }
}
