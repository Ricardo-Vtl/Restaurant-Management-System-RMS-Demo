import { describe, it, expect } from "vitest";
import { canRoleTransition } from "@/lib/status-transitions";

describe("canRoleTransition", () => {
  describe("pending → confirmed", () => {
    it("allowed for admin and cashier", () => {
      expect(canRoleTransition("admin", "pending", "confirmed")).toBe(true);
      expect(canRoleTransition("cashier", "pending", "confirmed")).toBe(true);
    });

    it("denied for waiter and kitchen", () => {
      expect(canRoleTransition("waiter", "pending", "confirmed")).toBe(false);
      expect(canRoleTransition("kitchen", "pending", "confirmed")).toBe(false);
    });
  });

  describe("confirmed → preparing", () => {
    it("allowed for admin and kitchen", () => {
      expect(canRoleTransition("admin", "confirmed", "preparing")).toBe(true);
      expect(canRoleTransition("kitchen", "confirmed", "preparing")).toBe(true);
    });

    it("denied for waiter and cashier", () => {
      expect(canRoleTransition("waiter", "confirmed", "preparing")).toBe(false);
      expect(canRoleTransition("cashier", "confirmed", "preparing")).toBe(false);
    });
  });

  describe("preparing → ready", () => {
    it("allowed for admin and kitchen", () => {
      expect(canRoleTransition("admin", "preparing", "ready")).toBe(true);
      expect(canRoleTransition("kitchen", "preparing", "ready")).toBe(true);
    });

    it("denied for waiter and cashier", () => {
      expect(canRoleTransition("waiter", "preparing", "ready")).toBe(false);
      expect(canRoleTransition("cashier", "preparing", "ready")).toBe(false);
    });
  });

  describe("ready → delivered", () => {
    it("allowed for admin, cashier, and waiter", () => {
      expect(canRoleTransition("admin", "ready", "delivered")).toBe(true);
      expect(canRoleTransition("cashier", "ready", "delivered")).toBe(true);
      expect(canRoleTransition("waiter", "ready", "delivered")).toBe(true);
    });

    it("denied for kitchen", () => {
      expect(canRoleTransition("kitchen", "ready", "delivered")).toBe(false);
    });
  });

  describe("ready → on-the-way", () => {
    it("allowed for admin and cashier", () => {
      expect(canRoleTransition("admin", "ready", "on-the-way")).toBe(true);
      expect(canRoleTransition("cashier", "ready", "on-the-way")).toBe(true);
    });

    it("denied for waiter and kitchen", () => {
      expect(canRoleTransition("waiter", "ready", "on-the-way")).toBe(false);
      expect(canRoleTransition("kitchen", "ready", "on-the-way")).toBe(false);
    });
  });

  describe("on-the-way → delivered", () => {
    it("allowed for admin and cashier", () => {
      expect(canRoleTransition("admin", "on-the-way", "delivered")).toBe(true);
      expect(canRoleTransition("cashier", "on-the-way", "delivered")).toBe(true);
    });

    it("denied for waiter and kitchen", () => {
      expect(canRoleTransition("waiter", "on-the-way", "delivered")).toBe(false);
      expect(canRoleTransition("kitchen", "on-the-way", "delivered")).toBe(false);
    });
  });

  describe("delivered → completed", () => {
    it("allowed for admin and cashier", () => {
      expect(canRoleTransition("admin", "delivered", "completed")).toBe(true);
      expect(canRoleTransition("cashier", "delivered", "completed")).toBe(true);
    });

    it("denied for waiter and kitchen", () => {
      expect(canRoleTransition("waiter", "delivered", "completed")).toBe(false);
      expect(canRoleTransition("kitchen", "delivered", "completed")).toBe(false);
    });
  });

  describe("any → cancelled", () => {
    it("allowed for admin and cashier from any active state", () => {
      expect(canRoleTransition("admin", "pending", "cancelled")).toBe(true);
      expect(canRoleTransition("cashier", "confirmed", "cancelled")).toBe(true);
      expect(canRoleTransition("admin", "preparing", "cancelled")).toBe(true);
      expect(canRoleTransition("cashier", "ready", "cancelled")).toBe(true);
    });

    it("denied for waiter and kitchen", () => {
      expect(canRoleTransition("waiter", "pending", "cancelled")).toBe(false);
      expect(canRoleTransition("kitchen", "confirmed", "cancelled")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("denied for invalid transition even with valid role", () => {
      expect(canRoleTransition("admin", "pending", "ready")).toBe(false);
      expect(canRoleTransition("admin", "completed", "pending")).toBe(false);
    });
  });
});
