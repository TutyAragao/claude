import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Ranking from './pages/Ranking.jsx';
import Lobby from './pages/Lobby.jsx';
import EditProfile from './pages/EditProfile.jsx';
import PlayerProfile from './pages/PlayerProfile.jsx';
import Admin from './pages/Admin.jsx';

function Protected({ children, organizer }) {
  const { player, isOrganizer, loading } = useAuth();
  if (loading) return <Splash />;
  if (!player) return <Navigate to="/login" replace />;
  if (organizer && !isOrganizer) return <Navigate to="/" replace />;
  return children;
}

function Splash() {
  return (
    <div className="min-h-screen grid place-items-center text-purple-light text-4xl animate-pulse">
      ♠
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Splash />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route
                path="/"
                element={
                  <Protected>
                    <Home />
                  </Protected>
                }
              />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/torneios" element={<Lobby />} />
              <Route path="/jogador/:id" element={<PlayerProfile />} />
              <Route
                path="/perfil/editar"
                element={
                  <Protected>
                    <EditProfile />
                  </Protected>
                }
              />
              <Route
                path="/painel"
                element={
                  <Protected organizer>
                    <Admin />
                  </Protected>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
