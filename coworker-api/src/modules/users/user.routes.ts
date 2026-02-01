import { Router, type IRouter } from "express";
import { userController } from "./user.controller.js";
import { validateRequest } from "../../shared/index.js";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "./user.schema.js";

export const userRouter: IRouter = Router();

userRouter.get("/", userController.getAll);

userRouter.get(
  "/:id",
  validateRequest({ params: userIdParamSchema }),
  userController.getById
);

userRouter.post(
  "/",
  validateRequest({ body: createUserSchema }),
  userController.create
);

userRouter.patch(
  "/:id",
  validateRequest({ params: userIdParamSchema, body: updateUserSchema }),
  userController.update
);

userRouter.delete(
  "/:id",
  validateRequest({ params: userIdParamSchema }),
  userController.delete
);
