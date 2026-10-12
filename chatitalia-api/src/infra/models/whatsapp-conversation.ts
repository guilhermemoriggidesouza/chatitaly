export type WhatsMessage = {
    // 'assistant' = o Don (resposta ou mensagem agendada); 'user' = o aluno.
    role: 'user' | 'assistant',
    content: string,
    at: string
}

// Conversa de um aluno no WhatsApp em um dia (collection
// `whatsapp_conversations`, um documento por usuário por dia). Nada é
// apagado: o Don usa como contexto só o documento do dia atual.
export type WhatsConversation = {
    userId: string,
    // Dia local (YYYY-MM-DD, no fuso do aluno).
    dateKey: string,
    messages: WhatsMessage[],
    updatedAt: string
}
