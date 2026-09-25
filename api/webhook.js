import {db,error,json,verifySignature} from '../lib/payment.js';
export default {async fetch(request){
  if(request.method!=='POST')return error('Método não permitido.',405);
  if(!process.env.PAGBANK_TOKEN||!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return error('Notificações indisponíveis.',503);
  const raw=await request.text();
  if(raw.length>50000)return error('Notificação grande demais.',413);
  if(!verifySignature(process.env.PAGBANK_TOKEN,raw,request.headers.get('x-authenticity-token')))return error('Assinatura inválida.',401);
  let event;try{event=JSON.parse(raw)}catch{return error('Notificação inválida.');}
  const ref=event.reference_id;
  if(typeof ref!=='string'||!/^MS-[0-9a-f-]{36}$/i.test(ref))return json({received:true});
  try{
    const rows=await db(`?reference_id=eq.${encodeURIComponent(ref)}&select=reference_id,status,total_cents`);
    if(!rows.length)return json({received:true});
    const order=rows[0];let status=null,method=null,paidAt=null;
    if(Array.isArray(event.charges)&&event.charges.length){
      const paid=event.charges.find(c=>c.status==='PAID');
      const charge=paid||event.charges[0];
      const value=charge.amount?.value,paidValue=charge.amount?.summary?.paid;
      if(charge.status==='PAID'){
        if(value!==order.total_cents||paidValue<order.total_cents)return error('Valor do pagamento divergente.',422);
        status='PAID';paidAt=charge.paid_at||new Date().toISOString();method=charge.payment_method?.type||null;
      }else if(['DECLINED','CANCELED','IN_ANALYSIS','WAITING'].includes(charge.status))status=charge.status;
    } else if(event.status==='EXPIRED') status='EXPIRED';
    if(status&&order.status!=='PAID')await db(`?reference_id=eq.${encodeURIComponent(ref)}&status=neq.PAID`,{method:'PATCH',body:JSON.stringify({status,payment_method:method,paid_at:paidAt,updated_at:new Date().toISOString()})});
    return json({received:true});
  }catch{return error('Não foi possível conciliar a notificação.',503)}
}};
