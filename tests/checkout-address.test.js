import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../catalog.json' with {type:'json'};
import checkout from '../api/checkout.js';

test('checkout valida e salva endereço, envia ao PagBank e impede reutilização com outro destino', async () => {
  const env = {PAYMENTS_ENABLED:'true',PAGBANK_TOKEN:'test-token',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-key',STORE_BASE_URL:'https://loja.example',DELIVERY_FEE_CENTS:'1500',PAGBANK_ENV:'sandbox'};
  const oldEnv = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  const oldFetch = globalThis.fetch, original = {...catalog[0]};
  const records = [], payloads = [];
  // Alteração apenas em memória neste processo de teste; o catálogo entregue continua fictício.
  Object.assign(catalog[0], {active:true,source:'REAL'});
  Object.assign(process.env, env);
  globalThis.fetch = async (url, init = {}) => {
    if (url.startsWith('https://sandbox.api.pagseguro.com/')) {
      payloads.push(JSON.parse(init.body));
      return Response.json({id:`CHEC_${payloads.length}`,links:[{rel:'PAY',href:`https://pagamento.pagbank.com.br/pagamento?code=${payloads.length}`}]});
    }
    assert.ok(url.startsWith('https://example.supabase.co/rest/v1/store_orders'));
    if (init.method === 'POST') {
      records.push(JSON.parse(init.body));return Response.json([]);
    }
    const query = new URL(url).searchParams;
    if (init.method === 'PATCH') {
      Object.assign(records.find(record => `eq.${record.reference_id}` === query.get('reference_id')), JSON.parse(init.body));
      return Response.json([]);
    }
    return Response.json(records.filter(record => `eq.${record.request_id}` === query.get('request_id')));
  };
  const body = {
    request_id:'123e4567-e89b-42d3-a456-426614174000',status_token:'a'.repeat(64),delivery:'delivery',
    items:[{id:catalog[0].id,variant:catalog[0].variants[0],qty:1}],
    shipping_address:{postal_code:'66010-000',street:'Rua de Teste',number:'12',complement:'',locality:'Centro',city:'Belém',region_code:'PA'}
  };
  const send = data => checkout.fetch(new Request('https://loja.example/api/checkout', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)}));
  try {
    const invalid = await send({...body,shipping_address:{...body.shipping_address,number:''}});
    assert.equal(invalid.status, 400);
    assert.equal(records.length, 0);
    assert.equal(payloads.length, 0);

    assert.equal((await send(body)).status, 200);
    assert.equal(records[0].shipping_address.number, '12');
    assert.equal(records[0].shipping_address.postal_code, '66010000');
    assert.equal(Object.hasOwn(records[0].shipping_address, 'complement'), false);
    assert.deepEqual(payloads[0].shipping, {type:'FIXED',amount:1500,address_modifiable:false,address:records[0].shipping_address});
    assert.equal(records[0].total_cents, catalog[0].price_cents + 1500);

    // JSONB pode devolver campos em outra ordem.
    records[0].shipping_address = Object.fromEntries(Object.entries(records[0].shipping_address).reverse());
    assert.equal((await send(body)).status, 200);
    assert.equal(payloads.length, 1);
    assert.equal((await send({...body,shipping_address:{...body.shipping_address,number:'99'}})).status, 409);
    assert.equal(payloads.length, 1);

    assert.equal((await send({...body,request_id:'123e4567-e89b-42d3-a456-426614174001',status_token:'b'.repeat(64),delivery:'pickup'})).status, 200);
    assert.equal(records[1].shipping_address, null);
    assert.equal(Object.hasOwn(payloads[1], 'shipping'), false);
    assert.equal(records[1].total_cents, catalog[0].price_cents);
  } finally {
    globalThis.fetch = oldFetch;
    Object.assign(catalog[0], original);
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
