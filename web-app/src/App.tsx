import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Config } from './pages/Config';
import { Admin } from './pages/Admin';
import { Pending } from './pages/Pending';
import { ScalesPage } from './modules/scales/pages/ScalesPage';
import { ReloadPrompt } from './components/ui/ReloadPrompt';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ReloadPrompt />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pending" element={<Pending />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="receitas" element={<Transactions defaultType="Receita" />} />
            <Route path="despesas" element={<Transactions defaultType="Despesa" />} />
            <Route path="novo" element={<Transactions />} />
            <Route path="escalas" element={<ScalesPage />} />
            <Route path="config" element={<Config />} />

            {/* Admin Route */}
            <Route path="admin" element={
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
