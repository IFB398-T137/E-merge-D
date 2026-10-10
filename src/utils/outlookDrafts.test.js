import { afterEach, describe, expect, it, vi } from "vitest";
import { createOutlookDraft, createOutlookDraftWithRefresh } from "./outlookDrafts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("interruptible draft creation", () => {
  const message = {
    to: "recipient@example.com",
    subject: "Subject",
    htmlBody: "<p>Hello</p>",
  };
  const ok = () => new Response(JSON.stringify({ id: "draft-id" }), { status: 200 });
  const unauthorized = () => new Response("Token expired", { status: 401 });

  it("does not contact Graph when already interrupted", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn();
    const getAccessToken = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    controller.abort();

    await expect(createOutlookDraftWithRefresh("token", message, {
      signal: controller.signal, getAccessToken,
    })).rejects.toBe(controller.signal.reason);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it("does not submit a draft if interrupted during the profile check", async () => {
    const controller = new AbortController();
    const profile = Promise.withResolvers();
    const fetchMock = vi.fn().mockReturnValueOnce(profile.promise);
    vi.stubGlobal("fetch", fetchMock);
    const run = createOutlookDraftWithRefresh("token", message, {
      signal: controller.signal, getAccessToken: vi.fn(),
    });

    controller.abort();
    profile.resolve(ok());

    await expect(run).rejects.toBe(controller.signal.reason);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://graph.microsoft.com/v1.0/me");
  });

  it("lets an in-flight POST finish so the caller can count the saved draft", async () => {
    const controller = new AbortController();
    const saving = Promise.withResolvers();
    const fetchMock = vi.fn().mockResolvedValueOnce(ok()).mockReturnValueOnce(saving.promise);
    vi.stubGlobal("fetch", fetchMock);
    const run = createOutlookDraftWithRefresh("token", message, {
      signal: controller.signal, getAccessToken: vi.fn(),
    });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    controller.abort();
    saving.resolve(ok());

    await expect(run).resolves.toBe("token");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(fetchMock.mock.calls[1][1].signal).toBeUndefined();
  });

  it("does not refresh or retry a rejected POST after interruption", async () => {
    const controller = new AbortController();
    const saving = Promise.withResolvers();
    const getAccessToken = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce(ok()).mockReturnValueOnce(saving.promise);
    vi.stubGlobal("fetch", fetchMock);
    const run = createOutlookDraftWithRefresh("token", message, { signal: controller.signal, getAccessToken });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    controller.abort();
    saving.resolve(unauthorized());

    await expect(run).rejects.toBe(controller.signal.reason);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry if interrupted while refreshing the token", async () => {
    const controller = new AbortController();
    const refreshing = Promise.withResolvers();
    const getAccessToken = vi.fn().mockReturnValueOnce(refreshing.promise);
    const fetchMock = vi.fn().mockResolvedValueOnce(unauthorized());
    vi.stubGlobal("fetch", fetchMock);
    const run = createOutlookDraftWithRefresh("token", message, { signal: controller.signal, getAccessToken });
    await vi.waitFor(() => expect(getAccessToken).toHaveBeenCalledOnce());

    controller.abort();
    refreshing.resolve("refreshed-token");

    await expect(run).rejects.toBe(controller.signal.reason);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes once on a 401 and returns the token for subsequent drafts", async () => {
    const getAccessToken = vi.fn().mockResolvedValue("refreshed-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok());
    vi.stubGlobal("fetch", fetchMock);

    await expect(createOutlookDraftWithRefresh("old-token", message, { getAccessToken }))
      .resolves.toBe("refreshed-token");

    expect(getAccessToken).toHaveBeenCalledExactlyOnceWith({ forceRefresh: true, allowInteractive: false });
    const posts = fetchMock.mock.calls.filter(([, options]) => options.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts[1][1].headers.Authorization).toBe("Bearer refreshed-token");
    expect(JSON.parse(posts[1][1].body)).toEqual(JSON.parse(posts[0][1].body));
  });

  it("preserves a failed in-flight request instead of reporting successful interruption", async () => {
    const controller = new AbortController();
    const saving = Promise.withResolvers();
    const getAccessToken = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok()).mockReturnValueOnce(saving.promise));
    const run = createOutlookDraftWithRefresh("token", message, { signal: controller.signal, getAccessToken });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    controller.abort();
    saving.reject(new Error("Connection lost"));

    await expect(run).rejects.toThrow("Connection lost");
    expect(getAccessToken).not.toHaveBeenCalled();
  });
});

describe("createOutlookDraft", () => {
  it("includes selected attachments in the Microsoft Graph message", async () => {
    const graphAttachment = {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: "notes.txt",
      contentType: "text/plain",
      contentBytes: "aGVsbG8=",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "draft-id" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createOutlookDraft("access-token", {
      to: "recipient@example.com",
      subject: "Subject",
      htmlBody: "<p>Hello</p>",
      attachments: [graphAttachment],
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body).attachments).toEqual([graphAttachment]);
  });

  it("omits the attachments property when no files are selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "draft-id" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createOutlookDraft("access-token", {
      to: "recipient@example.com",
      subject: "Subject",
      htmlBody: "<p>Hello</p>",
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).not.toHaveProperty("attachments");
  });
});
