import { Outlet } from 'react-router';
import { Footer } from './Footer.tsx';

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
      <Outlet />
      <Footer />
    </div>
  );
}
