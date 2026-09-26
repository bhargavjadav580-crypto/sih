import React,{createContext,useContext,useState,useEffect} from 'react';
import {toast} from 'sonner';
import {DemoState,envelopeSchema} from './schema';
import {createSeed} from './seed';
import {Action,reduceDemo,mergeDemo} from './reducer';
import {importConflicts} from './selectors';
const KEY='labourlink-demo-v1';
function withDemoIdentities(state:DemoState){
 const seed=createSeed();
 for(const key of ['customers','institutions','federations'] as const){for(const entity of seed.entities[key]){if(!state.entities[key].some(x=>x.id===entity.id))(state.entities[key] as {id:string}[]).push(entity);}}
 const worker=state.entities.workers.find(w=>w.id==='WRK-001');if(worker&&!worker.shramCard)worker.shramCard='SHRM-DEMO-001';
 for(const b of state.entities.bookings){if(!b.customerId&&b.customer==='Aarav Mehta')b.customerId='CUS-10025';}
 const bulk=state.entities.bulkRequirements.find(b=>b.id==='BR-0400');if(bulk&&!bulk.institutionId)bulk.institutionId='INS-20015';
 return envelopeSchema.parse(state);
}
function initial(){try{const raw=localStorage.getItem(KEY);return raw?withDemoIdentities(envelopeSchema.parse(JSON.parse(raw))):createSeed();}catch{return createSeed();}}
interface Store {state:DemoState;act:(a:Action,actor?:string)=>boolean;reset:(stage?:string)=>void;importState:(s:DemoState,mode:'merge'|'replace',prefer?:boolean)=>boolean;}
const Context=createContext<Store>(null!);
export function DemoProvider({children}:{children:React.ReactNode}){
 const [state,setState]=useState<DemoState>(initial);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast.error('Browser storage unavailable. Export your demo to keep changes.');}},[state]);
 const act=(a:Action,actor='Society · Meera Shah · Demo')=>{try{const updated=reduceDemo(state,a,actor,crypto.randomUUID());localStorage.setItem(KEY,JSON.stringify(updated));setState(updated);toast.success('Demo record updated');return true;}catch(err){toast.error((err as Error).message);return false;}};
 const reset=(stage='default')=>{setState(createSeed(stage));toast.success('Demo stage loaded · not a live handoff');};
 const importState=(incoming:DemoState,mode:'merge'|'replace',prefer=false)=>{try{const checked=withDemoIdentities(envelopeSchema.parse(incoming));if(importConflicts(checked).length)throw new Error(`Overlapping accepted jobs: ${importConflicts(checked).join(', ')}`);if(mode==='replace'&&JSON.stringify(state.entities)===JSON.stringify(checked.entities)&&checked.events.every(e=>state.events.some(x=>x.id===e.id)))throw new Error('Duplicate events: this handoff has already been applied');const result=mode==='replace'?checked:mergeDemo(state,checked,prefer);setState(result);toast.success('Demo handoff imported');return true;}catch(err){toast.error((err as Error).message);return false;}};
 return <Context.Provider value={{state,act,reset,importState}}>{children}</Context.Provider>;
}
export const useDemo=()=>useContext(Context);
export function download(name:string,body:string,type='application/json'){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}