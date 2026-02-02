import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Config } from './pages/Config';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="receitas" element={<Transactions defaultType="Receita" />} />
            <Route path="despesas" element={<Transactions defaultType="Despesa" />} />
            <Route path="novo" element={<Transactions />} />
            <Route path="config" element={<Config />} />
            {/* Redirect 'novo' to Transactions for now, user can click + there 
                or we can open the modal automatically. 
                For simplicity, let's map 'novo' to 'Transactions' but maybe passing a state to open modal?
                Let's just redirect to defaults.
            */}
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
