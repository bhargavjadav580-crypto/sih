import { z } from 'zod';

const id = z.string().min(1).max(100);
const text = z.string().max(2000);
const money = z.number().int().nonnegative().max(100000000);
const base = { id, updatedAt: z.string().datetime({offset:true}) };
export const skillSchema = z.object({id, name:text, verified:z.boolean()});
export const availabilitySchema = z.object({start:z.string(), end:z.string(), available:z.boolean()});
export const workerSchema = z.object({...base,name:z.string().min(2).max(100),shramCard:text.optional(),mobile:text.optional(),email:text.optional(),societyId:id,trade:text,experience:z.number().int().min(0).max(70),area:text,membershipRef:text,status:z.enum(['Verified','Pending review','Corrections requested','Rejected']),membership:z.boolean(),identity:z.boolean(),skillVerified:z.boolean(),certificate:z.boolean(),available:z.boolean(),reviewer:text,source:text,reviewDate:text,reviewDue:text,reason:text,skills:z.array(skillSchema),availability:z.array(availabilitySchema)});
export const societySchema = z.object({...base,name:text,shortName:text,services:z.array(text),registrationNumber:text.optional(),adminName:text.optional(),mobile:text.optional(),email:text.optional()});
export const customerSchema=z.object({...base,name:text,mobile:text,email:text});
export const institutionSchema=z.object({...base,name:text,contactName:text,mobile:text,email:text});
export const federationSchema=z.object({...base,name:text,coordinationId:id,email:text,role:z.enum(['district','national'])});
export const affiliationSchema = z.object({...base,societyId:id,organizationId:id,type:text,status:z.enum(['Active','Unlinked','Expired']),scope:z.array(text),effectiveFrom:text,effectiveTo:text});
export const quoteSchema = z.object({...base,bookingId:id,version:z.number().int().positive(),total:money,workerEarning:money,societyAllocation:money,status:z.enum(['Approved','Awaiting customer approval','Rejected']),reason:text,approvalRef:text}).refine(q=>q.total===q.workerEarning+q.societyAllocation,'Quote split must balance');
export const bookingSchema = z.object({...base,workerId:id,societyId:id,customer:text,customerId:id.optional(),service:text,area:text,start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true}),status:z.enum(['Requested','Offer sent','Accepted','On the way','Arrived','In progress','Completed','Declined','Cancelled']),description:text,quoteId:id});
export const paymentSchema = z.object({...base,bookingId:id,amount:money,status:z.enum(['Unpaid','Payment failed','Cash reported','Cash disputed','Cash confirmed','Digital confirmed','Refund under review','Refund recorded']),method:z.enum(['None','Cash','Digital']),holder:z.enum(['None','Worker','Society']),note:text});
export const settlementSchema = z.object({...base,bookingId:id,workerEarning:money,societyAllocation:money,status:z.enum(['Not due','Due','Under review','Payout recorded','Cash remitted']),note:text});
export const complaintSchema = z.object({...base,bookingId:id,title:text,reporter:text,status:z.enum(['Reported','Under review','Resolution agreed','Closed']),notes:z.array(text)});
export const bulkSchema = z.object({...base,institutionId:id.optional(),service:text,requested:z.number().int().positive().max(1000),start:text,days:z.number().int().min(1).max(90),hours:z.number().min(1).max(12),location:text,status:text,consent:z.boolean(),coordinated:z.boolean(),details:z.record(text).default({})});
export const allocationSchema = z.object({...base,bulkId:id,societyId:id,proposed:z.number().int().nonnegative(),committed:z.number().int().nonnegative(),accepted:z.number().int().nonnegative(),attended:z.number().int().nonnegative(),status:text}).refine(a=>a.attended<=a.accepted&&a.accepted<=a.committed&&a.committed<=a.proposed,'Capacity counters are inconsistent');
export const benefitSchema = z.object({...base,title:text,kind:z.enum(['Official information','Society information','Demo cooperative support']),source:text,checkedAt:text,caveat:text});
export const auditSchema = z.object({id,at:z.string().datetime({offset:true}),actor:text,entityId:id,action:text,detail:text});
export const policySchema = z.object({...base,title:text,version:z.number().int().positive(),effectiveDate:text,approvalRef:text,rule:text});
export const historySchema = z.object({id,trade:text,date:text,jobs:z.number().int().nonnegative(),hours:z.number().positive()});
export const recommendationSchema = z.object({...base,trade:text,status:text,hours:z.number().nonnegative(),reason:text});
export const entitiesSchema = z.object({customers:z.array(customerSchema).max(2000).default([]),institutions:z.array(institutionSchema).max(1000).default([]),federations:z.array(federationSchema).max(100).default([]),societies:z.array(societySchema).max(100),affiliations:z.array(affiliationSchema).max(200),workers:z.array(workerSchema).max(1000),bookings:z.array(bookingSchema).max(2000),quotes:z.array(quoteSchema).max(4000),payments:z.array(paymentSchema).max(2000),settlements:z.array(settlementSchema).max(2000),complaints:z.array(complaintSchema).max(500),bulkRequirements:z.array(bulkSchema).max(100),allocations:z.array(allocationSchema).max(400),benefits:z.array(benefitSchema).max(100),policies:z.array(policySchema).max(100),history:z.array(historySchema).max(2000),recommendations:z.array(recommendationSchema).max(500)});
export const envelopeSchema = z.object({schemaVersion:z.literal(1),scenarioId:z.literal('LL-DEMO-01'),originApp:z.enum(['Society','Household','Worker','Institution','District','National']),demoClock:z.string().datetime({offset:true}),synthetic:z.literal(true),entities:entitiesSchema,events:z.array(auditSchema).max(10000)}).superRefine((s,ctx)=>{
  for(const [key,items] of Object.entries(s.entities)) { const ids=items.map(x=>x.id); if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:`Duplicate entity IDs in ${key}`}); }
  const cards=s.entities.workers.map(w=>w.shramCard?.trim().replace(/\s+/g,'').toUpperCase()).filter(Boolean);
  if(new Set(cards).size!==cards.length)ctx.addIssue({code:'custom',message:'One Shram Card must map to one Worker ID. Duplicate Shram Card in handoff.'});
  if(new Set(s.events.map(e=>e.id)).size!==s.events.length)ctx.addIssue({code:'custom',message:'Duplicate event IDs in file'});
  for(const b of s.entities.bookings) {if(!s.entities.workers.some(w=>w.id===b.workerId)||!s.entities.quotes.some(q=>q.id===b.quoteId&&q.bookingId===b.id))ctx.addIssue({code:'custom',message:`Missing worker or quote for ${b.id}`});}
  for(const b of s.entities.bookings){if(!s.entities.payments.some(p=>p.bookingId===b.id)||!s.entities.settlements.some(p=>p.bookingId===b.id))ctx.addIssue({code:'custom',message:`Missing payment or settlement for ${b.id}`});if(new Date(b.start)>=new Date(b.end))ctx.addIssue({code:'custom',message:`Invalid time range for ${b.id}`});}
  for(const w of s.entities.workers){if(w.status==='Verified'&&!(w.membership&&w.identity&&w.skillVerified))ctx.addIssue({code:'custom',message:`Incomplete verification for ${w.id}`});}
});
export type Worker=z.infer<typeof workerSchema>;
export type Society=z.infer<typeof societySchema>;
export type Affiliation=z.infer<typeof affiliationSchema>;
export type Skill=z.infer<typeof skillSchema>;
export type Availability=z.infer<typeof availabilitySchema>;
export type Booking=z.infer<typeof bookingSchema>;
export type Quote=z.infer<typeof quoteSchema>;
export type PaymentRecord=z.infer<typeof paymentSchema>;
export type SettlementEntry=z.infer<typeof settlementSchema>;
export type Complaint=z.infer<typeof complaintSchema>;
export type BulkRequirement=z.infer<typeof bulkSchema>;
export type AllocationProposal=z.infer<typeof allocationSchema>;
export type BenefitResource=z.infer<typeof benefitSchema>;
export type AuditEvent=z.infer<typeof auditSchema>;
export type DemoState=z.infer<typeof envelopeSchema>;