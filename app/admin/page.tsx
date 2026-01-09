import { AdminDashboard } from "@/components/admin-dashboard"
import { AdminGuard } from "@/components/admin-guard"

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminDashboard />
    </AdminGuard>
  )
}
