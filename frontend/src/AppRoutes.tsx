import React from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {Toaster} from 'sonner';
import './i18n';
import './App.css';
import {DemoProvider} from './demo/store';
import {Shell} from './components/Shell';
import Overview from './pages/Overview';
import Workers from './pages/Workers';
import Jobs from './pages/Jobs';
import Payments from './pages/Payments';
import {Complaints,Welfare,Policies,Planning} from './pages/Cooperative';
import HouseholdHome,{HouseholdRequest} from './pages/Household';
import WorkerHome,{WorkerProfile,Learning} from './pages/Worker';
import Bulk from './pages/Bulk';
import National,{Affiliations,DistrictIssues} from './pages/Federation';
import InstitutionFinance from './pages/InstitutionFinance';
export default function AppRoutes(){return <DemoProvider><BrowserRouter><Shell><Routes><Route path="/" element={<Navigate to="/society" replace/>}/><Route path="/society" element={<Overview/>}/><Route path="/society/workers" element={<Workers/>}/><Route path="/society/verification" element={<Workers key="verification" verification/>}/><Route path="/society/jobs" element={<Jobs/>}/><Route path="/society/bulk" element={<Bulk/>}/><Route path="/society/payments" element={<Payments/>}/><Route path="/society/complaints" element={<Complaints/>}/><Route path="/society/welfare" element={<Welfare/>}/><Route path="/society/planning" element={<Planning/>}/><Route path="/society/policies" element={<Policies/>}/><Route path="/household" element={<HouseholdHome/>}/><Route path="/household/request" element={<HouseholdRequest/>}/><Route path="/household/bookings" element={<Jobs role="Household"/>}/><Route path="/household/help" element={<Complaints/>}/><Route path="/worker" element={<WorkerHome/>}/><Route path="/worker/jobs" element={<Jobs role="Worker"/>}/><Route path="/worker/earnings" element={<Payments worker/>}/><Route path="/worker/profile" element={<WorkerProfile/>}/><Route path="/worker/learn" element={<Learning/>}/><Route path="/worker/welfare" element={<Welfare worker/>}/><Route path="/institution" element={<Bulk role="Institution"/>}/><Route path="/institution/requirements" element={<Bulk role="Institution"/>}/><Route path="/institution/finances" element={<InstitutionFinance/>}/><Route path="/institution/complaints" element={<Complaints/>}/><Route path="/district" element={<Bulk role="District"/>}/><Route path="/district/affiliations" element={<Affiliations/>}/><Route path="/district/requests" element={<Bulk role="District"/>}/><Route path="/district/capacity" element={<Bulk role="District" view="capacity"/>}/><Route path="/district/allocation" element={<Bulk role="District" view="allocation"/>}/><Route path="/district/planning" element={<Planning/>}/><Route path="/district/issues" element={<DistrictIssues/>}/>{['','relationships','regions','training','coordination','welfare','quality'].map(v=><Route key={v} path={`/national${v?'/'+v:''}`} element={<National view={v||'overview'}/>}/>)}<Route path="*" element={<Navigate to="/society" replace/>}/></Routes></Shell><Toaster position="top-right" richColors closeButton toastOptions={{style:{fontFamily:'Manrope, sans-serif',fontSize:12}}}/></BrowserRouter></DemoProvider>;}