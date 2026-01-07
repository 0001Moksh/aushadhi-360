import { DashboardLayout } from "@/components/dashboard-layout"
import { BillingPage } from "@/components/billing-page"
import { UserGuard } from "@/components/user-guard"

export default function BillingRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <BillingPage />
      </DashboardLayout>
    </UserGuard>
  )
}
