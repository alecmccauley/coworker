import type { RequestHandler } from "express";
import type { z } from "zod";

interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

export const validateRequest = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      const parsedQuery = schemas.query.parse(req.query) as Record<string, string>;
      Object.assign(req.query, parsedQuery);
    }
    if (schemas.params) {
      const parsedParams = schemas.params.parse(req.params) as Record<string, string>;
      Object.assign(req.params, parsedParams);
    }
    next();
  };
};
