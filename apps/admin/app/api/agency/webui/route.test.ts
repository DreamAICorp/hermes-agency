import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identity: vi.fn() }));
vi.mock("@/lib/agency-tenant-runtime", () => ({ agencyTenantIdentity: mocks.identity }));
vi.mock("@/lib/api-helpers", () => ({ asApiResponse: (error: unknown) => error instanceof Response ? error : Response.json({ error: "Unavailable" }, { status: 503 }) }));
import { GET } from "./route";
const businessId = "c74d55ee-a0a1-4e6b-91ea-3451a0abcdde";
const state = "a".repeat(43);
const request = () => new Request("https://agency.dev.4u-corp.com/api/agency/webui?businessId=" + businessId + "&state=" + state);
describe("standalone tenant WebUI login", () => {
  beforeEach(() => {
    vi.stubEnv("APP_BASE_URL", "https://agency.dev.4u-corp.com");
    vi.stubEnv("AGENCY_TENANT_COORDINATOR_URL", "http://127.0.0.1:18820");
    vi.stubEnv("AGENCY_TENANT_COORDINATOR_KEY", "own-control-fixture");
    mocks.identity.mockReset();
    mocks.identity.mockResolvedValue({ businessId, email: "own@example.invalid" });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("uses the shared broker and preserves the company return URL when anonymous", async () => {
    mocks.identity.mockRejectedValue(new Response("", { status: 401 }));
    const response = await GET(request());
    const target = new URL(response.headers.get("location")!);
    expect(target.origin).toBe("https://agency.dev.4u-corp.com");
    expect(target.pathname).toBe("/api/auth/google/start");
    expect(target.searchParams.get("returnTo")).toBe(new URL(request().url).pathname + new URL(request().url).search);
  });
  it("refuses non-members without asking the coordinator for a ticket", async () => {
    mocks.identity.mockRejectedValue(new Response("", { status: 403 }));
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await GET(request())).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("only redirects to the exact authorized tenant and exposes no native session token", async () => {
    const origin = "https://owv-" + businessId.replaceAll("-", "") + ".dev.4u-corp.com";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ origin, businessId, ticket: "b".repeat(43) })));
    const response = await GET(request());
    const target = new URL(response.headers.get("location")!);
    expect(target.origin).toBe(origin);
    expect(target.pathname).toBe("/sso/callback");
    expect(target.searchParams.has("token")).toBe(false);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("rejects a substituted company origin", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ origin: "https://foreign.example.invalid", businessId, ticket: "b".repeat(43) })));
    expect((await GET(request())).status).toBe(502);
  });
});
