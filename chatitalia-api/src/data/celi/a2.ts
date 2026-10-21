import { CeliReference } from './types';

// CELI 1 (A2) — Università per Stranieri di Perugia (CVCL).
// Resumo das competências exigidas e da escala oral oficial, usado como
// referência interna nos prompts. Não publicar este texto no site.
// (Os documentos do A2 não trazem a escala da produção escrita.)
export const CELI_A2: CeliReference = {
    level: 'A2',
    exam: 'CELI 1 (A2)',

    grammar: [
        'presente, passato prossimo e futuro (forma attiva e riflessiva) dell\'indicativo, verbi regolari e irregolari di largo uso',
        'condizionale di cortesia in forme fisse (vorrei, potrei...)',
        'imperativo nelle forme più comuni (scusi, mi dia, mi passi, guarda, prendi)',
        'nomi e articoli, con le concordanze',
        'pronomi personali soggetto; pronomi atoni e tonici diretti e indiretti; pronomi riflessivi',
        'pronomi possessivi, dimostrativi, relativi e interrogativi',
        'aggettivi qualificativi, possessivi, dimostrativi, indefiniti e interrogativi',
        'numerali cardinali',
        'preposizioni semplici e articolate',
        'avverbi di uso comune',
    ],

    vocabulary:
        'lessico della vita quotidiana: famiglia, occupazioni, fatti e situazioni di tutti i giorni, informazioni pratiche (orari, annunci, moduli)',

    tasks: [
        'lettura: capire il messaggio essenziale di testi brevi (cartelli, avvisi, avvertenze, istruzioni, pubblicità, orari, semplici questionari o moduli, annunci, brevi messaggi informali, brevi notizie)',
        'scrittura: completare brevi testi descrittivi o narrativi (lettere, cartoline, brevi cronache) su eventi quotidiani',
        'scrittura: scrivere un breve testo di circa 80 parole seguendo una traccia (lettera a parenti o amici, resoconto) con informazioni su di sé, la famiglia, il lavoro e la vita quotidiana',
        'ascolto: capire brevi dialoghi, annunci, messaggi di segreteria, brevi monologhi, presentazioni, descrizioni e racconti (situazione, funzione comunicativa, dati)',
        'orale: presentarsi e dare informazioni elementari su di sé',
        'orale: descrivere una sequenza di illustrazioni o vignette raccontando la semplice storia',
        'orale: role-play in una situazione quotidiana (chiedere informazioni, comunicare necessità e bisogni, ringraziare, prendere congedo)',
    ],

    advanceBar: 'it would get at least "3 punti" on the rubric: the task is done clearly, even with some hesitation and several errors',

    oralRubric: [
        {
            dimension: 'valutazione globale della produzione orale (da 1 a 4 punti)',
            levels: [
                '4 punti: porta a termine il compito in maniera semplice ma corretta, con pochi errori; si fa capire e si adegua agli interventi',
                '3 punti: porta a termine il compito con qualche esitazione e diversi errori, ma è chiaro e risponde agli interventi',
                '2,5 punti: porta a termine il compito con qualche difficoltà e frequenti errori che però non compromettono mai la comunicazione',
                '1 punto: porta a termine il compito solo in parte; errori sistematici che a volte rendono la comunicazione inadeguata o incomprensibile; molte interferenze con la lingua madre',
            ],
        },
    ],
};
