import { StatusCodes } from "http-status-codes";
import { prisma } from "../../config/index.js";
import { AppError } from "../../shared/index.js";
import type { CreateUserInput, UpdateUserInput } from "./user.schema.js";

export const userService = {
  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError("User not found", StatusCodes.NOT_FOUND);
    }

    return user;
  },

  async create(data: CreateUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Email already exists", StatusCodes.CONFLICT);
    }

    return prisma.user.create({
      data,
    });
  },

  async update(id: string, data: UpdateUserInput) {
    await this.findById(id);

    if (data.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new AppError("Email already exists", StatusCodes.CONFLICT);
      }
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    await this.findById(id);

    return prisma.user.delete({
      where: { id },
    });
  },
};
