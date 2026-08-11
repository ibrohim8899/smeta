import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DEFAULT_STORE_COMMISSION_RATE } from "@smeta/shared";
import { Repository } from "typeorm";
import { CreateStoreDto } from "./dto/create-store.dto";
import { StoreEntity } from "./entities/store.entity";

@Injectable()
export class StoresService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly storesRepository: Repository<StoreEntity>
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultStores();
  }

  async create(dto: CreateStoreDto) {
    const store = this.storesRepository.create({
      active: dto.active ?? true,
      categories: dto.categories,
      commissionRate: dto.commissionRate ?? DEFAULT_STORE_COMMISSION_RATE,
      name: dto.name,
      phone: dto.phone || null,
      serviceRegions: dto.serviceRegions
    });

    return this.toResponse(await this.storesRepository.save(store));
  }

  async findAll() {
    const stores = await this.storesRepository.find({
      order: {
        name: "ASC"
      }
    });

    return stores.map((store) => this.toResponse(store));
  }

  async findActiveMatching(region: string, category: string) {
    const stores = await this.storesRepository.find({
      where: {
        active: true
      }
    });

    return stores.filter(
      (store) =>
        store.serviceRegions.includes(region) &&
        store.categories.some((storeCategory) => storeCategory.toLowerCase() === category.toLowerCase())
    );
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const stores = await this.storesRepository.find();
    return stores.filter((store) => ids.includes(store.id));
  }

  private async seedDefaultStores() {
    const count = await this.storesRepository.count();

    if (count > 0) {
      return;
    }

    const stores: CreateStoreDto[] = [
      {
        categories: ["Qurilish materiallari", "Bo'yoq", "Tom yopish materiallari"],
        name: "Namangan Qurilish",
        phone: "+998 90 111 22 33",
        serviceRegions: ["Namangan sh.", "Pop", "Chortoq"]
      },
      {
        categories: ["Elektrika", "Santexnika"],
        name: "Mega Stroy",
        phone: "+998 93 222 33 44",
        serviceRegions: ["Namangan sh.", "Chust", "Uychi"]
      },
      {
        categories: ["Qurilish materiallari", "Yog'och"],
        name: "Chust Market",
        phone: "+998 91 333 44 55",
        serviceRegions: ["Chust", "Kosonsoy"]
      }
    ];

    for (const store of stores) {
      await this.create(store);
    }
  }

  private toResponse(store: StoreEntity) {
    return {
      active: store.active,
      categories: store.categories,
      commissionRate: store.commissionRate,
      createdAt: store.createdAt,
      id: store.id,
      name: store.name,
      phone: store.phone,
      serviceRegions: store.serviceRegions
    };
  }
}
