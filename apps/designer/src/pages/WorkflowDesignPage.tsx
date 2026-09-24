import { Navigate } from "react-router-dom";
import { workflowService } from "../platform";
import { LibraryPage } from "./LibraryPage";

/** Opens the workflow canvas from the sidebar, without a library stop. */
export function WorkflowDesignPage() {
  const first = workflowService.list()[0];
  if (!first) return <LibraryPage />;
  return <Navigate to={`/app/workflows/${first.id}`} replace />;
}
