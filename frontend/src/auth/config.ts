import {Building2,House,HardHat,BriefcaseBusiness,Network,Globe2} from 'lucide-react';
export const panelRoles=['society','household','worker','institution','district','national'] as const;
export type Role=typeof panelRoles[number];
export const panels={
 society:{title:'Society',description:'Verify, allocate & reconcile',icon:Building2,idLabel:'Society ID',loginLabel:'Society ID / Email',demoId:'SOC-A',registerLabel:'Register Society'},
 household:{title:'Household',description:'Find a trusted service',icon:House,idLabel:'Customer ID',loginLabel:'Mobile Number / Email',demoId:'CUS-10025',registerLabel:'New User? Create Account'},
 worker:{title:'Worker',description:'Your work. Your choice.',icon:HardHat,idLabel:'Worker ID',loginLabel:'Worker ID / Shram Card Number',demoId:'WRK-001',registerLabel:'Create Worker Account'},
 institution:{title:'Institution',description:'Plan multi-worker services',icon:BriefcaseBusiness,idLabel:'Institution ID',loginLabel:'Email / Mobile Number',demoId:'INS-20015',registerLabel:'Register Organization'},
 district:{title:'District',description:'Coordinate with consent',icon:Network,idLabel:'District ID',loginLabel:'District ID / Email',demoId:'DIST-AHM-01',registerLabel:''},
 national:{title:'National',description:'Authorized insights only',icon:Globe2,idLabel:'National ID',loginLabel:'National ID / Email',demoId:'NAT-001',registerLabel:''}
};
export const canRegister=(role:Role)=>!['district','national'].includes(role);
export const normalizeCard=(value:string)=>value.trim().replace(/\s+/g,'').toUpperCase();
export const normalizeMobile=(value:string)=>value.replace(/[\s()+-]/g,'');
export type Registration=Record<string,string>;
export type FieldSpec={key:string;label:string;type?:string;optional?:boolean;autoComplete?:string};
const name:FieldSpec={key:'name',label:'Full Name',autoComplete:'name'};
const mobile:FieldSpec={key:'mobile',label:'Mobile Number',type:'tel',autoComplete:'tel'};
const email:FieldSpec={key:'email',label:'Email',type:'email',autoComplete:'email'};
const passwords:FieldSpec[]=[{key:'password',label:'Password',type:'password',autoComplete:'new-password'},{key:'confirmPassword',label:'Confirm Password',type:'password',autoComplete:'new-password'}];
export const registrationFields:Partial<Record<Role,FieldSpec[]>>={
 household:[name,mobile,email,...passwords],
 institution:[{key:'name',label:'Organization Name'},{key:'contactName',label:'Contact Person Name'},mobile,email,...passwords],
 worker:[{key:'shramCard',label:'Shram Card Number'},name,mobile,{...email,optional:true},...passwords,{key:'trade',label:'Main Skill/Trade'},{key:'experience',label:'Experience (years)',type:'number'},{key:'area',label:'Location'}],
 society:[{key:'name',label:'Society Name'},{key:'registrationNumber',label:'Society Registration Number'},{key:'adminName',label:'Admin Name'},mobile,email,...passwords]
};
export function validateRegistration(role:Role,form:Registration){
 const errors:Record<string,string>={};
 for(const field of registrationFields[role]||[]){const value=(form[field.key]||'').trim();if(!value&&!field.optional)errors[field.key]=`${field.label} is required.`;else if(value.length>100&&field.type!=='password')errors[field.key]='Use 100 characters or fewer.';}
 if(form.name&&form.name.trim().length<2)errors.name='Enter at least two characters.';
 if(form.mobile&&!/^\d{10,15}$/.test(normalizeMobile(form.mobile)))errors.mobile='Enter a valid mobile number (10–15 digits).';
 if(form.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))errors.email='Enter a valid email address.';
 if(form.password&&form.password.length<6)errors.password='Use at least 6 characters for this demo password.';
 if(form.password!==form.confirmPassword)errors.confirmPassword='Passwords do not match.';
 if(role==='worker'&&form.experience&&(!Number.isInteger(Number(form.experience))||Number(form.experience)<0||Number(form.experience)>70))errors.experience='Enter whole years from 0 to 70.';
 return errors;
}
