// client/src/components/layout/DoctorLayout.jsx
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

const DoctorLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DoctorLayout;
