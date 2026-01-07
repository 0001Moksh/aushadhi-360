import { DashboardLayout } from "@/components/dashboard-layout"
import { ProductsPage } from "@/components/products-page"
import { UserGuard } from "@/components/user-guard"

export default function ProductsRoute() {
  return (
    <UserGuard>
      <DashboardLayout>
        <ProductsPage />
      </DashboardLayout>
    </UserGuard>
  )
}
