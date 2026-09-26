import React,{createContext,useContext,useEffect,useState} from 'react';
import {z} from 'zod';
import {useDemo} from '../demo/store';
import {demoIdentities} from '../demo/identities';
import {Worker} from '../demo/schema';
import {TRADES} from '../demo/seed';
import {Role,panelRoles,Registration,canRegister,normalizeCard,normalizeMobile,validateRegistration} from './config';
const ACCOUNTS='ll_auth_v1',SESSION='ll_auth_session_v1';
const accountSchema=z.object({role:z.enum(panelRoles),accountId:z.string(),displayName:z.string(),password:z.string(),email:z.string(),mobile:z.string(),shramCard:z.string().optional()});
type Account=z.infer<typeof accountSchema>;
const sessionSchema=accountSchema.pick({role:true,accountId:true,displayName:true,shramCard:true}).extend({isAuthenticated:z.literal(true)});
export type Session=z.infer<typeof sessionSchema>;
function accounts():Account[]{
 const raw=localStorage.getItem(ACCOUNTS);const list=raw?z.array(accountSchema).parse(JSON.parse(raw)):[];
 for(const role of panelRoles){const demo=demoIdentities[role];if(!list.some(a=>a.role===role&&a.accountId===demo.id))list.push({role,accountId:demo.id,displayName:demo.name,email:demo.email,mobile:'mobile' in demo?demo.mobile:'',password:'demo123',...('shramCard' in demo?{shramCard:demo.shramCard}:{})});}
 localStorage.setItem(ACCOUNTS,JSON.stringify(list));return list;
}
function readSession():Session|null{
 const list=accounts();const raw=localStorage.getItem(SESSION);if(!raw)return null;
 const parsed=sessionSchema.safeParse(JSON.parse(raw));return parsed.success&&list.some(a=>a.role===parsed.data.role&&a.accountId===parsed.data.accountId)?parsed.data:null;
}
function matches(account:Account,identifier:string){
 const value=identifier.trim().toLowerCase();
 if(account.role==='worker')return account.accountId.toLowerCase()===value||account.shramCard===normalizeCard(identifier);
 return account.accountId.toLowerCase()===value||account.email.toLowerCase()===value||(['household','institution'].includes(account.role)&&!!account.mobile&&account.mobile===normalizeMobile(identifier));
}
interface AuthStore {session:Session|null;login:(role:Role,identifier:string,password:string)=>void;logout:()=>void;register:(role:Role,form:Registration)=>Account;resetPassword:(role:Role,identifier:string,password:string)=>void;hasWorker:(identifier:string)=>boolean;}
const AuthContext=createContext<AuthStore>(null!);
export function AuthProvider({children}:{children:React.ReactNode}){
 const {state,act}=useDemo();const [session,setSession]=useState<Session|null>(readSession);
 useEffect(()=>{const update=(event:StorageEvent)=>{if(event.key===SESSION||event.key===null)setSession(readSession());};window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update);},[]);
 const login=(role:Role,identifier:string,password:string)=>{
  const account=accounts().find(a=>a.role===role&&matches(a,identifier));
  if(!account||account.password!==password)throw new Error('The identifier or password is incorrect for this panel.');
  const next:Session={role,accountId:account.accountId,displayName:account.displayName,isAuthenticated:true,...(account.shramCard?{shramCard:account.shramCard}:{})};
  localStorage.setItem(SESSION,JSON.stringify(next));setSession(next);
 };
 const register=(role:Role,form:Registration)=>{
  if(!canRegister(role))throw new Error('This panel has no public registration.');
  const errors=validateRegistration(role,form);if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
  const list=accounts(),email=(form.email||'').trim().toLowerCase(),mobile=normalizeMobile(form.mobile),shramCard=normalizeCard(form.shramCard||'');
  const existingWorker=role==='worker'&&(list.find(a=>a.role==='worker'&&a.shramCard===shramCard)||state.entities.workers.find(w=>w.shramCard&&normalizeCard(w.shramCard)===shramCard));
  if(existingWorker)throw new Error('This Shram Card already has a Worker ID. Log in with your existing Worker ID or Shram Card; no second account was created. If imported, log in on the origin where you registered.');
  if(list.some(a=>a.role===role&&((email&&a.email===email)||a.mobile===mobile)))throw new Error('An account with this email or mobile already exists in this panel. Please log in.');
  if(role==='society'&&state.entities.societies.some(s=>s.registrationNumber?.trim().toUpperCase()===form.registrationNumber.trim().toUpperCase()))throw new Error('This society registration number already has an account. Please log in.');
  const used=new Set([...list.map(a=>a.accountId),...Object.values(state.entities).flatMap(items=>items.map(x=>x.id))]);
  let accountId='';const size=role==='society'?900:90000,prefix=role==='society'?'SOC-A':role==='worker'?'WRK-':role==='institution'?'INS-':'CUS-';
  const start=crypto.getRandomValues(new Uint32Array(1))[0]%size;
  for(let i=0;i<size;i++){const candidate=prefix+((start+i)%size+(role==='society'?100:10000));if(!used.has(candidate)){accountId=candidate;break;}}
  if(!accountId)throw new Error('Demo identifier range is full. Export your scenario before starting a new demo.');
  const account:Account={role,accountId,displayName:form.name.trim(),email,mobile,password:form.password,...(role==='worker'?{shramCard}:{})};
  const base={id:accountId,name:account.displayName,email,mobile,updatedAt:state.demoClock};
  let collection:'workers'|'customers'|'institutions'|'societies';let entity:any;
  if(role==='worker'){
   collection='workers';entity={...base,shramCard,societyId:'SOC-A',trade:form.trade.trim(),experience:Number(form.experience),area:form.area.trim(),membershipRef:'',status:'Pending review',membership:false,identity:false,skillVerified:false,certificate:false,available:false,reviewer:'',source:'Worker registration · synthetic self-declaration',reviewDate:'',reviewDue:'',reason:'Membership, identity and skill evidence awaiting society review',skills:[{id:`SK-${accountId}`,name:form.trade.trim(),verified:false}],availability:[]} satisfies Worker;
  }else if(role==='household'){collection='customers';entity=base;}
  else if(role==='institution'){collection='institutions';entity={...base,contactName:form.contactName.trim()};}
  else {collection='societies';entity={...base,shortName:form.name.trim(),services:TRADES,adminName:form.adminName.trim(),registrationNumber:form.registrationNumber.trim().toUpperCase()};}
  localStorage.setItem(ACCOUNTS,JSON.stringify([...list,account]));
  if(!act({type:'register-entity',collection,entity},`${role} · ${accountId} · Demo`)){localStorage.setItem(ACCOUNTS,JSON.stringify(list));throw new Error('Account could not be added to the demo fixtures. No account was created.');}
  return account;
 };
 const logout=()=>{localStorage.removeItem(SESSION);setSession(null);};
 const resetPassword=(role:Role,identifier:string,password:string)=>{
  if(password.length<6)throw new Error('Use at least 6 characters for this demo password.');
  const list=accounts(),account=list.find(a=>a.role===role&&matches(a,identifier));if(!account)throw new Error('No local demo account found for this panel.');
  account.password=password;localStorage.setItem(ACCOUNTS,JSON.stringify(list));
  if(session?.role===role&&session.accountId===account.accountId)logout();
 };
 return <AuthContext.Provider value={{session,login,logout,register,resetPassword,hasWorker:identifier=>accounts().some(a=>a.role==='worker'&&matches(a,identifier))}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
