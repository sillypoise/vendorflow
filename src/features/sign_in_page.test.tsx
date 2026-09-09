import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { TurnstileAPI } from "../lib/turnstile";
import { SignInPage } from "./sign_in_page";

const sign_in = vi.hoisted(() => vi.fn<() => Promise<{ error: Error | null }>>());
vi.mock("../lib/supabase", () => ({
    get_supabase_client: () => ({ auth: { signInAnonymously: sign_in } }),
}));
afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    delete window.turnstile;
});

// Prove the real form submits the token to Auth and cannot reuse it after a failed request.
it("requires verification, forwards its token, and consumes it on failed signup", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://host.example");
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "0x4fictional-site-key");
    const render_widget = vi.fn<TurnstileAPI["render"]>().mockReturnValue("widget");
    window.turnstile = { render: render_widget, remove: vi.fn<TurnstileAPI["remove"]>() };
    sign_in.mockResolvedValue({ error: new Error("private server diagnostic") });
    render(<SignInPage />);
    expect(screen.getByText(/switching simulates each responsibility/u)).toBeVisible();
    const start = screen.getByRole("button", { name: "Start private preview" });
    expect(start).toBeDisabled();
    await waitFor(() => {
        expect(render_widget).toHaveBeenCalledOnce();
    });
    act(() => {
        render_widget.mock.calls[0]?.[1].callback("fictional-single-use-token");
    });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    await waitFor(() => {
        expect(sign_in).toHaveBeenCalledOnce();
    });
    expect(sign_in).toHaveBeenCalledWith({
        options: { captchaToken: "fictional-single-use-token" },
    });
    expect(await screen.findByRole("alert")).not.toHaveTextContent("private server diagnostic");
    expect(start).toBeDisabled();
    await waitFor(() => {
        expect(render_widget).toHaveBeenCalledTimes(2);
    });
});

it("fails closed when hosted CAPTCHA configuration is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://host.example");
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    render(<SignInPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("not configured");
    fireEvent.click(screen.getByRole("button", { name: "Start private preview" }));
    expect(sign_in).not.toHaveBeenCalled();
});
