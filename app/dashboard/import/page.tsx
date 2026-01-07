import { DashboardLayout } from "@/components/dashboard-layout"
import { ImportMedicinePage } from "@/components/import-medicine-page"
import { UserGuard } from "@/components/user-guard"

export default function ImportRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <ImportMedicinePage />
      </DashboardLayout>
    </UserGuard>
  )
}
