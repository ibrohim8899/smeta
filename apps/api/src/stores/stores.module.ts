import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StoreEntity } from "./entities/store.entity";
import { StoresController } from "./stores.controller";
import { StoresService } from "./stores.service";

@Module({
  controllers: [StoresController],
  exports: [StoresService, TypeOrmModule],
  imports: [TypeOrmModule.forFeature([StoreEntity])],
  providers: [StoresService]
})
export class StoresModule {}
