import {config,db,error,json,makeId,priceCart,sha256,validPayUrl} from '../lib/payment.js';
import {normalizeShippingAddress,sameShippingAddress} from '../address.js';

export default {async fetch(request){
  const settings=config();
  if(request.method==='GET')return json({ready:settings.ready,debit:settings.debit,installments:settings.installments,free:settings.free,delivery:settings.deliveryFee!==null,deliveryFeeCents:settings.deliveryFee,environment:process.env.PAGBANK_ENV==='production'?'production':'sandbox'});
  if(request.method!=='POST')return error('Método não permitido.',405);
  if(!settings.ready)return error('Pagamentos indisponíveis enquanto o catálogo real não estiver configurado.',503);
  if(Number(request.headers.get('content-length')||0)>12000)return error('Pedido muito grande.',413);
  let body;
  try{body=await request.json()}catch{return error('Pedido inválido.')}
  const requestId=String(body?.request_id||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))return error('Identificador do pedido inválido.');
  const statusToken=String(body?.status_token||'');
  if(!/^[a-f\d]{64}$/i.test(statusToken))return error('Identificador de acompanhamento inválido.');
  let calculated,shippingAddress;
  try{
    calculated=priceCart(body.items,body.delivery,settings);
    shippingAddress=normalizeShippingAddress(body.shipping_address,body.delivery);
  }catch(e){return error(e.message)}
  const ref=`MS-${makeId()}`;
  const record={reference_id:ref,request_id:requestId,status_token_hash:sha256(statusToken),status:'CREATING',items:calculated.items,total_cents:calculated.total,delivery:body.delivery,shipping_address:shippingAddress};
  try{
    const existing=await db(`?request_id=eq.${encodeURIComponent(requestId)}&select=reference_id,status,status_token_hash,pay_url,items,total_cents,delivery,shipping_address`);
    if(existing.length){
      const old=existing[0];
      const sameItems=Array.isArray(old.items)&&old.items.length===calculated.items.length&&old.items.every((item,i)=>['reference_id','name','quantity','unit_amount'].every(k=>item[k]===calculated.items[i][k]));
      if(old.status_token_hash!==sha256(statusToken)||!sameItems||old.total_cents!==calculated.total||old.delivery!==body.delivery||!sameShippingAddress(old.shipping_address,shippingAddress))return error('Este pedido já foi iniciado com outros dados.',409);
      if(old.pay_url && validPayUrl(old.pay_url))return json({pay_url:old.pay_url,status_token:statusToken,reference_id:old.reference_id});
      return error('Pedido em preparação. Aguarde alguns segundos antes de tentar novamente.',409);
    }
    await db('',{method:'POST',body:JSON.stringify(record)});
    const payment_methods=[{type:'PIX'},{type:'CREDIT_CARD'}];
    if(settings.debit)payment_methods.push({type:'DEBIT_CARD'});
    const config_options=[{option:'INSTALLMENTS_LIMIT',value:String(settings.installments)}];
    if(settings.free>0)config_options.push({option:'INTEREST_FREE_INSTALLMENTS',value:String(settings.free)});
    const payment_methods_configs=[{type:'CREDIT_CARD',config_options}];
    const redirect=`${settings.base}/#/pedido/${statusToken}`;
    const payload={reference_id:ref,items:calculated.items,payment_methods,payment_methods_configs,redirect_url:redirect,return_url:redirect,payment_notification_urls:[`${settings.base}/api/webhook`],notification_urls:[`${settings.base}/api/webhook`],soft_descriptor:'MARIA SCANDALOSA'};
    if(shippingAddress)payload.shipping={type:'FIXED',amount:settings.deliveryFee,address_modifiable:false,address:shippingAddress};
    const response=await fetch(`${settings.apiBase}/checkouts`,{method:'POST',headers:{Authorization:`Bearer ${process.env.PAGBANK_TOKEN}`,'content-type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    if(!response.ok){await db(`?reference_id=eq.${encodeURIComponent(ref)}`,{method:'PATCH',body:JSON.stringify({status:'FAILED'})});return error(`O PagBank não conseguiu iniciar o pagamento (${response.status}).`,502)}
    const created=await response.json();
    const payUrl=created.links?.find(link=>link.rel==='PAY')?.href;
    if(!created.id || !validPayUrl(payUrl))throw new Error('Resposta de pagamento inválida.');
    await db(`?reference_id=eq.${encodeURIComponent(ref)}`,{method:'PATCH',body:JSON.stringify({status:'WAITING',checkout_id:created.id,pay_url:payUrl,updated_at:new Date().toISOString()})});
    return json({pay_url:payUrl,status_token:statusToken,reference_id:ref});
  }catch(e){
    // Não registrar tokens ou dados pessoais nos logs.
    return error(e.message==='Resposta de pagamento inválida.'?e.message:'Não foi possível iniciar o pagamento. Tente novamente em instantes.',502);
  }
}};
