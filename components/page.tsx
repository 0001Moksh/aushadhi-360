import { ManualImportTable } from "@/components/manual-import-table"

export default function ManualImportPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Manual Medicine Import</h1>
      <p className="mb-6 text-muted-foreground">
        Add medicine data manually or upload a CSV/Excel file.
      </p>
      <ManualImportTable />
    </main>
  )
}