import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export function databaseConfig(): TypeOrmModuleOptions {
  return {
    type: "postgres",
    url: process.env.DATABASE_URL,
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV === "development" && process.env.TYPEORM_SYNCHRONIZE === "true",
    migrationsRun: false,
    logging: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  };
}
