import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { ApplicationHomePage } from '../pages/ApplicationHomePage'
import { CategoriesPage } from '../pages/CategoriesPage'
import { CompanyProfilePage } from '../pages/CompanyProfilePage'
import { CustomerDetailsPage } from '../pages/CustomerDetailsPage'
import { CustomerFormPage } from '../pages/CustomerFormPage'
import { CustomersPage } from '../pages/CustomersPage'
import { LoginPage } from '../pages/LoginPage'
import { ProductDetailsPage } from '../pages/ProductDetailsPage'
import { ProductFormPage } from '../pages/ProductFormPage'
import { ProductsPage } from '../pages/ProductsPage'
import { RegisterPage } from '../pages/RegisterPage'
import { SupplierDetailsPage } from '../pages/SupplierDetailsPage'
import { SupplierFormPage } from '../pages/SupplierFormPage'
import { SuppliersPage } from '../pages/SuppliersPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/app" element={<ApplicationHomePage />} />
          <Route path="/company" element={<CompanyProfilePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/products/:productId/edit" element={<ProductFormPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
          <Route path="/customers/:customerId/edit" element={<CustomerFormPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/suppliers/new" element={<SupplierFormPage />} />
          <Route path="/suppliers/:supplierId" element={<SupplierDetailsPage />} />
          <Route path="/suppliers/:supplierId/edit" element={<SupplierFormPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/app" />} />
    </Routes>
  )
}
