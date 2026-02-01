import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../config/index.js";

vi.mock("../../config/db.js", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

interface ApiResponse {
  status: string;
  data?: unknown;
  message?: string;
}

describe("User API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/users", () => {
    it("should return all users", async () => {
      const mockUsers = [
        {
          id: "1",
          email: "test@example.com",
          name: "Test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

      const response = await request(app).get("/api/v1/users");
      const body = response.body as ApiResponse;

      expect(response.status).toBe(200);
      expect(body.status).toBe("success");
      expect(body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/users/:id", () => {
    it("should return a user by id", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const response = await request(app).get("/api/v1/users/1");
      const body = response.body as ApiResponse & { data: typeof mockUser };

      expect(response.status).toBe(200);
      expect(body.status).toBe("success");
      expect(body.data.email).toBe("test@example.com");
    });

    it("should return 404 for non-existent user", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await request(app).get("/api/v1/users/999");
      const body = response.body as ApiResponse;

      expect(response.status).toBe(404);
      expect(body.status).toBe("error");
    });
  });

  describe("POST /api/v1/users", () => {
    it("should create a new user", async () => {
      const mockUser = {
        id: "1",
        email: "new@example.com",
        name: "New User",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users")
        .send({ email: "new@example.com", name: "New User" });
      const body = response.body as ApiResponse & { data: typeof mockUser };

      expect(response.status).toBe(201);
      expect(body.status).toBe("success");
      expect(body.data.email).toBe("new@example.com");
    });

    it("should return 400 for invalid email", async () => {
      const response = await request(app)
        .post("/api/v1/users")
        .send({ email: "invalid-email" });
      const body = response.body as ApiResponse;

      expect(response.status).toBe(400);
      expect(body.status).toBe("error");
    });

    it("should return 409 for duplicate email", async () => {
      const existingUser = {
        id: "1",
        email: "existing@example.com",
        name: "Existing",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser);

      const response = await request(app)
        .post("/api/v1/users")
        .send({ email: "existing@example.com" });
      const body = response.body as ApiResponse;

      expect(response.status).toBe(409);
      expect(body.status).toBe("error");
    });
  });

  describe("PATCH /api/v1/users/:id", () => {
    it("should update a user", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Original",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = { ...mockUser, name: "Updated" };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch("/api/v1/users/1")
        .send({ name: "Updated" });
      const body = response.body as ApiResponse & { data: typeof updatedUser };

      expect(response.status).toBe(200);
      expect(body.data.name).toBe("Updated");
    });
  });

  describe("DELETE /api/v1/users/:id", () => {
    it("should delete a user", async () => {
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.delete).mockResolvedValue(mockUser);

      const response = await request(app).delete("/api/v1/users/1");

      expect(response.status).toBe(204);
    });
  });
});
