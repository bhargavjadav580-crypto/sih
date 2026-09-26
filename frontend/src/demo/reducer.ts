import { DemoState, Worker, Booking, PaymentRecord, Complaint, envelopeSchema } from './schema';
import { conflicts, activeStatuses, importConflicts } from './selectors';
export type Action =
 | {type:'register-entity';collection:'workers'|'customers'|'institutions'|'societies';entity:Worker|DemoState['entities']['customers'][number]|DemoState['entities']['institutions'][number]|DemoState['entities']['societies'][number]}
 | {type:'new-bulk';requirement:DemoState['entities']['bulkRequirements'][number]}
 | {type:'workers';workers:Worker[]}
 | {type:'worker';id:string;changes:Partial<Worker>;reason:string}
 | {type:'booking';id:string;status:Booking['status']}
 | {type:'new-booking';booking:Booking}
 | {type:'quote';id:string;total:number;reason:string}
 | {type:'quote-decision';id:string;approve:boolean}
 | {type:'payment';id:string;status:PaymentRecord['status'];reason:string}
 | {type:'settlement';id:string;status:'Under review'|'Payout recorded'|'Cash remitted';reason:string}
 | {type:'complaint';id:string;status:Complaint['status'];note:string}
 | {type:'new-complaint';bookingId:string;title:string}
 | {type:'bulk';changes:Partial<DemoState['entities']['bulkRequirements'][number]>}
 | {type:'bulk-quote';total:number;allocation:number;reason:string}
 | {type:'bulk-quote-decision';id:string;approve:boolean}
 | {type:'allocation';id:string;proposed:number;status:string}
 | {type:'recommendation';trade:string;hours:number;status:string;reason:string}
 | {type:'note';entityId:string;detail:string};
