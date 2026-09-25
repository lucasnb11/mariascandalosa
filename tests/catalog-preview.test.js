import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import catalog from '../catalog.json' with {type:'json'};
import {config,activeCatalog} from '../lib/payment.js';

test('os 11 itens capturados possuem os preços vistos nos prints e imagens incluídas', () => {
  const items=catalog.filter(p=>p.category==='Masturbadores');
  assert.deepEqual(items.map(p=>p.price_cents), [21600,3825,5850,7600,7000,4000,4000,4000,4000,13500,9500]);
  assert.deepEqual(items.slice(0,4).map(p=>p.original_price_cents), [27000,4500,6500,9500]);
  assert.equal(new Set(items.map(p=>p.id)).size,11);
  for(const item of items){
    assert.equal(item.source,'REAL');
    assert.equal(item.active,false);
    assert.equal(item.review_status,'PENDING_DETAILS');
    assert.ok(existsSync(fileURLToPath(new URL(`../${item.image}`,import.meta.url))),item.image);
    assert.ok(item.image_crop.y+item.image_crop.size<=item.image_crop.source_height);
  }
});

test('itens em revisão não liberam pagamentos mesmo com chaves configuradas', () => {
  assert.equal(activeCatalog().length,0);
  assert.equal(config({PAYMENTS_ENABLED:'true',PAGBANK_TOKEN:'test-token',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-key',STORE_BASE_URL:'https://loja.example'}).ready,false);
});
