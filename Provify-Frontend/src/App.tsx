import { BrowserRouter, Routes, Route } from "react-router-dom";
import HeroPage from "@/pages/HeroPage";
import DashboardPage from "@/pages/DashboardPage";
import BugsPage from "@/pages/BugsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HeroPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bugs" element={<BugsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;