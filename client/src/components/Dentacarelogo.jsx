import React from "react";
import { Link } from "react-router-dom";

const ToothIcon = ({ className = "h-9 w-9" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className={className}
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M32 4C22.5 4 14 10.5 14 20c0 4.2 1.4 8 3.8 11.2C19.5 33.6 20 36.2 20 39c0 5.5 1.8 17 6 17 2.5 0 3.8-3 5-7 .8-2.6 1-4 1-4s.2 1.4 1 4c1.2 4 2.5 7 5 7 4.2 0 6-11.5 6-17 0-2.8.5-5.4 2.2-7.8C48.6 28 50 24.2 50 20 50 10.5 41.5 4 32 4Z" />
    </svg>
);

const DentaCareLogo = ({ to = "/" }) => (
    <Link
        to={to}
        className="flex items-center gap-3 hover:opacity-90 transition-opacity"
    >
        <ToothIcon className="h-9 w-9 text-[#338B9C]" />
        <span className="text-2xl font-bold text-[#1E293B]">DentaCare</span>
    </Link>
);

export { ToothIcon };
export default DentaCareLogo;
