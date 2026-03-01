/**
 * GuestLayout — minimal chrome for auth pages (login, forgot password)
 * Simple centered card on gray-100 background
 */

import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';

export function GuestLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 pt-6 sm:pt-0">
      <Link to="/" className="mb-6 text-2xl font-bold text-brand-blue">
        iFinallyWill
      </Link>

      <div className="w-full overflow-hidden rounded-lg bg-white px-6 py-4 shadow-md sm:max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
