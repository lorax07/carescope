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
import { LimsEnvironmentPage } from "./pages/LimsEnvironmentPage";
import { OpsOverviewPage } from "./pages/OpsOverviewPage";
import { SampleDetailPage } from "./pages/SampleDetailPage";
import { SamplesPage } from "./pages/SamplesPage";
import {
  LimsModulePage,
  TestsPage,
  ResultsPage,
  InventoryPage,
} from "./pages/ModulePages";
import { InsightsChatPage } from "./pages/InsightsChatPage";
import { LibraryPage } from "./pages/LibraryPage";
import { WorkflowDesignPage } from "./pages/WorkflowDesignPage";
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
        <Route path="lims/:clientId/:labId/:envId" element={<LimsEnvironmentPage />} />
        <Route path="*" element={<UnmatchedRoute />} />
        <Route path="app" element={<AppShell />}>
          <Route index element={<OpsOverviewPage />} />
          <Route path="ops/home" element={<SamplesPage view="home" />} />
          <Route path="ops/testing" element={<SamplesPage view="testing" />} />
          <Route path="ops/review" element={<SamplesPage view="review" />} />
          <Route path="ops/release" element={<SamplesPage view="release" />} />
          <Route path="samples/:accessionId" element={<SampleDetailPage />} />
          <Route path="samples" element={<SamplesPage view="home" />} />
          <Route path="tests" element={<TestsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="instruments" element={<LimsModulePage id="instrument_integration" />} />
          <Route path="connectivity" element={<LimsModulePage id="connectivity" />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="quality" element={<LimsModulePage id="quality_compliance" />} />
          <Route path="insights" element={<InsightsChatPage />} />
          <Route path="design" element={<WorkflowDesignPage />} />
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
