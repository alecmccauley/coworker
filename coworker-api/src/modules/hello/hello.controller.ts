import type { RequestHandler } from "express";
import type { HelloData, HelloQuery } from "@coworker/shared-services";

export const helloController = {
  sayHello: ((req, res) => {
    const query = req.query as HelloQuery;
    const name = query.name ?? "World";

    const data: HelloData = {
      message: `Hello ${name}!`,
      timestamp: new Date().toISOString(),
    };

    res.json({ status: "success", data });
  }) as RequestHandler,
};
