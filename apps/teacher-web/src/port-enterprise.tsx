import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EnterprisePage } from './features/port-simulation/enterprise/EnterpriseApp';
createRoot(document.getElementById('port-enterprise-root')!).render(<StrictMode><EnterprisePage/></StrictMode>);
