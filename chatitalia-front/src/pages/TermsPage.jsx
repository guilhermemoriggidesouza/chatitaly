import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { COMPANY, fill } from '../data/company'
import { PREMIUM_PRICE, TRIAL_DAYS } from '../data/plans'

export default function TermsPage() {
  const email = fill(COMPANY.contactEmail)

  return (
    <LegalPage title="Termos de uso">
      <p className="legal-lead">
        Estes termos regulam o uso do {COMPANY.product}, oferecido por {fill(COMPANY.legalName)} (
        {fill(COMPANY.document)}). Ao criar uma conta ou usar o serviço, você concorda com eles.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O {COMPANY.product} é uma plataforma de estudo de italiano com lições baseadas em livros e conversação
        com o Don Italiano, um assistente de inteligência artificial. No plano Premium, o Don também envia
        mensagens e conversa com você pelo WhatsApp.
      </p>

      <h2>2. Conta</h2>
      <ul>
        <li>Você precisa de uma conta para usar o serviço e é responsável por manter o acesso a ela em segurança.</li>
        <li>As informações que você nos fornece devem ser verdadeiras e estar atualizadas.</li>
        <li>A conta é pessoal: não compartilhe o seu acesso com outras pessoas.</li>
      </ul>

      <h2>3. Inteligência artificial</h2>
      <p>
        As respostas, correções, exemplos e áudios do Don Italiano são gerados por inteligência artificial. Eles
        são feitos para ajudar no estudo, mas podem conter erros. O serviço tem finalidade educacional e não
        substitui um professor ou uma certificação oficial de idioma.
      </p>

      <h2>4. Plano Premium e pagamento</h2>
      <ul>
        <li>
          O plano Premium custa {PREMIUM_PRICE} por mês, com os primeiros {TRIAL_DAYS} dias grátis. A cobrança é
          recorrente e feita pelo Mercado Pago; não armazenamos os dados do seu cartão.
        </li>
        <li>
          Você pode cancelar a assinatura a qualquer momento pelo Mercado Pago. O acesso Premium vale até o fim do
          período já pago.
        </li>
        <li>
          Conforme o Código de Defesa do Consumidor, você pode desistir da contratação em até 7 dias após a
          primeira cobrança e receber o valor de volta. Para isso, escreva para {email}.
        </li>
        <li>O preço pode mudar; avisaremos com antecedência antes de qualquer cobrança com valor novo.</li>
      </ul>

      <h2>5. Mensagens no WhatsApp</h2>
      <ul>
        <li>
          Só enviamos mensagens para o número que você cadastrar na página Configurar WhatsApp, nos dias e horários
          que você escolher.
        </li>
        <li>
          Você pode parar os envios a qualquer momento, desligando-os na mesma página ou removendo o número.
        </li>
        <li>As mensagens trocadas com o Don são usadas para responder e corrigir você (veja a <Link to="/privacidade">política de privacidade</Link>).</li>
      </ul>

      <h2>6. Uso adequado</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>usar o serviço para fins ilegais, ofensivos ou para assediar outras pessoas;</li>
        <li>tentar acessar contas ou dados de outros usuários, ou burlar o pagamento do plano Premium;</li>
        <li>copiar, revender ou redistribuir o conteúdo das lições;</li>
        <li>sobrecarregar o serviço com uso automatizado ou abusivo.</li>
      </ul>
      <p>Podemos suspender ou encerrar contas que descumpram estes termos.</p>

      <h2>7. Conteúdo e propriedade intelectual</h2>
      <p>
        As lições, os textos, a marca, o personagem Don Italiano e o software do {COMPANY.product} pertencem a{' '}
        {fill(COMPANY.legalName)} ou aos seus licenciantes. Você pode usá-los para o seu estudo pessoal.
      </p>

      <h2>8. Disponibilidade e responsabilidade</h2>
      <p>
        Trabalhamos para manter o serviço sempre no ar, mas ele pode ficar indisponível por manutenção, falhas
        técnicas ou de serviços de terceiros (como o WhatsApp). Na medida permitida pela lei, não nos
        responsabilizamos por danos indiretos decorrentes do uso ou da indisponibilidade do serviço.
      </p>

      <h2>9. Encerramento da conta</h2>
      <p>
        Você pode pedir o encerramento da sua conta e a exclusão dos seus dados a qualquer momento pelo e-mail{' '}
        {email}.
      </p>

      <h2>10. Mudanças nestes termos</h2>
      <p>
        Podemos atualizar estes termos. Quando a mudança for relevante, avisaremos no site ou por e-mail. A data
        da última atualização fica no topo desta página.
      </p>

      <h2>11. Lei e foro</h2>
      <p>
        Estes termos seguem as leis do Brasil. Fica eleito o foro de {fill(COMPANY.forum)}, ressalvado o direito
        do consumidor de usar o foro do seu domicílio.
      </p>

      <h2>Contato</h2>
      <p>Dúvidas sobre estes termos: {email}.</p>
    </LegalPage>
  )
}
