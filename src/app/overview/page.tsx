import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SystemTelemetryDashboard } from "@/components/SystemTelemetryDashboard";

export default async function OverviewPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SystemTelemetryDashboard />
    </div>
  );
}

