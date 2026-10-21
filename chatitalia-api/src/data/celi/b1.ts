import { CeliReference } from './types';

// CELI 2 (B1) — Università per Stranieri di Perugia (CVCL).
// Resumo das competências exigidas e das escalas oficiais (escrita e oral),
// usado como referência interna nos prompts. Não publicar este texto no site.
export const CELI_B1: CeliReference = {
    level: 'B1',
    exam: 'CELI 2 (B1)',

    grammar: [
        'indicativo: presente, passato prossimo, futuro semplice e imperfetto (descrittivo e iterativo)',
        'condizionale presente per richieste, bisogni e desideri in forma cortese',
        'imperativo, anche nella forma di cortesia (Lei)',
        'frasi complesse coordinate e subordinate più ricorrenti, con la correlazione dei tempi',
        'pronomi combinati e particelle pronominali ci e ne',
        'concordanza del participio passato',
        'pronomi relativi, indefiniti e pronomi "doppi" (chi)',
        'gradi dell\'aggettivo (comparativo e superlativo) e formazione degli avverbi',
        'congiunzioni coordinative e subordinative più usate, interiezioni, numerali',
        'preposizioni semplici e articolate nei rapporti più ricorrenti',
    ],

    vocabulary:
        'lessico della vita quotidiana, non tecnico: famiglia, città, casa, lavoro, hobby, servizi, ristorante e ricette, annunci, notizie, pagamenti',

    tasks: [
        'lettura: capire il messaggio e informazioni specifiche di brevi testi (avvisi, messaggi promozionali, inserzioni, storie, notizie, annunci, istruzioni, menu, ricette, avvisi di pagamento) e completare frasi e testi',
        'scrittura: rispondere a un modulo o questionario su argomenti di interesse generale',
        'scrittura: scrivere o rispondere a un breve annuncio di vita quotidiana (circa 50 parole)',
        'scrittura: scrivere una breve lettera o e-mail seguendo una traccia (90-100 parole)',
        'ascolto: capire annunci, messaggi di segreteria, brevi dialoghi, notizie, pubblicità, conversazioni telefoniche e faccia a faccia, brevi monologhi',
        'orale: parlare di sé descrivendo la famiglia, la città, la casa, il lavoro o gli hobby',
        'orale: descrivere una foto ed esprimere semplici valutazioni su di essa',
        'orale: role-play in una situazione quotidiana, capendo le domande e rispondendo in modo appropriato',
    ],

    // Escala da lettera/e-mail (prova B.3, de 0 a 5 por competência).
    writingRubric: [
        'lessico: 5 = sempre adeguato, rari errori ortografici; 4 = semplice, quasi sempre adeguato, talvolta ripetitivo; 3 = semplice ma a tratti inadeguato, diversi (massimo sei) errori; 2 = limitato, errori frequenti; 0-1 = povero, senso non compiuto',
        'grammatica: 5 = strutture semplici, rari errori, buon collegamento tra frasi; 4 = pochi errori, frasi a volte poco collegate; 3 = diversi (massimo sei) errori che non compromettono la comunicazione, correlazione dei tempi rispettata; 2 = errori frequenti, correlazione dei tempi spesso non rispettata; 0-1 = testo poco comprensibile',
        'sociolinguistica: 5 = moduli espressivi sempre appropriati; 4 = qualche errore che non compromette l\'appropriatezza; 3 = non sempre appropriati ma si fa capire in gran parte; 2 = spesso non appropriati; 0-1 = non si fa capire',
        'coerenza e coesione: 5 = compito svolto totalmente, ben organizzato, coeso e lineare; 4 = svolto totalmente, discreto ordine logico; 3 = alcune omissioni non rilevanti, ordine logico appena sufficiente; 2 = svolto solo in parte; 0-1 = svolto in minima parte',
    ],

    advanceBar: 'it would get at least "3 punti" in EACH dimension of the rubric (lexical, sociolinguistic and grammatical)',

    // Escala oral oficial (1 a 5 por competência). A competência fonética fica
    // de fora: o Don só vê texto/transcrição.
    oralRubric: [
        {
            dimension: 'competenza lessicale',
            levels: [
                '5 punti: repertorio sempre adeguato, rari errori',
                '4 punti: semplice, quasi sempre adeguato, pochi errori e ripetizioni',
                '3 punti: semplice ma a volte inadeguato, diversi errori e ripetizioni',
                '2 punti: limitato, spesso inadeguato, errori frequenti che a volte rendono poco compiuto il senso',
                '1 punto: povero, inadeguato, errori sistematici; il senso non è compiuto',
            ],
        },
        {
            dimension: 'competenza sociolinguistica (interazione)',
            levels: [
                '5 punti: discorso sempre appropriato alla situazione; capisce e interagisce senza sforzo; spesso si autocorregge',
                '4 punti: quasi sempre appropriato, piccole esitazioni; si fa sempre capire',
                '3 punti: non sempre appropriato, ma si fa capire in gran parte; esitazioni evidenti',
                '2 punti: spesso non appropriato; non sempre si fa capire e non porta a termine il compito',
                '1 punto: non appropriato; non si fa capire',
            ],
        },
        {
            dimension: 'competenza grammaticale',
            levels: [
                '5 punti: strutture semplici, rari errori, buon collegamento tra frasi',
                '4 punti: pochi errori, frasi a volte non ben collegate',
                '3 punti: diversi errori che non compromettono mai la comunicazione; frasi poco collegate ma correlazione dei tempi rispettata',
                '2 punti: errori frequenti che a volte rendono poco comprensibile il messaggio; correlazione dei tempi spesso non rispettata',
                '1 punto: errori sistematici che rendono poco comprensibile il messaggio',
            ],
        },
    ],
};
