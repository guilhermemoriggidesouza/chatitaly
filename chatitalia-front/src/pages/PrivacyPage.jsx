import LegalPage from '../components/LegalPage'
import { COMPANY, fill } from '../data/company'

export default function PrivacyPage() {
  const email = fill(COMPANY.contactEmail)

  return (
    <LegalPage title="Política de privacidade">
      <p className="legal-lead">
        Esta política explica quais dados pessoais o {COMPANY.product} coleta, por que coleta, com quem
        compartilha e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei
        13.709/2018). O controlador dos dados é {fill(COMPANY.legalName)} ({fill(COMPANY.document)}).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome e e-mail, informados no cadastro ou trazidos do login com o Google.
        </li>
        <li>
          <strong>Estudo:</strong> nível, livro, lições e temas concluídos e as anotações de progresso feitas pelo
          Don.
        </li>
        <li>
          <strong>Conversas no site:</strong> o que você escreve ou fala para o Don. O áudio gravado é enviado para
          transcrição e não fica guardado; guardamos apenas o texto quando necessário para o funcionamento da
          lição.
        </li>
        <li>
          <strong>WhatsApp (Premium):</strong> o número de celular, o fuso horário, os dias e horários escolhidos e
          as mensagens trocadas com o Don, incluindo a transcrição dos áudios que você enviar.
        </li>
        <li>
          <strong>Assinatura:</strong> se você é assinante e a data de ativação. Os dados de pagamento ficam com o
          Mercado Pago; não recebemos nem guardamos o número do seu cartão.
        </li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e manter a sua conta e o seu progresso nas lições;</li>
        <li>Gerar as respostas, correções, exemplos e áudios do Don Italiano;</li>
        <li>Enviar as mensagens do WhatsApp que você configurou e responder às suas mensagens;</li>
        <li>Liberar e conferir o plano Premium;</li>
        <li>Dar suporte e melhorar o serviço.</li>
      </ul>
      <p>
        As bases legais são a execução do contrato com você (o serviço que você contratou), o cumprimento de
        obrigações legais e o seu consentimento, quando for o caso — por exemplo, ao cadastrar o seu WhatsApp.
      </p>

      <h2>3. Com quem compartilhamos</h2>
      <p>
        Não vendemos os seus dados. Compartilhamos apenas o necessário com os fornecedores que fazem o serviço
        funcionar, alguns deles com servidores fora do Brasil:
      </p>
      <ul>
        <li><strong>Clerk:</strong> login e gerenciamento da conta;</li>
        <li><strong>Google:</strong> se você entrar com a sua conta Google;</li>
        <li>
          <strong>Provedores de inteligência artificial</strong> (acessados por meio do OpenRouter): processam o
          texto e o áudio das conversas para gerar as respostas e as transcrições;
        </li>
        <li><strong>MongoDB Atlas e Oracle Cloud:</strong> banco de dados e servidores do serviço;</li>
        <li><strong>Vercel:</strong> hospedagem do site;</li>
        <li><strong>Mercado Pago:</strong> cobrança da assinatura;</li>
        <li><strong>WhatsApp:</strong> entrega das mensagens, para quem ativar os envios.</li>
      </ul>
      <p>Também podemos compartilhar dados quando a lei ou uma autoridade competente exigir.</p>

      <h2>4. Cookies e armazenamento no navegador</h2>
      <p>
        Usamos apenas cookies e armazenamento essenciais para o funcionamento do site, como os que mantêm você
        logado e os que lembram se você fechou um aviso. Não usamos cookies de publicidade nem de rastreamento.
        Se isso mudar, vamos pedir o seu consentimento antes.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Guardamos os seus dados enquanto a sua conta estiver ativa. Se você pedir a exclusão da conta, apagamos os
        dados pessoais, exceto o que a lei nos obrigar a manter por mais tempo.
      </p>

      <h2>6. Segurança</h2>
      <p>
        Adotamos medidas técnicas para proteger os seus dados, como conexões criptografadas e acesso restrito aos
        sistemas. Nenhum sistema é totalmente imune a falhas; se ocorrer um incidente relevante, avisaremos você e
        a autoridade competente, como manda a lei.
      </p>

      <h2>7. Os seus direitos</h2>
      <p>Pela LGPD, você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar se tratamos os seus dados e ter acesso a eles;</li>
        <li>corrigir dados incompletos ou desatualizados;</li>
        <li>pedir a exclusão, a portabilidade ou a anonimização dos dados;</li>
        <li>revogar o consentimento, como parar os envios do WhatsApp;</li>
        <li>saber com quem compartilhamos os seus dados.</li>
      </ul>
      <p>Para exercer esses direitos, escreva para {email}. Respondemos em até 15 dias.</p>

      <h2>8. Menores de idade</h2>
      <p>
        O serviço é destinado a maiores de 18 anos ou a menores com autorização e acompanhamento dos pais ou
        responsáveis.
      </p>

      <h2>9. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política. Quando a mudança for relevante, avisaremos no site ou por e-mail. A data
        da última atualização fica no topo desta página.
      </p>

      <h2>Contato</h2>
      <p>Encarregado pelo tratamento de dados: {fill(COMPANY.legalName)} — {email}.</p>
    </LegalPage>
  )
}
