// Máscara do celular, sempre com o código do país: o campo começa em
// PHONE_PREFIX ("+55 ") e o brasileiro só digita o DDD e o número
// ("+55 (11) 99999-8888"; fixo com 8 dígitos: "+55 (11) 3333-4444"). Quem é
// de fora apaga o 55 e digita o código do país: fica "+" e os dígitos.
// `previous` é o valor antes da tecla: se a pessoa apagou só um caractere da
// máscara (os dígitos continuam iguais), apaga também o último dígito —
// senão a máscara recolocaria o caractere e o campo pareceria travado.
export const PHONE_PREFIX = '+55 '

export const maskPhone = (value, previous = '') => {
  const raw = String(value ?? '')
  let digits = raw.replace(/\D/g, '')
  if (raw.length < previous.length && digits === previous.replace(/\D/g, '')) {
    digits = digits.slice(0, -1)
  }

  digits = digits.slice(0, 15)
  if (!digits) return ''
  if (!digits.startsWith('55')) return `+${digits}`

  const local = digits.slice(2, 13)
  if (!local) return '+55'
  if (local.length <= 2) return `+55 (${local}`
  if (local.length <= 6) return `+55 (${local.slice(0, 2)}) ${local.slice(2)}`
  if (local.length <= 10) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
}

// Celular salvo na API (só dígitos, com DDI) -> como aparece no campo. Sem
// número salvo, o campo já começa com o +55.
export const formatSavedPhone = (phone) => maskPhone(String(phone ?? '')) || PHONE_PREFIX

// Tem código do país + DDD + número? (A API aceita de 11 a 15 dígitos: o
// menor é EUA/Canadá, DDI 1 + 10 dígitos.)
export const isPhoneComplete = (value) => String(value ?? '').replace(/\D/g, '').length >= 11
