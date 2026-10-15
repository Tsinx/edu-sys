import './features/port-simulation/port-facility-readout.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PortClassLabPage } from './features/port-simulation/PortClassLabPage';
import './features/port-simulation/port-class-lab.css';
import './features/port-simulation/port-incident-briefing.css';
import './features/port-simulation/port-lab-analysis.css';
const lesson = new URLSearchParams(location.search).get('lesson') === '12' ? 12 : 11;
createRoot(document.getElementById('root')!).render(<StrictMode><PortClassLabPage lesson={lesson}/></StrictMode>);
