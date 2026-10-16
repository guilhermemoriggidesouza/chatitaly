import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { COMPANY } from '../data/company'

export default function AboutPage() {
  return (
    <LegalPage title="Quem somos" updated={false}>
      <p className="legal-lead">
        O {COMPANY.product} nasceu de uma ideia simples: aprender italiano conversando, com alguém que corrige na
        hora e acompanha a sua evolução — sem perder o conteúdo sério dos bons livros.
      </p>

      <h2>O que fazemos</h2>
      <p>
        Transformamos livros consolidados de italiano em lições curtas e organizadas por temas. Depois de ler o
        resumo da lição, você conversa sobre o tema com o <strong>Don Italiano</strong>, o nosso professor feito
        com inteligência artificial: ele corrige os seus erros, explica o porquê e só deixa você avançar quando
        o tema estiver dominado.
      </p>

      <h2>O Don Italiano</h2>
      <p>
        O Don é um mentor paciente e bem-humorado, que fala italiano com você no site e, para assinantes, também
        no WhatsApp: manda o verbo do dia, faz perguntas sobre as suas lições e responde por texto ou áudio. Ele
        ajusta a dificuldade das frases ao seu nível, do A1 ao C2.
      </p>

      <h2>No que acreditamos</h2>
      <ul>
        <li>
          <strong>Conteúdo real:</strong> as lições vêm de bibliografia consolidada, não de textos inventados.
        </li>
        <li>
          <strong>Prática todos os dias:</strong> pouco por dia, mas sempre, vale mais do que maratonas de estudo.
        </li>
        <li>
          <strong>Erro é parte do caminho:</strong> o Don corrige sem julgamento, para você falar com mais
          confiança.
        </li>
      </ul>

      <h2>Fale com a gente</h2>
      <p>
        Dúvidas, sugestões ou problemas? Escreva para{' '}
        {COMPANY.contactEmail ? <a href={`mailto:${COMPANY.contactEmail}`}>{COMPANY.contactEmail}</a> : '[preencher]'}.
        Para conhecer o plano Premium, veja a seção de <Link to="/#planos">planos</Link>.
      </p>
    </LegalPage>
  )
}
