// client/src/components/layout/AdminLayout.jsx
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background" data-admin-portal>
      <Sidebar />
      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <div className="admin-page-shell">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
