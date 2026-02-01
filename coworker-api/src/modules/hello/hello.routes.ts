import { Router, type IRouter } from "express";
import { helloController } from "./hello.controller.js";
import { validateRequest } from "../../shared/index.js";
import { helloQuerySchema } from "@coworker/shared-services";

export const helloRouter: IRouter = Router();

helloRouter.get(
  "/",
  validateRequest({ query: helloQuerySchema }),
  helloController.sayHello
);
