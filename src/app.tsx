import { Link, Outlet } from "@tanstack/react-router";

export function RootLayout() {
    return (
        <div className="site-shell">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="VendorFlow home">
                    <span className="brand-mark" aria-hidden="true">
                        VF
                    </span>
                    <span>VendorFlow</span>
                </Link>
                <span className="project-label">Independent product concept</span>
            </header>
            <Outlet />
        </div>
    );
}

export function HomePage() {
    return (
        <main>
            <section className="hero" aria-labelledby="hero-heading">
                <div className="eyebrow">Vendor intake without spreadsheet drift</div>
                <h1 id="hero-heading">Every vendor decision has an owner and a history.</h1>
                <p className="hero-summary">
                    VendorFlow turns scattered intake, review, and approval work into one explicit,
                    permission-aware process.
                </p>
                <div className="stage-card" aria-label="Current project stage">
                    <span className="status-dot" aria-hidden="true" />
                    <div>
                        <strong>Foundation in progress</strong>
                        <span>
                            The working approval flow arrives in the next implementation stages.
                        </span>
                    </div>
                </div>
            </section>

            <section className="proof-grid" aria-labelledby="proof-heading">
                <div>
                    <p className="section-kicker">What this project proves</p>
                    <h2 id="proof-heading">A real operational workflow, not a dashboard mockup.</h2>
                </div>
                <ol className="flow-list">
                    <li>
                        <span>01</span>
                        <p>Requesters submit complete vendor information.</p>
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
        </main>
    );
}

export function NotFoundPage() {
    return (
        <main className="message-page">
            <p className="section-kicker">404</p>
            <h1>This page is outside the workflow.</h1>
            <p>The address may be incorrect, or the page may have moved.</p>
            <a className="text-link" href="/">
                Return to VendorFlow
            </a>
        </main>
    );
}
