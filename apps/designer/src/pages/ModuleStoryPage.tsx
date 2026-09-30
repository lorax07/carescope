import { Link, Navigate, useParams } from "react-router-dom";
import { moduleBySlug } from "./marketingModules";
import { SiteHeader } from "./SiteHeader";
import "./landing.css";

export function ModuleStoryPage() {
  const { slug } = useParams();
  const module = moduleBySlug(slug);
  if (!module) return <Navigate to="/" replace />;

  return (
    <div className="lp-page">
      <SiteHeader />
      <article className="lp-section lp-module">
        <div className="lp-section-inner">
          <p className="lp-module-kicker">{module.title}</p>
          <h1>{module.problemTitle}</h1>
          <div className="lp-story">
            <section>
              <h2>The problem</h2>
              <p>{module.problem}</p>
            </section>
            <section className="is-answer">
              <h2>How {module.title} answers it</h2>
              <p>{module.solution}</p>
              <ul>
                {module.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          </div>
          <div className="lp-module-actions">
            <Link to={module.appPath} className="lp-btn lp-btn-demo">
              Open this module
            </Link>
            <Link to="/app?signup=1" className="lp-nav-text">
              Request a Demo
            </Link>
          </div>
        </div>
      </article>
      <footer className="lp-footer">
        <div className="lp-footer-inner lp-section-wide">
          <p className="lp-copyright">© 2026 Carescope, All Rights Reserved</p>
          <nav>
            <a href="/intrasite" className="lp-footer-intrasite">
              Sequence Intrasite Access
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
