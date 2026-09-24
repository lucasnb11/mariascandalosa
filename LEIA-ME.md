# Maria Scandalosa Store — PagBank e Vercel

Esta versão 2.1 preserva a vitrine anterior, inclui endereço com preenchimento por CEP e um módulo de pagamento **preparado para ativação**. O cliente escolhe os itens, informa a entrega na loja, conclui Pix ou cartão na página segura do PagBank e volta à loja para acompanhar o status. Crédito pode ser parcelado até o limite configurado; juros e valor de cada parcela são apresentados no PagBank antes de confirmar. Débito requer liberação prévia na conta PagBank.

**Estado inicial:** os oito produtos continuam demonstrativos e nenhuma cobrança pode ser criada. Não use a área Administração local para cadastrar produtos reais: ela salva apenas no navegador e não altera o catálogo cobrado pelo servidor.

## Publicar na Vercel

1. Descompacte o projeto. Envie **todos** os arquivos e as pastas `api`, `lib` e `migrations` para a raiz de um repositório GitHub, incluindo `address.js` e `checkout-address.js`. Não envie um ZIP para dentro do repositório.
2. Importe o repositório em **Vercel → Add New → Project**. Framework Preset: **Other**. Deixe Build Command e Output Directory vazios. Node.js: versão compatível com `package.json` (22 ou superior).
3. Execute `supabase.sql` em um projeto Supabase reservado à loja. A tabela usa RLS e não tem política pública; somente as funções com service role acessam os pedidos.
4. Configure no painel da Vercel as variáveis da `.env.example`. Nunca coloque o token PagBank ou a service role no JavaScript público, GitHub ou ZIP preenchido.
5. Substitua o conteúdo de `catalog.json` pelos produtos reais: IDs estáveis, nomes, variações, preços em **centavos**, `source: "REAL"` e `active: true`. Atualize descrições e imagens. O navegador passa a receber esse catálogo quando o módulo estiver habilitado.
6. Teste primeiro com `PAGBANK_ENV=sandbox` e `PAYMENTS_ENABLED=true`, usando token de sandbox e URL da versão de teste. Verifique criação do checkout, retorno, webhook assinado, status `PAID`, recusas e Pix pendente. Só então use token de produção, `PAGBANK_ENV=production`, `STORE_BASE_URL` do domínio definitivo e faça novo deploy.

## Atualizar uma instalação anterior

1. No SQL Editor do Supabase, execute `migrations/002_shipping_address.sql` **antes** de publicar os novos arquivos. A migração adiciona a coluna de endereço e preserva os pedidos existentes. Quem instala pela primeira vez pode executar somente `supabase.sql`, que já inclui a atualização.
2. Substitua os arquivos do projeto no repositório e faça novo deploy na Vercel. Mantenha as variáveis de ambiente já configuradas; o preenchimento por CEP não precisa de chave.

## Endereço de entrega

- Ao selecionar **Receber no meu endereço**, o cliente informa um CEP de oito dígitos. O ViaCEP preenche rua/avenida, bairro, cidade e estado. Todos os campos continuam editáveis.
- **Número é obrigatório**; aceita `S/N` para endereço sem número. **Complemento é opcional**, com até 40 caracteres, e não é preenchido pelo serviço de CEP.
- CEP inexistente, resposta incompleta ou serviço indisponível permitem preencher o endereço manualmente. Consultas atrasadas de outro CEP são ignoradas.
- Na **retirada**, o formulário de endereço fica oculto, não é exigido e não é enviado ao PagBank.
- Na demonstração, é possível testar a entrega com dados fictícios. Nenhum pedido ou endereço é salvo no banco; somente o CEP digitado é enviado ao ViaCEP. O rascunho do endereço fica na memória da página e é descartado ao recarregar ou concluir a simulação.
- No checkout habilitado, o servidor valida o endereço, salva em `store_orders.shipping_address` e o envia em `shipping.address` ao PagBank, com `address_modifiable: false`. O cliente corrige o endereço na loja antes de continuar. Uma tentativa com endereço alterado gera um novo identificador de pedido.
- A consulta de CEP **não calcula frete nem confirma cobertura de entrega**. O valor continua fixo em `DELIVERY_FEE_CENTS`; sem essa configuração, o checkout habilitado oferece somente retirada.

