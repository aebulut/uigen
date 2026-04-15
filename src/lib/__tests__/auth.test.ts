// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

// Mock server-only so it doesn't throw in the test environment
vi.mock("server-only", () => ({}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

// Helper to create a valid signed token
async function makeToken(
  payload: object,
  expirationTime: string = "7d"
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expirationTime)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

// We control what the cookies() mock returns via this variable
let mockCookieValue: string | undefined;

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: (name: string) =>
        name === COOKIE_NAME && mockCookieValue
          ? { value: mockCookieValue }
          : undefined,
      set: vi.fn(),
      delete: vi.fn(),
    })
  ),
}));

// Import after mocks are set up
const { getSession } = await import("../auth");

beforeEach(() => {
  mockCookieValue = undefined;
});

test("returns null when no auth cookie is present", async () => {
  const session = await getSession();
  expect(session).toBeNull();
});

test("returns session payload for a valid token", async () => {
  const payload = {
    userId: "user_123",
    email: "test@example.com",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  mockCookieValue = await makeToken(payload);

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user_123");
  expect(session?.email).toBe("test@example.com");
});

test("returns null for a malformed token", async () => {
  mockCookieValue = "not.a.valid.jwt";

  const session = await getSession();
  expect(session).toBeNull();
});

test("returns null for an expired token", async () => {
  const payload = {
    userId: "user_123",
    email: "test@example.com",
    expiresAt: new Date(Date.now() - 1000),
  };

  // Create token that expired 1 second ago
  mockCookieValue = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
    .setIssuedAt()
    .sign(JWT_SECRET);

  const session = await getSession();
  expect(session).toBeNull();
});

test("returns null for a token signed with a different secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const payload = { userId: "user_123", email: "test@example.com" };

  mockCookieValue = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);

  const session = await getSession();
  expect(session).toBeNull();
});
