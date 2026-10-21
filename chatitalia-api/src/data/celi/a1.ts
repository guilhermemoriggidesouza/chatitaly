import { CeliReference } from './types';

// CELI Impatto (A1) — Università per Stranieri di Perugia (CVCL).
// Resumo das competências exigidas e das escalas de correção oficiais, usado
// como referência interna nos prompts (geração de lição e decisão de avanço).
// Não publicar este texto no site.
export const CELI_A1: CeliReference = {
    level: 'A1',
    exam: 'CELI Impatto (A1)',

    grammar: [
        'presente indicativo, imperativo e infinito dei verbi regolari e irregolari di largo uso',
        'nomi propri e comuni regolari (genere e numero)',
        'articolo determinativo e indeterminativo',
        'aggettivi a quattro uscite e accordo aggettivo-nome',
        'aggettivi possessivi',
        'aggettivi e pronomi dimostrativi (questo/quello)',
        'pronomi personali soggetto',
        'numerali cardinali',
        'preposizioni semplici',
        'avverbi di tempo e di luogo di uso quotidiano',
        'sintassi: solo paratassi (frasi coordinate, niente subordinate)',
    ],

    vocabulary:
        'vocabolario di base, formule comuni ed espressioni comunicative della vita quotidiana (ambito familiare ed esperienze quotidiane)',

    tasks: [
        'lettura: capire il messaggio essenziale di testi brevi (cartelli stradali, avvisi pubblici, avvertenze, istruzioni, volantini, orari, annunci, brevi notizie)',
        'scrittura: completare un breve testo di presentazione personale (una parola per spazio)',
        'scrittura: scrivere una cartolina informale a un amico (15-25 parole)',
        'orale: presentarsi con l\'aiuto di domande guida',
        'orale: conversare su una foto (famiglia, esperienze quotidiane)',
        'orale: rispondere a domande brevi su tre brevi annunci ascoltati',
    ],

    writingRubric: [
        '4 punti: compito svolto completamente, qualche errore di grammatica o ortografia, vocabolario semplice ma sempre adeguato',
        '3 punti: svolto quasi completamente, errori frequenti (massimo sei), vocabolario semplice e a volte poco adeguato',
        '2 punti: svolto solo parzialmente, oppure quasi completamente ma con errori sistematici che a volte rendono il testo poco comprensibile',
        '1 punto: svolto solo parzialmente, con errori sistematici e vocabolario povero',
        'non valutabile: non svolto o non comprensibile',
    ],

    advanceBar: 'it would get "2 punti" in EVERY dimension of the rubric',

    oralRubric: [
        {
            dimension: 'competenza sociolinguistica (comprensione e interazione)',
            levels: [
                '2 punti: capisce, porta a termine il compito chiedendo raramente di ripetere, risposte brevi ma quasi sempre appropriate, frasi semplici, interazione elementare; generalmente si fa capire',
                '1 punto: capisce solo in parte, risponde a volte in modo non appropriato, esposizione talvolta poco chiara; non sempre si fa capire',
                'non valutabile: capisce raramente e quasi mai risponde in modo appropriato',
            ],
        },
        {
            dimension: 'orientamento lessicale e grammaticale',
            levels: [
                '2 punti: porta a termine il compito con un repertorio limitato ma generalmente adeguato; diversi errori che NON ostacolano la comprensione',
                '1 punto: porta a termine il compito solo in parte, repertorio povero; errori frequenti che a volte ostacolano la comprensione',
                'non valutabile: repertorio molto povero, errori sistematici che spesso impediscono la comprensione',
            ],
        },
    ],
};
