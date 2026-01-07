import { DashboardLayout } from "@/components/dashboard-layout"
import { AlertsPage } from "@/components/alerts-page"
import { UserGuard } from "@/components/user-guard"

export default function AlertsRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <AlertsPage />
      </DashboardLayout>
    </UserGuard>
  )
}
