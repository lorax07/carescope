import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "./App";
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
import { OurCompanyPage } from "./pages/OurCompanyPage";
import "./styles.css";

function WorkflowRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/workflows/${id ?? ""}`} replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="company" element={<OurCompanyPage />} />
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
