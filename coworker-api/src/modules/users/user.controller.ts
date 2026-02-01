import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { userService } from "./user.service.js";
import type { CreateUserInput, UpdateUserInput } from "./user.schema.js";

export const userController = {
  getAll: (async (_req, res) => {
    const users = await userService.findAll();
    res.json({ status: "success", data: users });
  }) as RequestHandler,

  getById: (async (req, res) => {
    const id = String(req.params.id ?? "");
    const user = await userService.findById(id);
    res.json({ status: "success", data: user });
  }) as RequestHandler,

  create: (async (req, res) => {
    const user = await userService.create(req.body as CreateUserInput);
    res.status(StatusCodes.CREATED).json({ status: "success", data: user });
  }) as RequestHandler,

  update: (async (req, res) => {
    const id = String(req.params.id ?? "");
    const user = await userService.update(id, req.body as UpdateUserInput);
    res.json({ status: "success", data: user });
  }) as RequestHandler,

  delete: (async (req, res) => {
    const id = String(req.params.id ?? "");
    await userService.delete(id);
    res.status(StatusCodes.NO_CONTENT).send();
  }) as RequestHandler,
};
