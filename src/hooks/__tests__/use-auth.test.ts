import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/hooks/use-auth";

// --- Module mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

// --- Helpers ---

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

// --- Tests ---

describe("useAuth — initial state", () => {
  it("starts with isLoading = false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes signIn and signUp functions", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("signIn", () => {
  it("calls the signIn action with email and password", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(mockSignInAction).toHaveBeenCalledWith(
      "user@example.com",
      "password123"
    );
  });

  it("sets isLoading to true while signing in and false after", async () => {
    let resolveSignIn!: (v: unknown) => void;
    mockSignInAction.mockReturnValue(
      new Promise((res) => (resolveSignIn = res))
    );

    const { result } = renderHook(() => useAuth());

    let signInPromise: Promise<unknown>;
    act(() => {
      signInPromise = result.current.signIn("user@example.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: false, error: "Invalid credentials" });
      await signInPromise!;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("returns the result from signIn action on failure", async () => {
    const failResult = { success: false, error: "Invalid credentials" };
    mockSignInAction.mockResolvedValue(failResult);

    const { result } = renderHook(() => useAuth());

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrong");
    });

    expect(returnValue).toEqual(failResult);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("resets isLoading even when signIn action throws", async () => {
    mockSignInAction.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("signUp", () => {
  it("calls the signUp action with email and password", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-1" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "securepass");
    });

    expect(mockSignUpAction).toHaveBeenCalledWith("new@example.com", "securepass");
  });

  it("sets isLoading during sign up and resets it after", async () => {
    let resolveSignUp!: (v: unknown) => void;
    mockSignUpAction.mockReturnValue(
      new Promise((res) => (resolveSignUp = res))
    );

    const { result } = renderHook(() => useAuth());

    let signUpPromise: Promise<unknown>;
    act(() => {
      signUpPromise = result.current.signUp("new@example.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: false, error: "Email already registered" });
      await signUpPromise!;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("returns the result from signUp action on failure", async () => {
    const failResult = { success: false, error: "Email already registered" };
    mockSignUpAction.mockResolvedValue(failResult);

    const { result } = renderHook(() => useAuth());

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "pass");
    });

    expect(returnValue).toEqual(failResult);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("resets isLoading even when signUp action throws", async () => {
    mockSignUpAction.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("user@example.com", "pass").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("post-sign-in routing — anonymous work exists", () => {
  it("creates a project with anon work and redirects to it", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/": {} },
    });
    mockCreateProject.mockResolvedValue({ id: "anon-project-id" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "hello" }],
        data: { "/": {} },
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  it("does NOT migrate anon work when messages array is empty", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [],
      fileSystemData: { "/": {} },
    });
    mockGetProjects.mockResolvedValue([{ id: "existing-proj" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });
});

describe("post-sign-in routing — no anonymous work", () => {
  it("redirects to the most recent existing project", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([
      { id: "recent-proj" },
      { id: "older-proj" },
    ]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockGetProjects).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("creates a new project and redirects when user has no projects", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new-proj");
  });
});

describe("post-sign-up routing", () => {
  it("runs the same post-auth flow after successful sign up", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-after-signup" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-after-signup");
  });

  it("migrates anon work after successful sign up", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "build me a button" }],
      fileSystemData: { "/": {}, "/Button.tsx": "export default () => <button/>" },
    });
    mockCreateProject.mockResolvedValue({ id: "signup-anon-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "pass");
    });

    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/signup-anon-proj");
  });
});
