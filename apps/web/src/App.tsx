import { Routes, Route } from 'react-router';
import { AppLayout } from './layout/AppLayout.tsx';
import { StartPage } from './pages/StartPage.tsx';
import { WizardPage } from './pages/WizardPage.tsx';
import { DatenquellenPage } from './pages/DatenquellenPage.tsx';
import { KontoPage } from './pages/KontoPage.tsx';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<StartPage />} />
        <Route path="/pruefung" element={<WizardPage />} />
        <Route path="/datenquellen" element={<DatenquellenPage />} />
        <Route path="/konto" element={<KontoPage />} />
      </Route>
    </Routes>
  );
}
