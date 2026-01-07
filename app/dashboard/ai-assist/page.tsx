import { DashboardLayout } from "@/components/dashboard-layout"
import { AIAssistPage } from "@/components/ai-assist-page"
import { UserGuard } from "@/components/user-guard"

export default function AIAssistRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <AIAssistPage />
      </DashboardLayout>
    </UserGuard>
  )
}
