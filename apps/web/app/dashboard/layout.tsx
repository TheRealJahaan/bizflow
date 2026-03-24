"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../lib/store";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/payments", label: "Payments" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/gst", label: "GST Reports", section: "Compliance" },
  { href: "/dashboard/cashflow", label: "Cash Flow AI" },
  { href: "/dashboard/clients", label: "Clients", section: "Management" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  let lastSection = "";

  return (
    <div className="flex min-h-screen bg-stone-100">
      <aside className="w-52 min-h-screen bg-stone-900 flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <div>
              <div className="text-white font-semibold text-sm">BizFlow</div>
              <div className="text-white/40 text-[10px]">MSME Finance</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3">
          {navItems.map((item) => {
            const showSection =
              item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;

            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <div key={item.href}>
                {showSection && (
                  <div className="px-4 pt-4 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2.5 px-4 py-2.5 text-sm border-l-[3px] transition-colors",
                    isActive
                      ? "bg-white/8 text-white border-l-emerald-500"
                      : "text-white/50 border-l-transparent hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.slice(0, 2).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">
                {user?.name}
              </div>
              <div className="text-white/40 text-[10px] capitalize">
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-white text-xs"
            >
              Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-stone-200 h-14 flex items-center px-7">
          <div className="flex-1" />
          <span className="text-xs text-stone-400">
            {user?.business_name}
          </span>
        </div>
        <main className="flex-1 p-7 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}