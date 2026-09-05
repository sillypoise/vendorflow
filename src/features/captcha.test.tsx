import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TurnstileAPI } from "../lib/turnstile";
import { Captcha } from "./captcha";

const render_widget = vi.fn<TurnstileAPI["render"]>();
const remove_widget = vi.fn<TurnstileAPI["remove"]>();
const on_token = vi.fn<(token: string | null) => void>();

beforeEach(() => {
    render_widget.mockReturnValue("fictional-widget");
    window.turnstile = { render: render_widget, remove: remove_widget };
});
afterEach(() => {
    cleanup();
    delete window.turnstile;
});

// Tokens remain transient: accept bounded input, revoke on expiry, and ignore late callbacks.
it.each([1, 2048])("accepts token length %s and revokes it on expiry", async (length) => {
    render(<Captcha site_key="0x4fictional-site-key" on_token={on_token} />);
    await waitFor(() => {
        expect(render_widget).toHaveBeenCalledOnce();
    });
    const options = render_widget.mock.calls[0]?.[1];
    expect(options?.retry).toBe("never");
    act(() => {
        options?.callback("a".repeat(length));
    });
    expect(on_token).toHaveBeenLastCalledWith("a".repeat(length));
    act(() => {
        options?.["expired-callback"]();
    });
    expect(on_token).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("alert")).toHaveTextContent("expired or failed");
    act(() => {
        options?.callback("late-token");
    });
    expect(on_token).toHaveBeenLastCalledWith(null);
});

it.each(["", "a".repeat(2049), "invalid token"])("rejects malformed token %#", async (token) => {
    render(<Captcha site_key="0x4fictional-site-key" on_token={on_token} />);
    await waitFor(() => {
        expect(render_widget).toHaveBeenCalledOnce();
    });
    act(() => {
        render_widget.mock.calls[0]?.[1].callback(token);
    });
    expect(on_token).toHaveBeenCalledWith(null);
    expect(screen.getByRole("alert")).toHaveTextContent("expired or failed");
});

it("removes the widget and rejects callbacks after unmount", async () => {
    const view = render(<Captcha site_key="0x4fictional-site-key" on_token={on_token} />);
    await waitFor(() => {
        expect(render_widget).toHaveBeenCalledOnce();
    });
    view.unmount();
    expect(remove_widget).toHaveBeenCalledWith("fictional-widget");
    act(() => {
        render_widget.mock.calls[0]?.[1].callback("late-token");
    });
    expect(on_token).not.toHaveBeenCalled();
});

it("handles provider failures without showing raw diagnostics", async () => {
    render_widget.mockImplementation(() => {
        throw new Error("private provider diagnostic");
    });
    render(<Captcha site_key="0x4fictional-site-key" on_token={on_token} />);
    expect(await screen.findByRole("alert")).not.toHaveTextContent("private");
    expect(on_token).toHaveBeenCalledWith(null);
});
