import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "./App";
import { LandingPage } from "./pages/LandingPage";
import { LibraryPage } from "./pages/LibraryPage";
import { DesignerPage } from "./pages/DesignerPage";
import { CatalogPage } from "./pages/CatalogPage";
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
        <Route path="app" element={<AppShell />}>
          <Route index element={<LibraryPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="workflows/:id" element={<DesignerPage />} />
        </Route>
        <Route path="catalog" element={<Navigate to="/app/catalog" replace />} />
        <Route path="workflows/:id" element={<WorkflowRedirect />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
