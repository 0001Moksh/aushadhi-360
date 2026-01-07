import { DashboardLayout } from "@/components/dashboard-layout"
import { AnalyticsPage } from "@/components/analytics-page"
import { UserGuard } from "@/components/user-guard"

export default function AnalyticsRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <AnalyticsPage />
      </DashboardLayout>
    </UserGuard>
  )
}
