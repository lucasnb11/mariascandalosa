# Maria Scandalosa Store — catálogo recebido até 25/09/2026

Esta versão reúne **194 anúncios reais transcritos dos prints** em sete categorias: Masturbadores (11), Bolinhas Tailandesas (6), Cinta Liga (12), Beijáveis (10), Body (19), Sadomasoquismo (88) e Acessórios (48). A vitrine anterior continua com oito itens de demonstração, identificados como exemplos.

O arquivo `CATALOGO_PARA_CONFERENCIA.xlsx` traz uma linha por anúncio, com nome, categoria, preço, preço anterior, descrição disponível, variação observada, arquivo da foto e print de origem. A pasta `assets/catalogo/` contém **183 imagens recortadas** dos prints novos. Os 11 Masturbadores usam as três imagens de print já existentes em `assets/`, também incorporadas ao `store.js` por compatibilidade com a versão anterior.

## Estado da loja e dos pagamentos

Todos os anúncios dos prints estão em **revisão**, com `active: false`. Dois produtos em Beijáveis apareciam por R$ 0,00: exibem **Preço a confirmar** e não podem ser adicionados à sacola. Os outros preços foram transcritos literalmente dos prints; não se confirmou estoque, descrição técnica nem a equivalência de todas as variações. Nomes genéricos como “Body” e “Masturbador” receberam identificadores de modelo para distinguir as fotos.

O checkout preparado para PagBank suporta Pix e crédito, incluindo parcelas conforme a conta e suas variáveis de ambiente. Débito depende de habilitação na conta PagBank. **Nenhuma cobrança está habilitada nesta versão**, mesmo que alguém preencha as chaves: o servidor exige ao menos um item real e aprovado. Só marque `active: true` após confirmar dados e disponibilidade, configurar a conta e testar sandbox. A área Administração da página edita apenas exemplos locais no navegador; o catálogo real é editado em `catalog.json`.

## Publicar atualização na Vercel

1. Descompacte o ZIP e envie **o conteúdo inteiro da pasta** para a raiz do repositório GitHub usado na Vercel. Envie principalmente `catalog.json`, `store.js` e **toda a pasta `assets/`**, inclusive `assets/catalogo/`; sem ela, as fotos das novas categorias não aparecem. Não envie apenas o ZIP como arquivo ao repositório.
2. Faça commit. A Vercel fará novo deploy automaticamente se o repositório estiver conectado. Atualize a página com `Ctrl+F5` se o navegador mostrar dados antigos.
3. Mantenha as variáveis de ambiente e o banco Supabase que já configurou. **Esta atualização do catálogo não exige novo SQL.** Em instalação nova, execute `supabase.sql` no projeto Supabase dedicado à loja. Para atualizar uma instalação anterior que ainda não tenha a coluna de endereço, execute `migrations/002_shipping_address.sql` antes do deploy.

O projeto usa Framework Preset **Other**, sem comando de build nem pasta de saída, e Node.js compatível com `package.json` (22 ou superior). A página usa `catalog.json` para mostrar anúncios em revisão e a API para os produtos que vierem a ser liberados para pagamento. Sirva a pasta por HTTP para testar localmente, por exemplo `python3 -m http.server 8080`; abrir `index.html` diretamente não carrega os módulos corretamente.

## Conferência antes de liberar cobranças

- Confira preços atuais, nomes, variações, fotos, descrições, estoque e política de frete. O preenchimento do CEP consulta ViaCEP e completa rua, bairro, cidade e estado; número é obrigatório, complemento é opcional. A consulta não calcula frete nem verifica área atendida.
- Atualize cada anúncio em `catalog.json`, substitua as fotos extraídas de prints por originais quando disponíveis e marque `active: true` apenas nos anúncios verificados. No momento, os 194 têm `active: false`.
- Para pagamentos, configure `PAGBANK_TOKEN`, `PAGBANK_ENV=sandbox`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORE_BASE_URL`, `PAYMENTS_ENABLED=true` e as políticas `DELIVERY_FEE_CENTS`, `MAX_INSTALLMENTS`, `INTEREST_FREE_INSTALLMENTS` e `DEBIT_ENABLED` conforme necessário. As configurações ficam **somente na Vercel**, nunca no GitHub ou no JavaScript público.
- Teste o fluxo de sandbox com Pix, cartão, webhook e status do pedido. Depois configure token e URL definitivos e passe `PAGBANK_ENV` para `production`.

No checkout a cobrança acontece na página segura do PagBank e o comprador retorna à loja. O servidor recalcula valores pelo catálogo aprovado e verifica a assinatura do webhook antes de marcar o pedido pago. Não há cálculo de frete por CEP, controle de estoque nem painel autenticado para editar o catálogo.

Execute `npm test` para os testes locais. Os serviços externos são simulados nos testes; não foi possível validar pagamento real sem a conta PagBank da boutique.
