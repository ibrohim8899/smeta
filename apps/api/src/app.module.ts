import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { databaseConfig } from "./config/database.config";
import { DealersModule } from "./dealers/dealers.module";
import { FinanceModule } from "./finance/finance.module";
import { HealthModule } from "./health/health.module";
import { MaterialRequestsModule } from "./material-requests/material-requests.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OffersModule } from "./offers/offers.module";
import { OrdersModule } from "./orders/orders.module";
import { SettingsModule } from "./settings/settings.module";
import { StoresModule } from "./stores/stores.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"]
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig
    }),
    AuditModule,
    AuthModule,
    DealersModule,
    FinanceModule,
    HealthModule,
    MaterialRequestsModule,
    NotificationsModule,
    OffersModule,
    OrdersModule,
    SettingsModule,
    StoresModule,
    UsersModule
  ]
})
export class AppModule {}
