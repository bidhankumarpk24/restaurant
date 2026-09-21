import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const user: AuthenticatedUser = {
  id: 7,
  openId: "demo-open-id",
  email: "demo@plated.local",
  name: "Demo Manager",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("auth.me", () => {
  it("returns the current signed-in user", async () => {
    const ctx: TrpcContext = {
      user,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.me()).resolves.toEqual(user);
  });

  it("returns null when there is no active session", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.me()).resolves.toBeNull();
  });
});
