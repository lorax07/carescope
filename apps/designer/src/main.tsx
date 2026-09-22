import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import { AppShell } from "./App";
import { IntrasiteAuthProvider } from "./intrasite/AuthContext";
import { IntrasiteClientDetailPage } from "./intrasite/ClientDetailPage";
import { IntrasiteLabDetailPage } from "./intrasite/LabDetailPage";
import { IntrasiteClientsPage } from "./intrasite/ClientsPage";
import { IntrasiteLoginPage } from "./intrasite/LoginPage";
import { IntrasiteShell } from "./intrasite/IntrasiteShell";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SamplesPage } from "./pages/SamplesPage";
import {
  TestsPage,
  ResultsPage,
  InstrumentsPage,
  InventoryPage,
  QualityPage,
} from "./pages/ModulePages";
import { LibraryPage } from "./pages/LibraryPage";
import { DesignerPage } from "./pages/DesignerPage";
import { CatalogPage } from "./pages/CatalogPage";
import "./styles.css";
import "./intrasite/intrasite.css";

function WorkflowRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/workflows/${id ?? ""}`} replace />;
}

function IntrasiteRoot() {
  return (
    <IntrasiteAuthProvider>
      <Outlet />
    </IntrasiteAuthProvider>
  );
}

function UnmatchedRoute() {
  const path = useLocation().pathname.toLowerCase();
  if (path.includes("intrasite") || path.includes("instrasite")) {
    return <Navigate to="/intrasite" replace />;
  }
  return <Navigate to="/" replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="intrasite" element={<IntrasiteRoot />}>
          <Route path="login" element={<IntrasiteLoginPage />} />
          <Route element={<IntrasiteShell />}>
            <Route index element={<IntrasiteClientsPage />} />
            <Route path="clients/:id" element={<IntrasiteClientDetailPage />} />
            <Route path="clients/:id/labs/:labId" element={<IntrasiteLabDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<UnmatchedRoute />} />
        <Route path="app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="samples" element={<SamplesPage />} />
          <Route path="tests" element={<TestsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="instruments" element={<InstrumentsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="workflows" element={<LibraryPage />} />
          <Route path="workflows/:id" element={<DesignerPage />} />
          <Route path="catalog" element={<CatalogPage />} />
        </Route>
        <Route path="catalog" element={<Navigate to="/app/catalog" replace />} />
        <Route path="workflows/:id" element={<WorkflowRedirect />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
