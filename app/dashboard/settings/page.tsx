import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsPage } from "@/components/settings-page"
import { UserGuard } from "@/components/user-guard"

export default function SettingsRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <SettingsPage />
      </DashboardLayout>
    </UserGuard>
  )
}
