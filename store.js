import {BRAZIL_STATES} from './address.js';
import {mountAddressForm} from './checkout-address.js';

const demoProducts=[
 {id:'p1',name:'Body de renda Aurora',category:'Lingerie',price:89.90,description:'Body de renda delicada com alças ajustáveis. Produto demonstrativo.',variants:['P','M','G'],symbol:'A'},
 {id:'p2',name:'Camisola Noite Rosé',category:'Lingerie',price:74.90,description:'Camisola leve com detalhes em renda. Produto demonstrativo.',variants:['P','M','G'],symbol:'N'},
 {id:'p3',name:'Gel de massagem Frutas Vermelhas',category:'Cosméticos',price:39.90,description:'Gel de massagem com aroma de frutas vermelhas. Produto demonstrativo.',variants:['120 ml'],symbol:'G'},
 {id:'p4',name:'Óleo corporal Sensações',category:'Cosméticos',price:48.00,description:'Óleo corporal aromático. Produto demonstrativo.',variants:['100 ml'],symbol:'S'},
 {id:'p5',name:'Kit Momento a Dois',category:'Kits',price:119.90,description:'Seleção demonstrativa de itens para presentear.',variants:['Único'],symbol:'M'},
 {id:'p6',name:'Venda de cetim',category:'Acessórios',price:29.90,description:'Acessório em cetim macio. Produto demonstrativo.',variants:['Preto','Vinho'],symbol:'V'},
 {id:'p7',name:'Robe Elegance',category:'Lingerie',price:109.90,description:'Robe leve com faixa na cintura. Produto demonstrativo.',variants:['P/M','G/GG'],symbol:'E'},
 {id:'p8',name:'Vela de massagem Flor de Cerejeira',category:'Cosméticos',price:59.90,description:'Vela aromática para massagem. Produto demonstrativo.',variants:['Único'],symbol:'F'}
];
const key='ms_store_products_demo_v1',cartKey='ms_store_cart_demo_v1';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
let products=read(key,demoProducts),cart=read(cartKey,[]),filter='Todos',term='',sort='featured',editing=null;
let paymentSettings={ready:false,debit:false,installments:6,free:0,delivery:false};
let addressController=null,checkoutDraft=null,previewProducts=[];
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
const money=n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=()=>{if(!paymentSettings.ready)localStorage.setItem(key,JSON.stringify(products.filter(p=>p.source!=='REAL')));localStorage.setItem(cartKey,JSON.stringify(cart));document.querySelector('#cartCount').textContent=cart.reduce((n,x)=>n+x.qty,0)};
const art=p=>{
  const c=p.image_crop;
  if(c && /^assets\/kyte-masturbadores-0[1-3]\.(jpeg|png)$/.test(p.image) && c.source_width>c.size && c.source_height>c.size){
    const scale=(c.source_width/c.size*100).toFixed(3),x=(c.x/(c.source_width-c.size)*100).toFixed(3),y=(c.y/(c.source_height-c.size)*100).toFixed(3);
    return `<div class="product-art product-shot" role="img" aria-label="Foto do produto ${esc(p.name)}" style="background-image:url('${esc(p.image)}');background-size:${scale}% auto;background-position:${x}% ${y}%"></div>`;
  }
  return `<div class="product-art">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}">`:`<span class="art-letter">${esc(p.symbol||'M')}</span>`}</div>`;
};
const priceTag=p=>`<div class="price">${p.original_price_cents?`<small class="old-price">${money(p.original_price_cents/100)}</small>`:''}${money(p.price)}</div>`;
const card=p=>`<article class="product-card">${art(p)}<div class="product-info"><small>${esc(p.category)}${p.source==='REAL'&&!paymentSettings.ready?' · Cadastro em revisão':paymentSettings.ready?'':' · Exemplo'}</small><h3>${esc(p.name)}</h3>${priceTag(p)}<div class="product-actions"><a href="#/produto/${encodeURIComponent(p.id)}">Detalhes</a><button data-add="${esc(p.id)}">Adicionar</button></div></div></article>`;
const categories=()=>['Todos',...new Set(products.map(p=>p.category))];
function catalog(home=false){let arr=products.filter(p=>(filter==='Todos'||p.category===filter)&&(`${p.name} ${p.description}`.toLowerCase().includes(term.toLowerCase())));if(sort==='low')arr.sort((a,b)=>a.price-b.price);if(sort==='high')arr.sort((a,b)=>b.price-a.price);return `${home?`<section class="store-intro"><div class="intro-copy"><span class="eyebrow">Boutique Maria Scandalosa · Belém</span><h1>Descubra seu lado <span>scandalosa.</span></h1><p>${paymentSettings.ready?'Encontre seus produtos e finalize a compra com pagamento protegido pelo PagBank.':'Conheça os produtos cadastrados a partir dos prints do catálogo. Os demais itens ainda são demonstrativos; pagamentos estão desativados.'}</p><a class="btn btn-primary" href="#/catalogo">Explorar produtos</a></div><div class="intro-visual"><img src="boutique-editorial.webp" alt="Robe de renda e óleo corporal em composição ilustrativa"></div></section>`:''}<div class="section-label"><h2>${home?'Uma prévia da loja':'Explore a loja'}</h2><span class="muted">${arr.length} produto${arr.length===1?'':'s'} ${paymentSettings.ready?'':'na vitrine'}</span></div><div class="chips">${categories().map(c=>`<button class="chip ${c===filter?'active':''}" data-category="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="catalog-tools"><input id="search" type="search" aria-label="Buscar produtos" placeholder="Buscar na vitrine" value="${esc(term)}"><select id="sort" aria-label="Ordenar produtos"><option value="featured" ${sort==='featured'?'selected':''}>Destaques</option><option value="low" ${sort==='low'?'selected':''}>Menor preço</option><option value="high" ${sort==='high'?'selected':''}>Maior preço</option></select></div><div class="product-grid">${arr.map(card).join('')||'<p class="muted">Nenhum produto encontrado.</p>'}</div>${home?'<div class="section-label"><h2>Atendimento discreto</h2></div><p class="muted">Loja física em Belém e atendimento pelo WhatsApp. Prazo, entrega e disponibilidade serão definidos na versão com o catálogo oficial.</p>':''}`}
function productPage(id){const p=products.find(x=>x.id===id);if(!p)return empty('Produto não encontrado.');return `<a class="back" href="#/catalogo">← Voltar ao catálogo</a><div class="two-col"><div class="detail-art">${art(p)}</div><div class="detail-copy"><span class="eyebrow">${esc(p.category)}${p.source==='REAL'&&!paymentSettings.ready?' · Cadastro em revisão':paymentSettings.ready?'':' · Produto de exemplo'}</span><h1>${esc(p.name)}</h1><p>${esc(p.description)}</p>${priceTag(p)}<label class="field-row">Variação<select id="variant" class="form-control">${p.variants.map(v=>`<option>${esc(v)}</option>`).join('')}</select></label><div class="inline-actions"><button class="btn btn-primary" data-add="${esc(p.id)}" data-variant="selected">Adicionar à sacola</button><a class="btn btn-secondary" href="#/carrinho">Ver sacola</a></div><div class="disclaimer">${paymentSettings.ready?'A disponibilidade e o valor final serão confirmados no pagamento.':p.source==='REAL'?'Preço visto no print; descrição, variação e disponibilidade precisam ser confirmadas. O pagamento está desativado.':'Preço e disponibilidade ilustrativos. Não finalize um pedido real por esta versão.'}</div></div></div>`}
function empty(msg){return `<div class="empty"><h2>${esc(msg)}</h2><a class="btn btn-primary" href="#/catalogo">Ver produtos</a></div>`}
function total(){return cart.reduce((n,x)=>n+(products.find(p=>p.id===x.id)?.price||0)*x.qty,0)}
function cartPage(){if(!cart.length)return empty('Sua sacola está vazia');return `<div class="page-heading"><h1 class="page-title">Sua sacola</h1><p>${paymentSettings.ready?'Confira os itens antes de continuar.':'Confira os itens demonstrativos antes de continuar.'}</p></div><div class="two-col"><div class="panel">${cart.map((x,i)=>{const p=products.find(p=>p.id===x.id);return p?`<div class="cart-line"><div><strong>${esc(p.name)}</strong><small>${esc(x.variant)} · ${money(p.price)} cada</small><button class="text-button" data-remove="${i}">Remover</button></div><div class="quantity"><button data-qty="${i}" data-delta="-1" aria-label="Diminuir quantidade">−</button>${x.qty}<button data-qty="${i}" data-delta="1" aria-label="Aumentar quantidade">+</button></div><strong>${money(p.price*x.qty)}</strong></div>`:''}).join('')}</div><div class="panel"><h2>Resumo</h2><div class="summary"><span>Subtotal</span><span>${money(total())}</span></div><p class="muted">${paymentSettings.ready?'O frete, se houver, aparece antes da confirmação no PagBank.':'Frete e pagamento não estão disponíveis nesta demonstração.'}</p><a class="btn btn-primary" href="#/checkout">Continuar</a></div></div>`}
function checkout(){
  if(!cart.length)return empty('Sua sacola está vazia');
  const real=paymentSettings.ready,canDeliver=!real||paymentSettings.delivery;
  return `<div class="page-heading"><h1 class="page-title">${real?'Finalizar pedido':'Checkout demonstrativo'}</h1><p>${real?'Informe a entrega e continue para a página segura do PagBank.':'Os itens e preços ainda são de exemplo. Nenhuma cobrança será criada.'}</p></div>
  <div class="checkout-grid"><form id="checkoutForm" class="panel checkout-form">
    <h2>Como você quer receber?</h2>
    <label for="delivery">Forma de entrega</label>
    <select id="delivery" class="form-control" name="delivery">
      ${canDeliver?`<option value="delivery">Receber no meu endereço${real?' (+ '+money(paymentSettings.deliveryFeeCents/100)+')':' · simulação'}</option>`:''}
      <option value="pickup">Retirada a combinar</option>
    </select>
    <fieldset id="shippingAddress" class="address-fields">
      <legend>Endereço de entrega</legend>
      <p class="muted address-intro">Comece pelo CEP e confira os dados preenchidos.${real?'':' Para testar, use um endereço fictício.'}</p>
      <div class="address-grid">
        <div class="address-wide">
          <label for="postalCode">CEP</label>
          <div class="cep-control"><input id="postalCode" class="form-control" name="postal_code" inputmode="numeric" autocomplete="shipping postal-code" placeholder="00000-000" pattern="[0-9]{5}-?[0-9]{3}" maxlength="9" required aria-describedby="cepStatus"><button id="searchCep" class="btn btn-secondary" type="button">Buscar CEP</button></div>
          <p id="cepStatus" class="field-help" role="status" aria-live="polite"></p>
        </div>
        <label class="address-wide" for="street">Rua / avenida<input id="street" class="form-control" name="street" autocomplete="shipping address-line1" maxlength="160" required></label>
        <label for="streetNumber">Número<input id="streetNumber" class="form-control" name="number" autocomplete="off" maxlength="20" required placeholder="Ex.: 123 ou S/N"></label>
        <label for="complement">Complemento (opcional)<input id="complement" class="form-control" name="complement" autocomplete="shipping address-line2" maxlength="40" placeholder="Apartamento, bloco, referência"></label>
        <label class="address-wide" for="locality">Bairro<input id="locality" class="form-control" name="locality" autocomplete="shipping address-level3" maxlength="60" required></label>
        <label for="city">Cidade<input id="city" class="form-control" name="city" autocomplete="shipping address-level2" maxlength="90" required></label>
        <label for="regionCode">Estado<select id="regionCode" class="form-control" name="region_code" autocomplete="shipping address-level1" required><option value="">Selecione</option>${BRAZIL_STATES.map(uf=>`<option value="${uf}">${uf}</option>`).join('')}</select></label>
      </div>
      <small class="muted">Você pode corrigir todos os campos. Em endereço sem número, informe S/N.</small>
    </fieldset>
    <h2>Pagamento</h2>
    <div class="payment-options"><div><strong>Pix</strong><small>Confirmação pelo PagBank</small></div><div><strong>Crédito</strong><small>Até ${paymentSettings.installments}x; valores e juros apresentados antes da confirmação</small></div><div><strong>Débito</strong><small>${paymentSettings.debit?'Disponível conforme o cartão':'Aguardando liberação na conta PagBank'}</small></div></div>
    <button class="btn btn-primary" type="submit">${real?'Continuar para pagamento seguro':'Simular confirmação'}</button>
    <p id="checkoutError" class="checkout-error" role="alert"></p>
    <small class="muted">${real?'O endereço de entrega será enviado ao PagBank. Você informará os dados pessoais e de pagamento na página segura e retornará para acompanhar o pedido.':'O endereço não será salvo nem enviado ao PagBank nesta demonstração.'}</small>
  </form><aside class="panel checkout-summary"><h2>Resumo</h2>
    ${cart.map(x=>{const p=products.find(p=>p.id===x.id);return p?`<p>${x.qty} × ${esc(p.name)} · ${esc(x.variant)}</p>`:''}).join('')}
    <div class="summary"><span>Subtotal</span><span>${money(total())}</span></div>
    <div class="shipping-summary"><span>Frete</span><span id="shippingCost"></span></div>
    <div class="summary" aria-live="polite"><span>${real?'Total':'Total ilustrativo'}</span><span id="checkoutTotal"></span></div>
    <p class="muted">${real?'Confira o endereço antes de continuar. O frete informado será somado ao subtotal.':'Valores fictícios. O frete da entrega ainda será definido; nenhuma cobrança será feita.'}</p>
  </aside></div>`;
}
function mountCheckoutAddress(){
  const form=document.querySelector('#checkoutForm');
  if(!form)return;
  addressController=mountAddressForm(form,{draft:checkoutDraft,onDeliveryChange(delivery){
    const fee=delivery==='delivery'&&paymentSettings.ready?paymentSettings.deliveryFeeCents/100:0;
    document.querySelector('#shippingCost').textContent=delivery==='delivery'&&!paymentSettings.ready?'A definir':money(fee);
    document.querySelector('#checkoutTotal').textContent=money(total()+fee);
  }});
}
function orderStatus(token){return `<div class="success"><h1 class="page-title">Acompanhar pagamento</h1><p id="orderResult">Consultando o pedido no PagBank...</p><button id="refreshStatus" class="btn btn-secondary">Atualizar status</button><p class="muted">O retorno à loja não confirma o pagamento. Aguarde a atualização do status.</p></div>`}
async function refreshStatus(token){const el=document.querySelector('#orderResult');if(!el)return;if(!/^[a-f\d]{64}$/i.test(token)){el.textContent='Identificador de pedido inválido.';return}try{const res=await fetch(`/api/status?token=${encodeURIComponent(token)}`),data=await res.json();if(!res.ok)throw Error(data.error||'Falha na consulta.');const labels={PAID:'Pagamento confirmado',WAITING:'Aguardando pagamento',IN_ANALYSIS:'Pagamento em análise',DECLINED:'Pagamento recusado',CANCELED:'Pagamento cancelado',EXPIRED:'Checkout expirado',CREATING:'Preparando pagamento',FAILED:'Falha ao iniciar o pagamento'};el.textContent=`${labels[data.status]||'Status: '+data.status} · Pedido ${data.reference_id} · ${money(data.total_cents/100)}`;if(data.status==='PAID'){cart=[];save()}}catch(err){el.textContent=err.message}}
async function loadPayments(){
  try{
    const [settingsRes,catalogRes,previewRes]=await Promise.all([fetch('/api/checkout'),fetch('/api/catalog'),fetch('catalog.json',{cache:'no-cache'})]);
    let preview=[];
    if(previewRes.ok){
      const data=await previewRes.json();
      if(Array.isArray(data))preview=data.filter(p=>p.source==='REAL').map(p=>({
        id:p.id,name:p.name,category:p.category,price:p.price_cents/100,
        description:p.description||'',variants:p.variants,image:p.image||'',image_crop:p.image_crop,
        original_price_cents:p.original_price_cents,source:'REAL',review_status:p.review_status
      }));
    }
    if(settingsRes.ok&&catalogRes.ok){
      const settings=await settingsRes.json(),catalog=await catalogRes.json();
      if(settings.ready&&catalog.ready&&Array.isArray(catalog.products)&&catalog.products.length){
        paymentSettings=settings;
        const banner=document.querySelector('.demo-bar');
        if(settings.environment==='production')banner.hidden=true;
        else banner.textContent='Ambiente de testes PagBank · Não há cobrança real';
        products=catalog.products;
        if(localStorage.getItem('ms_catalog_mode')!=='real'){cart=[];localStorage.setItem('ms_catalog_mode','real')}
        cart=cart.filter(x=>products.some(p=>p.id===x.id&&p.variants.includes(x.variant)));
        render();return;
      }
    }
    if(preview.length){
      previewProducts=preview;
      products=[...preview,...read(key,demoProducts).filter(p=>p.source!=='REAL')];
      cart=cart.filter(x=>products.some(p=>p.id===x.id&&p.variants.includes(x.variant)));
      document.querySelector('.demo-bar').textContent=`Catálogo parcial · ${preview.length} itens em revisão · Pagamentos desativados`;
      localStorage.setItem('ms_catalog_mode','preview');
      render();
    }
  }catch{/* A vitrine local permanece disponível se a API estiver indisponível. */}
}
function admin(){return `<div class="page-heading"><h1 class="page-title">Administração · demonstração</h1><p>Edite somente produtos demonstrativos neste navegador. Os produtos extraídos dos prints ficam em catalog.json, com dados pendentes de confirmação e pagamentos desativados.</p></div><div class="admin-grid"><form id="productForm" class="panel checkout-form"><h2>${editing?'Editar produto':'Novo produto'}</h2><label>Nome<input class="form-control" name="name" required value="${esc(editing?.name||'')}"></label><label>Categoria<input class="form-control" name="category" required value="${esc(editing?.category||'')}"></label><label>Preço (R$)<input class="form-control" name="price" type="number" min="0.01" step="0.01" required value="${esc(editing?.price||'')}"></label><label>Variações separadas por vírgula<input class="form-control" name="variants" value="${esc(editing?.variants.join(', ')||'')}"></label><label>URL da imagem (opcional)<input class="form-control" name="image" type="url" value="${esc(editing?.image||'')}"></label><label>Descrição<textarea class="form-control" name="description">${esc(editing?.description||'')}</textarea></label><div class="inline-actions"><button class="btn btn-primary" type="submit">Salvar neste navegador</button>${editing?'<button type="button" class="btn btn-secondary" id="cancelEdit">Cancelar</button>':''}</div></form><div class="panel admin-list"><h2>Produtos (${products.length})</h2>${products.map(p=>`<div class="admin-row"><div><strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${money(p.price)}${p.source==='REAL'?' · Cadastro em revisão':''}</small></div>${p.source==='REAL'?'<small class="muted">Arquivo catalog.json</small>':`<div class="admin-actions"><button data-edit="${esc(p.id)}">Editar</button><button data-delete="${esc(p.id)}">Excluir</button></div>`}</div>`).join('')}<button class="text-button" id="resetDemo">Restaurar produtos de exemplo</button></div></div>`}
function render(){if(addressController){checkoutDraft=addressController.getDraft();addressController.destroy();addressController=null}save();const path=decodeURIComponent(location.hash.slice(1)||'/'),app=document.querySelector('#app');document.title=(path==='/admin'?'Administração':path==='/carrinho'?'Sacola':path==='/checkout'?'Checkout':'Maria Scandalosa Store')+' | Maria Scandalosa';app.innerHTML=path==='/catalogo'?catalog():path.startsWith('/produto/')?productPage(path.split('/')[2]):path==='/carrinho'?cartPage():path==='/checkout'?checkout():path==='/admin'?(paymentSettings.ready?'<div class="empty"><h2>O catálogo real é gerenciado no servidor</h2><p>Esta área local de demonstração não edita os produtos cobrados.</p></div>':admin()):path.startsWith('/pedido/')?orderStatus(path.split('/')[2]):path==='/concluido'?'<div class="success"><h1 class="page-title">Simulação concluída</h1><p>Nenhum pedido foi realizado. Obrigada por explorar a demonstração.</p><a class="btn btn-primary" href="#/catalogo">Voltar à loja</a></div>':catalog(true);window.scrollTo(0,0);if(path==='/checkout')mountCheckoutAddress();if(path.startsWith('/pedido/'))refreshStatus(path.split('/')[2])}
document.addEventListener('click',e=>{const t=e.target.closest('[data-add],[data-category],[data-qty],[data-remove],[data-edit],[data-delete],#resetDemo,#cancelEdit');if(!t)return;if(t.dataset.add){const p=products.find(x=>x.id===t.dataset.add);if(!p)return;const variant=t.dataset.variant==='selected'?document.querySelector('#variant')?.value:p.variants[0];const line=cart.find(x=>x.id===p.id&&x.variant===variant);if(line)line.qty++;else cart.push({id:p.id,variant,qty:1});save();t.textContent='Adicionado ✓';setTimeout(()=>t.textContent='Adicionar à sacola',1400)}else if(t.dataset.category){filter=t.dataset.category;document.querySelector('#app').innerHTML=catalog(location.hash==='#/'||!location.hash)}else if(t.dataset.qty){const x=cart[Number(t.dataset.qty)];x.qty+=Number(t.dataset.delta);if(x.qty<=0)cart.splice(Number(t.dataset.qty),1);render()}else if(t.dataset.remove){cart.splice(Number(t.dataset.remove),1);render()}else if(t.dataset.edit){editing=products.find(p=>p.id===t.dataset.edit);render()}else if(t.dataset.delete){if(confirm('Excluir este produto apenas desta demonstração local?')){products=products.filter(p=>p.id!==t.dataset.delete);cart=cart.filter(x=>x.id!==t.dataset.delete);render()}}else if(t.id==='resetDemo'){if(confirm('Restaurar os produtos de exemplo neste navegador?')){products=[...previewProducts,...structuredClone(demoProducts)];cart=[];editing=null;render()}}else if(t.id==='cancelEdit'){editing=null;render()}});
document.addEventListener('input',e=>{if(e.target.id==='search'){term=e.target.value;const pos=e.target.selectionStart;document.querySelector('#app').innerHTML=catalog(location.hash==='#/'||!location.hash);const input=document.querySelector('#search');input.focus();input.setSelectionRange(pos,pos)}});document.addEventListener('change',e=>{if(e.target.id==='sort'){sort=e.target.value;document.querySelector('#app').innerHTML=catalog(location.hash==='#/'||!location.hash)}});
document.addEventListener('submit',async e=>{
  if(e.target.id==='checkoutForm'){
    e.preventDefault();
    const form=e.target,controller=addressController,message=form.querySelector('#checkoutError');
    if(!form.reportValidity())return;
    message.textContent='';
    let shipping_address;
    try{shipping_address=controller.getAddress()}catch(error){message.textContent=error.message;return}
    if(!paymentSettings.ready){
      controller.destroy();addressController=null;checkoutDraft=null;
      cart=[];save();location.hash='#/concluido';return;
    }
    const order={delivery:form.elements.namedItem('delivery').value,shipping_address,items:cart.map(x=>({id:x.id,variant:x.variant,qty:x.qty}))};
    const button=form.querySelector('button[type=submit]');
    button.disabled=true;button.textContent='Preparando pagamento…';controller.setBusy(true);
    try{
      // Guarda somente um resumo criptográfico para reutilizar tentativas iguais,
      // sem persistir o endereço no armazenamento do navegador.
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(order)));
      const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const sameAttempt=sessionStorage.getItem('ms_pending_fingerprint')===fingerprint;
      const request_id=(sameAttempt&&sessionStorage.getItem('ms_pending_request'))||crypto.randomUUID();
      const status_token=(sameAttempt&&sessionStorage.getItem('ms_pending_token'))||randomToken();
      sessionStorage.setItem('ms_pending_request',request_id);
      sessionStorage.setItem('ms_pending_token',status_token);
      sessionStorage.setItem('ms_pending_fingerprint',fingerprint);
      const response=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...order,request_id,status_token})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Não foi possível iniciar o pagamento.');
      sessionStorage.setItem('ms_pending_status',data.status_token);
      for(const key of ['ms_pending_request','ms_pending_token','ms_pending_fingerprint'])sessionStorage.removeItem(key);
      location.assign(data.pay_url);
    }catch(error){
      message.textContent=error.message;button.disabled=false;button.textContent='Tentar novamente';controller.setBusy(false);
    }
  }
  if(e.target.id==='productForm'){e.preventDefault();const d=new FormData(e.target),p={id:editing?.id||`local-${Date.now()}`,name:String(d.get('name')).trim(),category:String(d.get('category')).trim(),price:Number(d.get('price')),description:String(d.get('description')).trim(),variants:String(d.get('variants')).split(',').map(s=>s.trim()).filter(Boolean),image:String(d.get('image')).trim(),symbol:String(d.get('name')).trim().charAt(0).toUpperCase()};if(!p.variants.length)p.variants=['Único'];if(editing)products=products.map(x=>x.id===editing.id?p:x);else products.push(p);editing=null;render()}});
document.querySelector('#year').textContent=new Date().getFullYear();if(localStorage.getItem('ms_age_ok')==='1')document.querySelector('#ageGate').classList.add('hidden');else document.body.classList.add('locked');document.querySelector('#ageConfirm').onclick=()=>{localStorage.setItem('ms_age_ok','1');document.querySelector('#ageGate').classList.add('hidden');document.body.classList.remove('locked')};document.querySelector('#ageExit').onclick=()=>location.href='https://www.google.com';window.addEventListener('hashchange',()=>{editing=null;render()});document.addEventListener('click',e=>{if(e.target.id==='refreshStatus')refreshStatus(decodeURIComponent(location.hash.split('/')[2]||''))});render();loadPayments();
