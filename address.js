// Regras compartilhadas pelo formulário e pelo servidor. Não contém segredos.
export const BRAZIL_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function normalizeShippingAddress(input, delivery) {
  if (delivery === 'pickup') return null;
  if (delivery !== 'delivery') throw new Error('Forma de entrega inválida.');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Informe o endereço de entrega.');
  const invalid = (field, message) => { throw Object.assign(new Error(message), {field}); };
  const field = (key, label, limit, optional = false) => {
    if (optional && input[key] == null) return '';
    if (typeof input[key] !== 'string') return invalid(key, `Informe ${label}.`);
    const value = input[key].trim().replace(/\s+/g, ' ');
    if (!optional && !value) return invalid(key, `Informe ${label}.`);
    if (value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) return invalid(key, `Revise ${label} (até ${limit} caracteres).`);
    return value;
  };
  const postal = typeof input.postal_code === 'string' ? input.postal_code.trim() : '';
  if (!/^\d{5}-?\d{3}$/.test(postal)) invalid('postal_code', 'Informe um CEP com 8 dígitos.');
  const address = {
    postal_code: postal.replace('-', ''),
    street: field('street', 'a rua ou avenida', 160),
    number: field('number', 'o número ou S/N', 20),
    locality: field('locality', 'o bairro', 60),
    city: field('city', 'a cidade', 90),
    region_code: field('region_code', 'o estado', 2).toUpperCase(),
    country: 'BRA'
  };
  if (!BRAZIL_STATES.includes(address.region_code)) invalid('region_code', 'Selecione um estado brasileiro.');
  const complement = field('complement', 'o complemento', 40, true);
  if (complement) address.complement = complement;
  return address;
}

export function sameShippingAddress(left, right) {
  if (!left || !right) return left == null && right == null;
  return ['postal_code','street','number','locality','city','region_code','country','complement']
    .every(key => (left[key] ?? '') === (right[key] ?? ''));
}
