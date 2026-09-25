import test from 'node:test';
import assert from 'node:assert/strict';
import {config,priceCart,sha256,verifySignature,validPayUrl} from '../lib/payment.js';
import checkout from '../api/checkout.js';
import webhook from '../api/webhook.js';

const real=[{id:'real-1',name:'Produto real',price_cents:12500,variants:['M'],active:true,source:'REAL'}];
test('catálogo de exemplo mantém pagamentos desligados mesmo com chaves preenchidas',()=>{
  const s=config({PAYMENTS_ENABLED:'true',PAGBANK_TOKEN:'token',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'secret',STORE_BASE_URL:'https://loja.example'});
  assert.equal(s.ready,false);
});
test('servidor usa preço do catálogo e rejeita produto ou variação inexistente',()=>{
  const s={deliveryFee:null};
  assert.deepEqual(priceCart([{id:'real-1',variant:'M',qty:2,price:1}], 'pickup',s,real),{items:[{reference_id:'real-1',name:'Produto real - M',quantity:2,unit_amount:12500}],total:25000});
  assert.throws(()=>priceCart([{id:'demo',variant:'M',qty:1}],'pickup',s,real),/indisponível/);
  assert.throws(()=>priceCart([{id:'real-1',variant:'G',qty:1}],'pickup',s,real),/indisponível/);
  assert.throws(()=>priceCart([{id:'real-1',variant:'M',qty:1}],'delivery',s,real),/Entrega/);
});
test('webhook exige assinatura do corpo exato e link de pagamento de domínio permitido',()=>{
  const body='{"status":"PAID"}',token='abc';
  assert.equal(verifySignature(token,body,sha256(`${token}-${body}`)),true);
  assert.equal(verifySignature(token,body+' ',sha256(`${token}-${body}`)),false);
  assert.equal(validPayUrl('https://pagamento.pagbank.com.br/pagamento?code=123'),true);
  assert.equal(validPayUrl('https://pagamento.pagbank.com.br.evil.test/'),false);
});
test('endpoint de checkout não inicia cobrança sem catálogo real',async()=>{
  const response=await checkout.fetch(new Request('https://loja.example/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:[{id:'p1',variant:'P',qty:1}]})}));
  assert.equal(response.status,503);
});
test('webhook só confirma pagamento assinado pelo valor integral',async()=>{
  const oldFetch=globalThis.fetch;
  const oldEnv={PAGBANK_TOKEN:process.env.PAGBANK_TOKEN,SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY};
  process.env.PAGBANK_TOKEN='test-token';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';
  const ref='MS-123e4567-e89b-42d3-a456-426614174000';
  let updates=[];
  globalThis.fetch=async(url,init)=>{
    if(init.method==='PATCH'){updates.push(JSON.parse(init.body));return new Response('[]',{status:200})}
    return new Response(JSON.stringify([{reference_id:ref,status:'WAITING',total_cents:25000}]),{status:200});
  };
  const send=async paid=>{const raw=JSON.stringify({reference_id:ref,charges:[{status:'PAID',paid_at:'2026-09-24T12:00:00Z',amount:{value:25000,summary:{paid}}}]});return webhook.fetch(new Request('https://loja.example/api/webhook',{method:'POST',headers:{'x-authenticity-token':sha256(`test-token-${raw}`)},body:raw}))};
  try{
    assert.equal((await send(100)).status,422);
    assert.equal(updates.length,0);
    assert.equal((await send(25000)).status,200);
    assert.equal(updates[0].status,'PAID');
  }finally{
    globalThis.fetch=oldFetch;
    for(const [k,v] of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v}
  }
});
