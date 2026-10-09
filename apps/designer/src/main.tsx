import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "./App";
import { IntrasiteAuthProvider } from "./intrasite/AuthContext";
import { IntrasiteClientDetailPage } from "./intrasite/ClientDetailPage";
import { IntrasiteLabDetailPage } from "./intrasite/LabDetailPage";
import { IntrasiteClientsPage } from "./intrasite/ClientsPage";
import { IntrasiteLoginPage } from "./intrasite/LoginPage";
import { IntrasiteShell } from "./intrasite/IntrasiteShell";
import { LandingPage } from "./pages/LandingPage";
import { ModuleStoryPage } from "./pages/ModuleStoryPage";
import { PricingPage } from "./pages/PricingPage";
import { LimsEnvironmentPage } from "./pages/LimsEnvironmentPage";
import { OpsOverviewPage } from "./pages/OpsOverviewPage";
import { SampleDetailPage } from "./pages/SampleDetailPage";
import { SamplesPage } from "./pages/SamplesPage";
import {
  TestsPage,
  ResultsPage,
  InventoryPage,
} from "./pages/ModulePages";
import { QualityPage } from "./pages/QualityPage";
import { InstrumentInterfacePage, InstrumentRecordPage } from "./pages/InstrumentInterfacePage";
import { InstrumentAcquirePage, InstrumentQueuePage, InstrumentReviewPage } from "./pages/instruments/InstrumentWork";
import { BillingPage } from "./pages/BillingPage";
import { RcmAnalyticsPage } from "./pages/rcm/RcmAnalyticsPage";
import { RcmArPage } from "./pages/rcm/RcmArPage";
import { RcmClaimDetailPage } from "./pages/rcm/RcmClaimDetailPage";
import { RcmClaimsPage } from "./pages/rcm/RcmClaimsPage";
import { RcmConfigPage } from "./pages/rcm/RcmConfigPage";
import { RcmDenialsPage } from "./pages/rcm/RcmDenialsPage";
import { RcmOverviewPage } from "./pages/rcm/RcmOverviewPage";
import { RcmPaymentsPage } from "./pages/rcm/RcmPaymentsPage";
import { RcmQueuesPage } from "./pages/rcm/RcmQueuesPage";
import { CrmActivitiesPage } from "./pages/crm/CrmActivitiesPage";
import { CrmAnalyticsPage } from "./pages/crm/CrmAnalyticsPage";
import { CrmClientDetailPage } from "./pages/crm/CrmClientDetailPage";
import { CrmClientsPage } from "./pages/crm/CrmClientsPage";
import { CrmCommunicationsPage } from "./pages/crm/CrmCommunicationsPage";
import { CrmContactsPage } from "./pages/crm/CrmContactsPage";
import { CrmDocumentsPage } from "./pages/crm/CrmDocumentsPage";
import { CrmHealthPage } from "./pages/crm/CrmHealthPage";
import { CrmIssuesPage } from "./pages/crm/CrmIssuesPage";
import { CrmOpportunitiesPage } from "./pages/crm/CrmOpportunitiesPage";
import { CrmOverviewPage } from "./pages/crm/CrmOverviewPage";
import { CrmTasksPage } from "./pages/crm/CrmTasksPage";
import { InsightsChatPage } from "./pages/InsightsChatPage";
import { LibraryPage } from "./pages/LibraryPage";
import { WorkflowDesignPage } from "./pages/WorkflowDesignPage";
import { DesignerPage } from "./pages/DesignerPage";
import { CatalogPage } from "./pages/CatalogPage";
import "./styles.css";
import "./intrasite/intrasite.css";

function BillingIndex() {
  const [params] = useSearchParams();
  if (params.get("account") || params.get("stage")) {
    return <Navigate to={`/app/billing/capture?${params.toString()}`} replace />;
  }
  return <RcmOverviewPage />;
}

function ClientIndex() {
  const [params] = useSearchParams();
  const account = params.get("account");
  if (account) return <Navigate to={`/app/connectivity/clients/${account}`} replace />;
  return <CrmOverviewPage />;
}

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
        <Route path="what-we-solve" element={<Navigate to="/#less-friction" replace />} />
        <Route path="modules/:slug" element={<ModuleStoryPage />} />
        <Route path="pricing" element={<PricingPage />} />
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
          <Route path="instruments/queue" element={<InstrumentQueuePage />} />
          <Route path="instruments/acquire" element={<InstrumentAcquirePage />} />
          <Route path="instruments/review/:runId" element={<InstrumentReviewPage />} />
          <Route path="instruments/review" element={<InstrumentReviewPage />} />
          <Route path="instruments/:instrumentId" element={<InstrumentRecordPage />} />
          <Route path="instruments" element={<InstrumentInterfacePage />} />
          <Route path="connectivity/clients/:accountId" element={<CrmClientDetailPage />} />
          <Route path="connectivity/clients" element={<CrmClientsPage />} />
          <Route path="connectivity/contacts" element={<CrmContactsPage />} />
          <Route path="connectivity/activities" element={<CrmActivitiesPage />} />
          <Route path="connectivity/tasks" element={<CrmTasksPage />} />
          <Route path="connectivity/opportunities" element={<CrmOpportunitiesPage />} />
          <Route path="connectivity/health" element={<CrmHealthPage />} />
          <Route path="connectivity/communications" element={<CrmCommunicationsPage />} />
          <Route path="connectivity/issues" element={<CrmIssuesPage />} />
          <Route path="connectivity/documents" element={<CrmDocumentsPage />} />
          <Route path="connectivity/analytics" element={<CrmAnalyticsPage />} />
          <Route path="connectivity" element={<ClientIndex />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="billing/claims/:claimId" element={<RcmClaimDetailPage />} />
          <Route path="billing/claims" element={<RcmClaimsPage />} />
          <Route path="billing/queues" element={<RcmQueuesPage />} />
          <Route path="billing/payments" element={<RcmPaymentsPage />} />
          <Route path="billing/denials" element={<RcmDenialsPage />} />
          <Route path="billing/ar" element={<RcmArPage />} />
          <Route path="billing/config" element={<RcmConfigPage />} />
          <Route path="billing/analytics" element={<RcmAnalyticsPage />} />
          <Route path="billing/capture" element={<BillingPage />} />
          <Route path="billing" element={<BillingIndex />} />
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
