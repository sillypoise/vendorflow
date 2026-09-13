import { Link, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";

function PublicHeader() {
    return (
        <header className="site-header">
            <Link className="brand" to="/" aria-label="VendorFlow home">
                <img
                    className="brand-mark"
                    src="/vendorflow-mark.svg"
                    alt=""
                    width="40"
                    height="40"
                />
                <span>VendorFlow</span>
            </Link>
            <span className="project-label">Independent product concept · Sample data</span>
        </header>
    );
}

export function RootLayout() {
    return (
        <div className="site-shell" id="main-content">
            <a
                className="skip-link"
                href="#main-content"
                onClick={(event) => {
                    const main = document.querySelector("main");
                    if (main === null) return;
                    event.preventDefault();
                    main.tabIndex = -1;
                    main.focus();
                }}
            >
                Skip to main content
            </a>
            <Suspense
                fallback={
                    <main className="message-page">
                        <output>Loading page…</output>
                    </main>
                }
            >
                <Outlet />
            </Suspense>
        </div>
    );
}

function WorkflowProof() {
    return (
        <section className="proof-grid" aria-labelledby="proof-heading">
            <div>
                <p className="section-kicker">How it works</p>
                <h2 id="proof-heading">From vendor request to recorded decision.</h2>
            </div>
            <ol className="flow-list">
                <li>
                    <span>01</span>
                    <p>Requesters save and submit complete vendor information.</p>
                </li>
                <li>
                    <span>02</span>
                    <p>Authorized teammates assign and review each request.</p>
                </li>
                <li>
                    <span>03</span>
                    <p>PostgreSQL protects every transition and audit event.</p>
                </li>
            </ol>
        </section>
    );
}

function WorkflowIllustration() {
    return (
        <figure className="workflow-illustration">
            <figcaption>
                Inside the workflow <span>Illustrative example</span>
            </figcaption>
            <div className="illustration-request">
                <p className="section-kicker">Vendor request · Facilities</p>
                <h2>Workplace services</h2>
                <p>One request. A clear chain of responsibility.</p>
            </div>
            <ol className="illustration-timeline">
                <li>
                    <span aria-hidden="true">01</span>
                    <div>
                        <strong>Details submitted</strong>
                        <p>Requester adds the business need, spend, and risk.</p>
                    </div>
                </li>
                <li>
                    <span aria-hidden="true">02</span>
                    <div>
                        <strong>Reviewer assigned</strong>
                        <p>Administrator puts the decision in the right hands.</p>
                    </div>
                </li>
                <li>
                    <span aria-hidden="true">03</span>
                    <div>
                        <strong>Decision recorded</strong>
                        <p>Reviewer approves with a reason kept in the history.</p>
                    </div>
                </li>
            </ol>
            <div className="illustration-outcome">
                <span className="status-badge status-approved">Approved</span>
                <p>Other paths include requested changes or rejection.</p>
            </div>
        </figure>
    );
}

export function HomePage() {
    return (
        <>
            <PublicHeader />
            <main>
                <section className="hero" aria-labelledby="hero-heading">
                    <div className="hero-copy">
                        <div className="eyebrow">A clearer way to manage vendor intake</div>
                        <h1 id="hero-heading">Every vendor decision has an owner and a history.</h1>
                        <p className="hero-summary">
                            VendorFlow turns scattered intake, review, and approval work into one
                            explicit, permission-aware process.
                        </p>
                        <div className="hero-actions">
                            <Link className="primary-button" to="/requests">
                                Open workflow preview
                            </Link>
                        </div>
                        <p className="preview-assurance">
                            Sample data. Your own private workspace. No email required.
                        </p>
                    </div>
                    <WorkflowIllustration />
                </section>
                <WorkflowProof />
            </main>
        </>
    );
}

export function NotFoundPage() {
    return (
        <>
            <PublicHeader />
            <main className="message-page">
                <p className="section-kicker">404</p>
                <h1>This page is outside the workflow.</h1>
                <p>The address may be incorrect, or the page may have moved.</p>
                <Link className="text-link" to="/">
                    Return to VendorFlow
                </Link>
            </main>
        </>
    );
}
