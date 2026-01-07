import { DashboardLayout } from "@/components/dashboard-layout"
import { ManualImportTable } from "@/components/manual-import-table"
import { UserGuard } from "@/components/user-guard"

export default function ManualImportRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <ManualImportTable />
        </div>
      </DashboardLayout>
    </UserGuard>
  )
}
