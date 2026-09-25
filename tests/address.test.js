import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeShippingAddress, sameShippingAddress} from '../address.js';
import {lookupPostalCode, createPostalCodeSearch} from '../checkout-address.js';

const input = {postal_code:'66010-000',street:' Rua de Teste ',number:' S/N ',locality:'Centro',city:'Belém',region_code:'pa',complement:'  '};

test('endereço aceita S/N, normaliza CEP e mantém complemento opcional', () => {
  const address = normalizeShippingAddress(input, 'delivery');
  assert.equal(address.postal_code, '66010000');
  assert.equal(address.street, 'Rua de Teste');
  assert.equal(address.number, 'S/N');
  assert.equal(address.region_code, 'PA');
  assert.equal(address.country, 'BRA');
  assert.equal(Object.hasOwn(address, 'complement'), false);
  assert.equal(normalizeShippingAddress({...input, complement:' Apto 12 '}, 'delivery').complement, 'Apto 12');
  assert.equal(normalizeShippingAddress({...input, complement:undefined}, 'delivery').complement, undefined);
  assert.equal(sameShippingAddress(address, Object.fromEntries(Object.entries(address).reverse())), true);
  assert.equal(sameShippingAddress(address, {...address,number:'12'}), false);
});

test('entrega exige número e campos válidos; retirada descarta endereço', () => {
  for (const [field, value] of [['number',' '],['postal_code','123'],['region_code','XX'],['street',''],['locality',''],['city',''],['complement','a'.repeat(41)]]) {
    assert.throws(() => normalizeShippingAddress({...input, [field]:value}, 'delivery'), error => error.field === field);
  }
  assert.throws(() => normalizeShippingAddress(null, 'delivery'), /endereço/);
  assert.equal(normalizeShippingAddress(input, 'pickup'), null);
  assert.equal(normalizeShippingAddress(undefined, 'pickup'), null);
});

test('consulta por CEP retorna somente campos de localização e ignora complemento do ViaCEP', async () => {
  let requested;
  const data = {cep:'66010-000',logradouro:'Rua de Teste',bairro:'Centro',localidade:'Belém',uf:'PA',complemento:'lado ímpar'};
  const result = await lookupPostalCode('66010000', {fetcher:async url => {requested=url;return Response.json(data);}});
  assert.equal(requested, 'https://viacep.com.br/ws/66010000/json/');
  assert.deepEqual(result, {street:'Rua de Teste',locality:'Centro',city:'Belém',region_code:'PA'});
  await assert.rejects(lookupPostalCode('00000000', {fetcher:async () => Response.json({erro:true})}), error => error.code === 'NOT_FOUND');
  await assert.rejects(lookupPostalCode('66010000', {fetcher:async () => new Response('', {status:503})}), /indisponível/);
});

test('resultado atrasado de um CEP anterior não substitui o endereço atual', async () => {
  const pending = [], applied = [], statuses = [];
  const search = createPostalCodeSearch({
    fetcher:() => new Promise(resolve => pending.push(resolve)),
    onResult:address => applied.push(address),onStatus:status => statuses.push(status)
  });
  const first = search.search('66010000');
  const second = search.search('01001000');
  pending[1](Response.json({cep:'01001-000',logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP'}));
  await second;
  pending[0](Response.json({cep:'66010-000',logradouro:'Rua de Teste',bairro:'Centro',localidade:'Belém',uf:'PA'}));
  await first;
  assert.deepEqual(applied.map(address => address.city), ['São Paulo']);
  assert.deepEqual(statuses, ['loading','loading','success']);
});

test('consulta indisponível libera a alternativa de preenchimento manual', async () => {
  const statuses = [];
  const search = createPostalCodeSearch({fetcher:async () => {throw new TypeError('Offline');},onResult:() => assert.fail('Não deve preencher'),onStatus:status => statuses.push(status)});
  await search.search('66010000');
  assert.deepEqual(statuses, ['loading','unavailable']);
});
