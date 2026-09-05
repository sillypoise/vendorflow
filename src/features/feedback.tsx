import { workflow_error_message } from "../lib/vendor_requests";

export function MutationError({ error }: { error: unknown }) {
    return error === null ? null : (
        <div className="error-banner" role="alert">
            <p>{workflow_error_message(error)}</p>
            <button
                onClick={() => {
                    globalThis.location.reload();
                }}
                type="button"
            >
                Refresh request
            </button>
        </div>
    );
}

export function LoadingPage({ message }: { message: string }) {
    return (
        <main className="message-page">
            <output>{message}</output>
        </main>
    );
}

export function ErrorPage({ message }: { message: string }) {
    return (
        <main className="message-page">
            <p className="section-kicker">Unable to continue</p>
            <h1>Something interrupted the workflow.</h1>
            <p role="alert">{message}</p>
            <button
                className="primary-button"
                onClick={() => {
                    globalThis.location.reload();
                }}
                type="button"
            >
                Retry
            </button>
        </main>
    );
}
