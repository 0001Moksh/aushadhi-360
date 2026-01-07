import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardHome } from "@/components/dashboard-home"
import { UserGuard } from "@/components/user-guard"

export default function DashboardPage() {
  return (
    <UserGuard>
      <DashboardLayout>
        <DashboardHome />
      </DashboardLayout>
    </UserGuard>
  )
}
