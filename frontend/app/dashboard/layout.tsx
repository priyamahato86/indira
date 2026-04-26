import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import DashboardNav from "./DashboardNav";
import DashboardTopBar from "./DashboardTopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[color:var(--color-surface)]">
      <div data-print-hide className="contents">
        <DashboardNav email={user.email} />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div data-print-hide>
          <DashboardTopBar />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1280px] mx-auto px-6 md:px-10 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
