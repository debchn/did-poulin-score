import { Routes, Route } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { LandingPage } from "./pages/LandingPage";
import { Dashboard } from "./pages/Dashboard";
import { PlayerList } from "./pages/PlayerList";
import { PlayerDetail } from "./pages/PlayerDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/players" element={<RequireAuth><PlayerList /></RequireAuth>} />
      <Route path="/players/:id" element={<RequireAuth><PlayerDetail /></RequireAuth>} />
    </Routes>
  );
}
