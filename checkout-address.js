import {BRAZIL_STATES, normalizeShippingAddress} from './address.js';

const addressKeys = ['postal_code','street','number','complement','locality','city','region_code'];
const locationKeys = ['street','locality','city','region_code'];
export const formatPostalCode = value => String(value).replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');

export async function lookupPostalCode(postalCode, {fetcher = fetch, signal} = {}) {
  if (!/^\d{8}$/.test(postalCode)) throw new Error('CEP inválido.');
  const response = await fetcher(`https://viacep.com.br/ws/${postalCode}/json/`, {signal, referrerPolicy:'no-referrer'});
  if (!response.ok) throw new Error('Consulta indisponível.');
  const data = await response.json();
  if (data.erro === true || data.erro === 'true') throw Object.assign(new Error('CEP não encontrado.'), {code:'NOT_FOUND'});
  if (String(data.cep || '').replace(/\D/g, '') !== postalCode || !BRAZIL_STATES.includes(data.uf) || typeof data.localidade !== 'string') throw new Error('Resposta de CEP inválida.');
  return {street:typeof data.logradouro === 'string' ? data.logradouro : '', locality:typeof data.bairro === 'string' ? data.bairro : '', city:data.localidade, region_code:data.uf};
}

// Cancela consultas antigas e só aplica o resultado do CEP atual.
export function createPostalCodeSearch({onResult, onStatus, fetcher = fetch, timeout = 8000}) {
  let generation = 0, controller;
  const cancel = () => { generation++; controller?.abort(); };
  return {
    cancel,
    async search(postalCode) {
      cancel();
      const current = generation;
      const request = new AbortController();
      controller = request;
      const timer = setTimeout(() => request.abort(), timeout);
      onStatus('loading');
      try {
        const address = await lookupPostalCode(postalCode, {fetcher, signal:request.signal});
        if (current !== generation) return;
        onResult(address);
        onStatus(address.street && address.locality ? 'success' : 'partial');
      } catch (error) {
        if (current === generation) onStatus(error.code === 'NOT_FOUND' ? 'notfound' : 'unavailable');
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

export function mountAddressForm(form, {draft, onDeliveryChange}) {
  const fields = Object.fromEntries(addressKeys.map(key => [key, form.elements.namedItem(key)]));
  const delivery = form.elements.namedItem('delivery');
  const group = form.querySelector('#shippingAddress');
  const message = form.querySelector('#cepStatus');
  const searchButton = form.querySelector('#searchCep');
  const statuses = {
    idle:'Digite o CEP para preencher rua, bairro, cidade e estado.',
    loading:'Buscando endereço…',
    success:'Endereço localizado. Confira os dados e informe o número.',
    partial:'CEP localizado. Complete a rua, o bairro e o número.',
    notfound:'CEP não encontrado. Confira os dígitos ou preencha o endereço manualmente.',
    unavailable:'Não foi possível consultar o CEP. Preencha o endereço manualmente ou tente novamente.'
  };
  let busy = false, loading = false;
  const editedDuringLookup = new Set();
  const showStatus = status => {
    loading = status === 'loading';
    message.textContent = statuses[status];
    group.setAttribute('aria-busy', String(loading));
    searchButton.disabled = busy || loading;
  };
  if (draft) {
    if (Array.from(delivery.options).some(option => option.value === draft.delivery)) delivery.value = draft.delivery;
    for (const key of addressKeys) fields[key].value = draft[key] || '';
  }
  let previousPostal = fields.postal_code.value.replace(/\D/g, '');
  const search = createPostalCodeSearch({
    onResult(address) {
      // Nunca preencher o complemento do cliente com o complemento do ViaCEP.
      for (const key of locationKeys) if (!editedDuringLookup.has(key)) fields[key].value = address[key];
      for (const key of addressKeys) fields[key].setCustomValidity('');
    },
    onStatus:showStatus
  });
  const findAddress = () => {
    if (delivery.value !== 'delivery' || busy) return;
    const postal = fields.postal_code.value.replace(/\D/g, '');
    if (postal.length !== 8) {
      fields.postal_code.setCustomValidity('Informe um CEP com 8 dígitos.');
      fields.postal_code.reportValidity();
      return;
    }
    fields.postal_code.setCustomValidity('');
    editedDuringLookup.clear();
    search.search(postal);
  };
  const onInput = event => {
    event.target.setCustomValidity?.('');
    if (loading && locationKeys.includes(event.target.name)) editedDuringLookup.add(event.target.name);
    if (event.target !== fields.postal_code) return;
    fields.postal_code.value = formatPostalCode(fields.postal_code.value);
    const postal = fields.postal_code.value.replace(/\D/g, '');
    if (postal === previousPostal) return;
    previousPostal = postal;
    search.cancel();
    for (const key of locationKeys) fields[key].value = '';
    showStatus('idle');
    if (postal.length === 8) findAddress();
  };
  const onDelivery = () => {
    const enabled = delivery.value === 'delivery';
    group.hidden = !enabled;
    group.disabled = !enabled || busy;
    if (!enabled) { search.cancel(); showStatus('idle'); }
    onDeliveryChange(delivery.value);
  };
  form.addEventListener('input', onInput);
  delivery.addEventListener('change', onDelivery);
  searchButton.addEventListener('click', findAddress);
  showStatus('idle');
  onDelivery();
  if (delivery.value === 'delivery' && previousPostal.length === 8 && !fields.city.value) findAddress();
  return {
    getDraft:() => ({delivery:delivery.value, ...Object.fromEntries(addressKeys.map(key => [key, fields[key].value]))}),
    getAddress() {
      try {
        return normalizeShippingAddress(Object.fromEntries(addressKeys.map(key => [key, fields[key].value])), delivery.value);
      } catch (error) {
        if (fields[error.field]) {
          fields[error.field].setCustomValidity(error.message);
          fields[error.field].reportValidity();
        }
        throw error;
      }
    },
    setBusy(value) {
      busy = value;
      if (busy) { search.cancel(); showStatus('idle'); }
      delivery.disabled = busy;
      group.disabled = busy || delivery.value !== 'delivery';
      searchButton.disabled = busy || loading;
    },
    destroy() {
      search.cancel();
      form.removeEventListener('input', onInput);
      delivery.removeEventListener('change', onDelivery);
      searchButton.removeEventListener('click', findAddress);
    }
  };
}
