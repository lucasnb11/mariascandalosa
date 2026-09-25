import {db,error,json,sha256} from '../lib/payment.js';
export default {async fetch(request){
  if(request.method!=='GET')return error('Método não permitido.',405);
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return error('Consulta indisponível.',503);
  const token=new URL(request.url).searchParams.get('token')||'';
  if(!/^[a-f\d]{64}$/i.test(token))return error('Identificador inválido.');
  try{const rows=await db(`?status_token_hash=eq.${sha256(token)}&select=reference_id,status,total_cents,delivery,created_at,paid_at,payment_method`);
    if(!rows.length)return error('Pedido não encontrado.',404);
    const p=rows[0];return json({reference_id:p.reference_id,status:p.status,total_cents:p.total_cents,delivery:p.delivery,created_at:p.created_at,paid_at:p.paid_at,payment_method:p.payment_method});
  }catch{return error('Não foi possível consultar o pedido.',502)}
}};
