import { Outlet } from 'react-router-dom';
import { Toasts } from '../ui/Toast';
import { Footer } from './Footer';
import { Header } from './Header';
import { SearchModal } from './SearchModal';

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
      <SearchModal />
      <Toasts />
      <iframe title="tg" name="tg-bridge" id="tg-bridge" className="hidden" />
    </div>
  );
}
