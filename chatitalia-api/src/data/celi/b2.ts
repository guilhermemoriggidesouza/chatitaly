import { CeliReference } from './types';

// CELI 3 (B2) — Università per Stranieri di Perugia (CVCL).
// Resumo das competências exigidas e das escalas oficiais (escrita e oral),
// usado como referência interna nos prompts. Não publicar este texto no site.
export const CELI_B2: CeliReference = {
    level: 'B2',
    exam: 'CELI 3 (B2)',

    grammar: [
        'usi fondamentali di tutti i tempi dell\'indicativo',
        'condizionale presente e passato (richieste cortesi, desideri, aspirazioni, consigli, suggerimenti, affermazioni attenuate, virtualità)',
        'imperativo e altre forme imperative di cortesia frequenti',
        'forma passiva e forma impersonale',
        'congiuntivo negli usi più ricorrenti, obbligati e non (completive, interrogative indirette, periodo ipotetico)',
        'infinito presente preposizionale nelle completive; gerundio presente con valore causale, modale e temporale',
        'principali connettivi coordinativi e subordinativi',
    ],

    vocabulary:
        'lessico di interesse generale della società contemporanea (articoli, interviste, notizie, lettere ai giornali, pubblicità, inchieste, sondaggi), senza conoscenze tecniche specifiche',

    tasks: [
        'lettura: capire il senso globale, i dettagli e le informazioni implicite di testi autentici (articoli, interviste, notizie, lettere ai giornali, pubblicità, inchieste, narrativa divulgativa)',
        'scrittura: breve composizione (120-180 parole) su esperienze personali, persone, situazioni o temi di interesse generale',
        'scrittura: lettera o e-mail formale o informale (80-100 parole) per chiedere o dare informazioni, consigli, opinioni, fare reclami o illustrare programmi',
        'competenza linguistica: completare testi, ricostruire frasi con i collegamenti giusti, formare parole della stessa famiglia',
        'ascolto: capire radio e TV (annunci, notiziari, commedie, programmi di attualità), telefonate, interviste e talk show, brevi monologhi, cogliendo situazione, stati d\'animo e intenzioni',
        'orale: dopo una breve presentazione, descrivere e commentare un\'immagine esprimendo la propria opinione',
        'orale: riassumere un breve testo e conversare sul suo argomento',
        'orale: role-play convincente e naturale in una situazione comunicativa ben definita',
    ],

    // Escala da composição (prova B.1, de 0 a 5 por competência).
    writingRubric: [
        'lessico: 5 = buono e sempre adeguato, rari errori ortografici; 4 = adeguato, pochi errori; 3 = quasi sempre adeguato, diversi (massimo quattro) errori, talvolta ripetitivo; 2 = semplice e spesso inadeguato; 0-1 = limitato, senso poco compiuto',
        'grammatica: 5 = una certa varietà di strutture, testo ben articolato, rari errori; 4 = pochi errori, qualche difficoltà nel collegamento tra frasi; 3 = strutture semplici, diversi (massimo quattro) errori, frasi non sempre collegate; 2 = strutture limitate, errori frequenti; 0-1 = errori sistematici',
        'sociolinguistica: 5 = moduli espressivi sempre corretti e appropriati; 4 = imperfezioni ma appropriati; 3 = errori che non compromettono l\'appropriatezza; 2 = spesso non appropriati; 0-1 = quasi sempre non appropriati',
        'coerenza e coesione: 5 = compito svolto totalmente, buon ordine logico e buona coesione; 4 = svolto totalmente, discreto ordine logico; 3 = alcune omissioni non rilevanti, ordine logico appena sufficiente; 2 = svolto solo in parte; 0-1 = svolto in minima parte',
    ],

    advanceBar: 'it would get at least "3 punti" in EACH dimension of the rubric (lexical, sociolinguistic and grammatical)',

    // Escala oral oficial (1 a 5 por competência). A competência fonética fica
    // de fora: o Don só vê texto/transcrição.
    oralRubric: [
        {
            dimension: 'competenza lessicale',
            levels: [
                '5 punti: repertorio buono e sempre adeguato, rari errori',
                '4 punti: adeguato, pochi errori',
                '3 punti: quasi sempre adeguato anche se talvolta ripetitivo, diversi errori',
                '2 punti: semplice e spesso inadeguato, errori frequenti e ripetizioni',
                '1 punto: limitato e inadeguato, errori sistematici che a volte rendono non compiuto il senso',
            ],
        },
        {
            dimension: 'competenza sociolinguistica (interazione)',
            levels: [
                '5 punti: sempre appropriato; partecipa attivamente, in modo sciolto, sicuro e spontaneo; quasi sempre si autocorregge',
                '4 punti: appropriato con imperfezioni; partecipa in modo relativamente sciolto e spontaneo',
                '3 punti: a volte non appropriato; risponde con qualche esitazione',
                '2 punti: spesso non appropriato; risponde con diverse esitazioni',
                '1 punto: quasi sempre non appropriato; non porta a termine il compito',
            ],
        },
        {
            dimension: 'competenza grammaticale',
            levels: [
                '5 punti: una certa varietà di strutture, rari errori, parlato ben articolato',
                '4 punti: pochi errori, qualche difficoltà nel collegamento tra frasi',
                '3 punti: strutture semplici, diversi errori, frasi non sempre ben collegate',
                '2 punti: strutture limitate, errori frequenti, scarsi collegamenti tra frasi',
                '1 punto: errori sistematici e difficoltà nella costruzione delle frasi',
            ],
        },
    ],
};
