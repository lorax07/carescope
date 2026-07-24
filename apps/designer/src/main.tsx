import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./App";
import { LibraryPage } from "./pages/LibraryPage";
import { DesignerPage } from "./pages/DesignerPage";
import { CatalogPage } from "./pages/CatalogPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<LibraryPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="workflows/:id" element={<DesignerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
