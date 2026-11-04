// Acesso relâmpago ao Don no WhatsApp ("Não acredita? Prove"), sem conta.
// Um por celular. Vale só no dia (horário de Brasília) em que foi cadastrado.
export type WhatsTrial = {
    // Só dígitos, com DDI (como o whatsConfig.phone do aluno).
    phone: string,
    name: string,
    level: string,
    // Livro do nível escolhido: de onde sai o tema da pergunta do dia.
    bookId?: string,
    // Dia do cadastro (YYYY-MM-DD, America/Sao_Paulo): o teste vale só nele.
    dateKey: string,
    createdAt: string,
    // Primeira mensagem da pessoa: é quando o Don manda o verbo e a pergunta.
    startedAt?: string,
    // Aviso de "seu dia acabou" já enviado (vai uma vez só).
    endedNoticeAt?: string,
}
