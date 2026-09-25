import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
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

test('todos os anúncios recebidos têm preço transcrito, imagem válida e cobrança bloqueada', () => {
  const expected = {'Masturbadores':11,'Bolinhas Tailandesas':6,'Cinta Liga':12,'Beijáveis':10,'Body':19,'Sadomasoquismo':88,'Acessórios':48};
  const items=catalog.filter(p=>p.source==='REAL');
  assert.equal(items.length,194);
  assert.equal(new Set(catalog.map(p=>p.id)).size,catalog.length);
  for(const [category,count] of Object.entries(expected))assert.equal(items.filter(p=>p.category===category).length,count);
  assert.equal(items.filter(p=>p.price_cents===0).length,2);
  for(const p of items){
    assert.equal(p.active,false,p.id);
    assert.ok(Number.isSafeInteger(p.price_cents)&&p.price_cents>=0,p.id);
    assert.ok(existsSync(fileURLToPath(new URL(`../${p.image}`,import.meta.url))),p.image);
  }
});

test('fotos estão incorporadas ao script da vitrine para funcionar sem assets no deploy', () => {
  const script=readFileSync(fileURLToPath(new URL('../store.js',import.meta.url)),'utf8');
  const embedded=[...script.matchAll(/data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/=]+)/g)];
  assert.equal(embedded.length,3);
  assert.ok(script.includes('sheetStyles.textContent=catalogSheets.map('));
  assert.ok(script.includes('product-art product-shot sheet-${sheet}'));
  for(let i=0;i<3;i++){
    const item=catalog.filter(p=>p.category==='Masturbadores').find(p=>p.image.endsWith(`0${i+1}.${i===0?'jpeg':'png'}`));
    const original=readFileSync(fileURLToPath(new URL(`../${item.image}`,import.meta.url)));
    assert.deepEqual(Buffer.from(embedded[i][1],'base64'),original);
  }
});
