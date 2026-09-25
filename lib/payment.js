import { createHash, timingSafeEqual, randomBytes, randomUUID } from 'node:crypto';
import catalog from '../catalog.json' with { type: 'json' };

export const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export const error = (message, status = 400) => json({error:message}, status);
export const sha256 = input => createHash('sha256').update(input).digest('hex');
export const makeToken = () => randomBytes(32).toString('hex');
export const makeId = () => randomUUID();
export const activeCatalog = () => catalog.filter(p => p.active === true && p.source === 'REAL' && Number.isSafeInteger(p.price_cents) && p.price_cents > 0);
export const config = (env=process.env) => {
  const base = String(env.STORE_BASE_URL || '').replace(/\/$/, '');
  const ready = env.PAYMENTS_ENABLED === 'true' && Boolean(env.PAGBANK_TOKEN && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && /^https:\/\/[^/]+$/.test(base)) && activeCatalog().length > 0;
  const installments = Math.max(1,Math.min(12,parseInt(env.MAX_INSTALLMENTS || '6',10) || 6));
  const free = Math.max(0,Math.min(installments,parseInt(env.INTEREST_FREE_INSTALLMENTS || '0',10) || 0));
  const deliveryFee = /^\d+$/.test(String(env.DELIVERY_FEE_CENTS || '')) ? Number(env.DELIVERY_FEE_CENTS) : null;
  return {ready,base,installments,free,debit:env.DEBIT_ENABLED === 'true',deliveryFee,apiBase:env.PAGBANK_ENV === 'production'?'https://api.pagseguro.com':'https://sandbox.api.pagseguro.com'};
};

export function priceCart(lines,delivery,settings,available=activeCatalog()) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > 30) throw new Error('Carrinho inválido.');
  if (!['pickup','delivery'].includes(delivery)) throw new Error('Forma de entrega inválida.');
  if (delivery === 'delivery' && (!Number.isSafeInteger(settings.deliveryFee) || settings.deliveryFee < 0)) throw new Error('Entrega ainda indisponível.');
  const items=[]; let total=0;
  for (const line of lines) {
    if (!line || typeof line.id !== 'string' || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99 || typeof line.variant !== 'string') throw new Error('Item inválido.');
    const product=available.find(p=>p.id===line.id);
    if (!product || !product.variants.includes(line.variant)) throw new Error('Produto ou variação indisponível.');
    const name=`${product.name} - ${line.variant}`.slice(0,100);
    const unit_amount=product.price_cents;
    if (!Number.isSafeInteger(unit_amount) || unit_amount < 1) throw new Error('Preço indisponível.');
    total += unit_amount * line.qty;
    items.push({reference_id:product.id,name,quantity:line.qty,unit_amount});
  }
  total += delivery === 'delivery' ? settings.deliveryFee : 0;
  if (!Number.isSafeInteger(total) || total < 1 || total > 8999999100) throw new Error('Valor do pedido inválido.');
  return {items,total};
}

export function verifySignature(token,raw,header) {
  if (!token || typeof header !== 'string' || !/^[a-f\d]{64}$/i.test(header)) return false;
  const expected=Buffer.from(sha256(`${token}-${raw}`),'hex');
  const received=Buffer.from(header,'hex');
  return timingSafeEqual(expected,received);
}

export async function db(path,options={},env=process.env) {
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  if(!/^https:\/\//.test(base) || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Banco de pedidos não configurado.');
  const response=await fetch(`${base}/rest/v1/store_orders${path}`,{...options,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'content-type':'application/json',Prefer:'return=representation',...options.headers},signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error(`Falha no banco de pedidos (${response.status}).`);
  return response.status===204?[]:response.json();
}

export function validPayUrl(href) {
  try {const u=new URL(href);return u.protocol==='https:' && (u.hostname==='pagamento.pagbank.com.br'||u.hostname.endsWith('.pagbank.com.br')||u.hostname==='pagseguro.uol.com.br'||u.hostname.endsWith('.pagseguro.uol.com.br')||u.hostname.endsWith('.pagseguro.com.br'));} catch {return false;}
}
