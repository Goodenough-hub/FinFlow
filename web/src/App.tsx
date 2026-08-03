import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import TransactionsPage from './pages/TransactionsPage'
import AccountsPage from './pages/AccountsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import SettingsPage from './pages/SettingsPage'
import CategoriesPage from './pages/CategoriesPage'
import BudgetsPage from './pages/BudgetsPage'
import RecurringPage from './pages/RecurringPage'
import SearchPage from './pages/SearchPage'
import ReportsPage from './pages/ReportsPage'
import ImportPage from './pages/ImportPage'
import TransactionFormPage from './pages/TransactionFormPage'
import TripListPage from './pages/TripListPage'
import TripReportPage from './pages/TripReportPage'
import TripSpendPage from './pages/TripSpendPage'
import LoginPage from './pages/LoginPage'
import PWAToasts from './components/PWAToasts'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { trackPageview } from './api/track'

function PageTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageview(location.pathname)
  }, [location])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <PageTracker />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
          <Route path="/transactions/new" element={<TransactionFormPage />} />
          <Route path="/transactions/:id" element={<TransactionFormPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/trips" element={<TripListPage />} />
          <Route path="/trips/:id" element={<TripReportPage />} />
          <Route path="/trips/:id/spend" element={<TripSpendPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PWAToasts />
    </AuthProvider>
  )
}
