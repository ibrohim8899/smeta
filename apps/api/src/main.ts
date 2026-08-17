import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import "reflect-metadata";
import { AppModule } from "./app.module";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const webAppUrl = config.get<string>("WEB_APP_URL", "http://localhost:5173");
  const telegramWebAppUrl = config.get<string>("TELEGRAM_WEB_APP_URL");
  const corsOrigins = [webAppUrl, telegramWebAppUrl].filter((origin): origin is string => Boolean(origin));
  const port = Number(config.get<string>("API_PORT", "4000"));
  const rateLimitWindowMs = Number(config.get<string>("RATE_LIMIT_WINDOW_SECONDS", "60")) * 1000;
  const rateLimitMax = Number(config.get<string>("RATE_LIMIT_MAX_REQUESTS", "180"));

  assertProductionSecrets(config);

  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = request.header("x-request-id") || randomUUID();
    response.setHeader("x-request-id", requestId);
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("x-frame-options", "DENY");
    response.setHeader("referrer-policy", "same-origin");
    response.setHeader("permissions-policy", "camera=(self), microphone=(), geolocation=()");
    next();
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.path === "/health") {
      next();
      return;
    }

    const now = Date.now();
    const ip = request.ip || request.socket.remoteAddress || "unknown";
    const key = `${ip}:${request.path}`;
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, {
        count: 1,
        resetAt: now + rateLimitWindowMs
      });
      next();
      return;
    }

    bucket.count += 1;
    response.setHeader("x-ratelimit-limit", String(rateLimitMax));
    response.setHeader("x-ratelimit-remaining", String(Math.max(rateLimitMax - bucket.count, 0)));
    response.setHeader("x-ratelimit-reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > rateLimitMax) {
      response.status(429).json({
        message: "Juda ko'p so'rov yuborildi. Birozdan keyin qayta urinib ko'ring.",
        statusCode: 429
      });
      return;
    }

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.listen(port);
}

void bootstrap();

function assertProductionSecrets(config: ConfigService) {
  if (config.get<string>("NODE_ENV") !== "production") {
    return;
  }

  const requiredSecrets = ["DATABASE_URL", "JWT_ACCESS_SECRET", "TELEGRAM_BOT_TOKEN"];
  const missing = requiredSecrets.filter((key) => {
    const value = config.get<string>(key);
    return !value || value === "change-me-in-production";
  });

  if (missing.length > 0) {
    throw new Error(`Production secrets sozlanmagan: ${missing.join(", ")}`);
  }
}