const next:Record<string,string>={'Requested':'Offer sent','Offer sent':'Accepted','Accepted':'On the way','On the way':'Arrived','Arrived':'In progress','In progress':'Completed'};
export function reduceDemo(previous:DemoState,action:Action,actor:string,eventId:string):DemoState {
 if(previous.events.some(e=>e.id===eventId))throw new Error('Duplicate event rejected');
 const s:DemoState=JSON.parse(JSON.stringify(previous));const e=s.entities;
 const at=new Date(new Date(s.demoClock).getTime()+60000).toISOString();s.demoClock=at;
 let entityId='id' in action?action.id:'LL-DEMO-01';let detail='reason' in action?action.reason:'';
 if(action.type==='register-entity'){
  const items=e[action.collection] as {id:string}[];
  if(items.some(x=>x.id===action.entity.id))throw new Error('This fixture ID already exists.');
  items.push({...action.entity,updatedAt:at} as unknown as {id:string});entityId=action.entity.id;detail='Synthetic account registered in the shared fixture set';
 } else if(action.type==='new-bulk'){
  const b=action.requirement;if(e.bulkRequirements.some(x=>x.id===b.id))throw new Error('Requirement already exists');
  if(!e.institutions.some(x=>x.id===b.institutionId))throw new Error('Institution fixture is missing');
  e.bulkRequirements.push({...b,updatedAt:at});entityId=b.id;detail='Institution submitted a new synthetic requirement';
 } else if(action.type==='workers'){
  for(const w of action.workers){if(e.workers.some(x=>x.id===w.id||!!w.membershipRef&&x.membershipRef===w.membershipRef))throw new Error('Duplicate ID or membership reference');e.workers.push({...w,updatedAt:at,status:'Pending review',membership:false,identity:false,skillVerified:false,certificate:false});}detail=`${action.workers.length} pending profiles imported`;
 } else if(action.type==='worker'){
  const w=e.workers.find(w=>w.id===action.id);if(!w)throw new Error('Worker not found');Object.assign(w,action.changes,{updatedAt:at});
  if(w.status==='Verified'&&!(w.membership&&w.identity&&w.skillVerified))throw new Error('Complete membership, identity and skill reviews first');
  if(action.changes.status&&!action.reason.trim())throw new Error('A review reason is required');
  w.skills=w.skills.map(k=>({...k,verified:w.skillVerified}));
 } else if(action.type==='new-booking'){
  const b=action.booking,w=e.workers.find(w=>w.id===b.workerId);
  if(e.bookings.some(x=>x.id===b.id))throw new Error('Booking already exists');
  if(!w||w.status!=='Verified'||!w.available||w.trade!==b.service)throw new Error('Worker is not eligible for this request');
  if(new Date(b.start)>=new Date(b.end)||!w.availability.some(a=>a.available&&new Date(a.start)<=new Date(b.start)&&new Date(a.end)>=new Date(b.end)))throw new Error('Requested time is outside availability');
  if(conflicts(s,b).length)throw new Error('Time conflict. Choose another slot');
  e.bookings.unshift(b);e.quotes.push({id:b.quoteId,bookingId:b.id,updatedAt:at,version:1,total:50000,workerEarning:45000,societyAllocation:5000,status:'Approved',reason:'Example cooperative rule—not a universal commission.',approvalRef:'Demo customer approval v1'});
  e.payments.push({id:`PAY-${b.id}`,bookingId:b.id,updatedAt:at,amount:50000,status:'Unpaid',method:'None',holder:'None',note:''});e.settlements.push({id:`SET-${b.id}`,bookingId:b.id,updatedAt:at,workerEarning:45000,societyAllocation:5000,status:'Not due',note:''});entityId=b.id;detail='Customer approved quote and requested service';
 } else if(action.type==='booking'){
  const b=e.bookings.find(b=>b.id===action.id);if(!b)throw new Error('Booking not found');const w=e.workers.find(w=>w.id===b.workerId)!;
  if(action.status==='Declined'){if(!['Requested','Offer sent'].includes(b.status))throw new Error('Only a pending offer can be declined');}
  else if(action.status==='Cancelled'){if(!['Requested','Offer sent'].includes(b.status))throw new Error('Active work requires a society review');}
  else if(next[b.status]!==action.status)throw new Error('Invalid booking transition');
  if(['Offer sent','Accepted'].includes(action.status)){
   if(w.status!=='Verified'||!w.available||w.trade!==b.service)throw new Error('Worker is not eligible for this request');
   if(!w.availability.some(a=>a.available&&new Date(a.start)<=new Date(b.start)&&new Date(a.end)>=new Date(b.end)))throw new Error('Requested time is outside availability');
   if(conflicts(s,b).length)throw new Error('Time conflict. Choose another slot');
  }
  if(action.status==='Accepted'&&!actor.includes('Worker'))throw new Error('Worker confirmation is required');
  if(action.status==='Completed'&&e.quotes.some(q=>q.bookingId===b.id&&q.status==='Awaiting customer approval'))throw new Error('Resolve the pending quote before completion');
  b.status=action.status;b.updatedAt=at;detail=`${action.status} · visible ${actor} confirmation`;
 } else if(action.type==='quote'){
  const b=e.bookings.find(b=>b.id===action.id)!;const p=e.payments.find(p=>p.bookingId===b.id)!;
  if(b.status==='Completed'||!['Unpaid','Payment failed'].includes(p.status))throw new Error('Settled or completed work requires an adjustment review');
  if(e.quotes.some(q=>q.bookingId===b.id&&q.status==='Awaiting customer approval'))throw new Error('A quote is already awaiting approval');
  if(!Number.isInteger(action.total)||action.total<100||!action.reason.trim())throw new Error('Enter a valid amount and reason');
  const version=Math.max(...e.quotes.filter(q=>q.bookingId===b.id).map(q=>q.version))+1;
  e.quotes.push({id:`QT-${b.id}-${version}`,bookingId:b.id,updatedAt:at,version,total:action.total,workerEarning:Math.round(action.total*0.9),societyAllocation:action.total-Math.round(action.total*0.9),status:'Awaiting customer approval',reason:action.reason,approvalRef:''});
 } else if(action.type==='quote-decision'){
  const q=e.quotes.find(q=>q.id===action.id)!;if(q.status!=='Awaiting customer approval')throw new Error('Quote is not awaiting approval');if(!actor.includes('Customer'))throw new Error('Customer approval is required');
  q.status=action.approve?'Approved':'Rejected';q.approvalRef=`${actor} · ${at}`;q.updatedAt=at;
  if(action.approve){const b=e.bookings.find(b=>b.id===q.bookingId)!;b.quoteId=q.id;b.updatedAt=at;Object.assign(e.payments.find(p=>p.bookingId===b.id)!,{amount:q.total,updatedAt:at});Object.assign(e.settlements.find(p=>p.bookingId===b.id)!,{workerEarning:q.workerEarning,societyAllocation:q.societyAllocation,updatedAt:at});}detail=`Quote v${q.version}: ${q.status}`;
 } else if(action.type==='payment'){
  const p=e.payments.find(p=>p.bookingId===action.id)!,b=e.bookings.find(b=>b.id===action.id)!;
  if(b.status!=='Completed')throw new Error('Complete the service before recording payment');
  const allowed:Record<string,string[]>={'Unpaid':['Cash reported','Digital confirmed','Payment failed'],'Payment failed':['Cash reported','Digital confirmed'],'Cash reported':['Cash confirmed','Cash disputed'],'Cash disputed':['Cash confirmed'],'Cash confirmed':['Refund under review'],'Digital confirmed':['Refund under review'],'Refund under review':['Refund recorded']};
  if(!allowed[p.status]?.includes(action.status))throw new Error('Duplicate or invalid payment blocked');
  if(['Cash confirmed','Cash disputed','Refund under review','Refund recorded'].includes(action.status)&&!action.reason.trim())throw new Error('A reconciliation reason is required');
  if(action.status==='Cash reported'){p.method='Cash';p.holder='Worker';}
  if(action.status==='Digital confirmed'){p.method='Digital';p.holder='Society';}
  p.status=action.status;p.updatedAt=at;p.note=action.reason;
  const settlement=e.settlements.find(x=>x.bookingId===b.id)!;settlement.status=['Digital confirmed','Cash confirmed'].includes(p.status)?'Due':p.status==='Refund under review'?'Under review':'Not due';settlement.updatedAt=at;
 } else if(action.type==='settlement'){
  const p=e.payments.find(p=>p.bookingId===action.id)!,st=e.settlements.find(x=>x.bookingId===action.id)!;
  if(!action.reason.trim())throw new Error('A settlement reference is required');
  if(action.status!=='Under review'&&!['Cash confirmed','Digital confirmed'].includes(p.status))throw new Error('Confirm the customer payment first');
  if(action.status==='Payout recorded'&&p.holder!=='Society'||action.status==='Cash remitted'&&p.holder!=='Worker')throw new Error('This settlement does not match the cash holder');
  if(st.status===action.status)throw new Error('Duplicate settlement blocked');st.status=action.status;st.note=action.reason;st.updatedAt=at;
 } else if(action.type==='complaint'){
  const c=e.complaints.find(c=>c.id===action.id)!;const progression=['Reported','Under review','Resolution agreed','Closed'];
  if(progression.indexOf(action.status)!==progression.indexOf(c.status)+1)throw new Error('Review and agree a resolution before closing');if(!action.note.trim())throw new Error('A review reason is required');c.status=action.status;c.notes.push(`${actor}: ${action.note}`);c.updatedAt=at;detail=action.note;
 } else if(action.type==='new-complaint'){
  if(action.title.trim().length<5)throw new Error('Please describe the issue');e.complaints.unshift({id:`CMP-${eventId}`,bookingId:action.bookingId,updatedAt:at,title:action.title,reporter:actor,status:'Reported',notes:['Allegation is unverified. Society review required.']});entityId=action.bookingId;detail=action.title;
 } else if(action.type==='bulk'){
  const b=e.bulkRequirements[0];const changes=action.changes;
  if(changes.coordinated){const a=e.affiliations.find(a=>a.societyId==='SOC-A');if(!b.consent&&!changes.consent)throw new Error('Customer consent is required');if(!a||a.status!=='Active'||!a.scope.includes('consented-shortfall')||a.effectiveFrom>b.start||a.effectiveTo<b.start)throw new Error('Authorized coordination is unavailable');}
  Object.assign(b,changes,{updatedAt:at});if(changes.details||changes.start||changes.days||changes.requested){for(const a of e.allocations){a.committed=0;a.accepted=0;a.attended=0;a.status='Needs renewed review';a.updatedAt=at;}}entityId=b.id;detail='Requirement and consent updated';
 } else if(action.type==='bulk-quote'){
  if(!Number.isInteger(action.total)||!Number.isInteger(action.allocation)||action.total<=0||action.allocation<0||action.allocation>=action.total||!action.reason.trim())throw new Error('Enter valid integer amounts and a quote reason');
  if(e.quotes.some(q=>q.bookingId==='BR-0400'&&q.status==='Awaiting customer approval'))throw new Error('Resolve the pending institutional quote first');
  const version=e.quotes.filter(q=>q.bookingId==='BR-0400').length+1;e.quotes.push({id:`QT-BR0400-${version}`,bookingId:'BR-0400',updatedAt:at,version,total:action.total,workerEarning:action.total-action.allocation,societyAllocation:action.allocation,status:'Awaiting customer approval',reason:action.reason,approvalRef:''});entityId='BR-0400';detail='Institutional quote proposed; customer approval required';
 } else if(action.type==='bulk-quote-decision'){
  const q=e.quotes.find(q=>q.id===action.id);if(!q||q.bookingId!=='BR-0400'||q.status!=='Awaiting customer approval')throw new Error('Institutional quote is not pending');if(!actor.includes('Customer'))throw new Error('Customer approval is required');q.status=action.approve?'Approved':'Rejected';q.approvalRef=`${actor} · ${at}`;q.updatedAt=at;if(action.approve)e.bulkRequirements[0].details.quoteId=q.id;detail=`Institutional quote ${q.version}: ${q.status}`;
 } else if(action.type==='allocation'){
  const a=e.allocations.find(a=>a.id===action.id)!;const affiliation=e.affiliations.find(f=>f.societyId===a.societyId);const b=e.bulkRequirements[0];
  if(!b.coordinated)throw new Error('Approve a coordination request first');
  if(!affiliation||affiliation.status!=='Active'||!affiliation.scope.includes('capacity-sharing'))throw new Error('Society has not authorized capacity sharing');
  if(action.proposed<0||!Number.isInteger(action.proposed)||action.proposed>b.requested)throw new Error('Invalid proposed capacity');
  a.proposed=action.proposed;a.status=action.status;a.committed=action.status==='Society committed'?action.proposed:0;a.accepted=0;a.attended=0;a.updatedAt=at;detail=`${a.societyId}: ${action.status}. Worker acceptance remains separate.`;
 } else if(action.type==='recommendation'){
  if(!action.reason.trim()||!Number.isFinite(action.hours)||action.hours<0)throw new Error('Enter a valid recommendation and reason');e.recommendations.push({id:eventId,updatedAt:at,...action});detail=`${action.trade}: ${action.status}, ${action.hours} service hours. ${action.reason}`;
 } else if(action.type==='note'){entityId=action.entityId;detail=action.detail;}
 s.events.unshift({id:eventId,at,actor,entityId,action:action.type,detail});return envelopeSchema.parse(s);
}
export function mergeDemo(local:DemoState,incoming:DemoState,preferIncoming=false):DemoState{
 const out:DemoState=JSON.parse(JSON.stringify(local));
 if(incoming.events.every(e=>local.events.some(x=>x.id===e.id)))throw new Error('Duplicate events: this handoff has already been applied');
 for(const key of Object.keys(out.entities) as (keyof DemoState['entities'])[]){const map=new Map<string,any>((out.entities[key] as any[]).map(x=>[x.id,x]));for(const item of incoming.entities[key] as any[]){const current=map.get(item.id);if(!current||preferIncoming||item.updatedAt&&current.updatedAt&&item.updatedAt>current.updatedAt)map.set(item.id,item);}(out.entities as any)[key]=Array.from(map.values());}
 out.events=[...out.events,...incoming.events.filter(e=>!out.events.some(x=>x.id===e.id))].sort((a,b)=>b.at.localeCompare(a.at));out.demoClock=incoming.demoClock>local.demoClock?incoming.demoClock:local.demoClock;
 const parsed=envelopeSchema.parse(out);if(importConflicts(parsed).length)throw new Error(`Overlapping accepted jobs: ${importConflicts(parsed).join(', ')}`);return parsed;
}