Para testar localmente a vitrine, sirva a pasta por HTTP (por exemplo, `python3 -m http.server 8080`) e abra `http://localhost:8080`. Os scripts usam módulos JavaScript; abrir `index.html` diretamente como arquivo não é suportado. As rotas de pagamento precisam do ambiente Vercel.

## Verificações

Execute `npm test` com Node.js 22 ou superior. Os testes cobrem validação de endereço, complemento vazio, retirada, consulta de CEP com falha e respostas fora de ordem, persistência/envio do endereço, repetição do pedido, bloqueio de cobrança com catálogo fictício e assinatura do webhook. As chamadas a ViaCEP, PagBank e Supabase nesses testes são simuladas; a homologação da conta PagBank continua necessária.

## Configurações

| Variável | Uso |
| --- | --- |
| `PAGBANK_TOKEN` | Token secreto da conta PagBank para a API de Checkout. |
| `PAGBANK_ENV` | `sandbox` ou `production`. |
| `PAYMENTS_ENABLED` | `true` somente após cadastrar produtos reais e testar a integração. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Persistência privada de pedidos. |
| `STORE_BASE_URL` | Origem HTTPS exata da loja, sem barra final; usada no retorno e webhook. |
| `MAX_INSTALLMENTS` | Limite de parcelas no crédito, de 1 a 12, sujeito à conta PagBank. |
| `INTEREST_FREE_INSTALLMENTS` | Quantas parcelas têm juros assumidos pela loja. `0` evita prometer parcelamento sem juros. Confira as taxas antes de mudar. |
| `DEBIT_ENABLED` | Deixe `false` até a aprovação interna do débito pelo PagBank. |
| `DELIVERY_FEE_CENTS` | Frete fixo em centavos; se vazio, só há retirada a combinar. Defina política de entrega antes de habilitar. |

O endpoint `POST /api/checkout` recalcula o carrinho no servidor e não usa preços enviados pelo navegador. `POST /api/webhook` verifica `x-authenticity-token` com SHA-256 do **token + hífen + corpo bruto** e registra o pagamento apenas quando o valor informado corresponde ao pedido. `GET /api/status` consulta o estado com um token aleatório. O retorno do cliente à página da loja, por si só, nunca marca um pedido como pago.

## Limites desta versão

- O pagamento **não é digitado dentro da página da loja**: ocorre no checkout seguro do PagBank e retorna à loja. Isso permite Pix, crédito, débito aprovado e parcelas sem armazenar dados de cartão na loja. Um checkout transparente integral exigiria outra integração, incluindo criptografia do cartão e 3DS para débito.
- Não há cálculo de frete por CEP, controle de estoque nem autenticação para um painel de pedidos. O catálogo real é editado em `catalog.json`; os pedidos ficam na tabela `store_orders` e as transações também aparecem na conta PagBank. Antes da operação diária, defina o processo de separação e entrega.
- Sem credenciais de sandbox e sem produtos reais, não foi possível validar transações reais ou de teste contra a conta da boutique.

Referências oficiais: [ViaCEP](https://viacep.com.br/), [API de Checkout PagBank](https://developer.pagbank.com.br/docs/checkout), [Criar Checkout](https://developer.pagbank.com.br/reference/criar-checkout), [Objeto Checkout](https://developer.pagbank.com.br/reference/objeto-checkout), [assinatura das notificações](https://developer.pagbank.com.br/reference/confirmar-autenticidade-da-notificacao) e [Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js).
