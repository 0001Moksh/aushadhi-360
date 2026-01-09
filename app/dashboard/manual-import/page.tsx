import { DashboardLayout } from "@/components/dashboard-layout"
import { ManualImportTable } from "@/components/manual-import-table"

export default function ManualImportRoute() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        <ManualImportTable />
      </div>
    </DashboardLayout>
  )
}
