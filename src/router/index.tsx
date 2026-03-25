import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import PlanNewPage from '../pages/PlanNewPage'
import PlanPromptPage from '../pages/PlanPromptPage'
import PlanImportPage from '../pages/PlanImportPage'
import ProtectedRoute from '../components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/plan/new',
        element: <PlanNewPage />,
      },
      {
        path: '/plan/prompt',
        element: <PlanPromptPage />,
      },
      {
        path: '/plan/import',
        element: <PlanImportPage />,
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
