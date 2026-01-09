import { DashboardLayout } from "@/components/dashboard-layout"
import { ManualImportTable } from "@/components/manual-import-table"

export default function ManualImportRoute() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-balance mb-2">Manual Import</h1>
          <p className="text-muted-foreground text-pretty">
            Add medicines via an editable table or upload a CSV/Excel template.
          </p>
        </div>
        <ManualImportTable />
      </div>
    </DashboardLayout>
  )
}
