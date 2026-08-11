import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { hashPassword } from "./password-hasher";
import { UserEntity } from "./entities/user.entity";

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>
  ) {}

  async onApplicationBootstrap() {
    await this.ensureDefaultSuperAdmin();
  }

  private async ensureDefaultSuperAdmin() {
    const email = process.env.ADMIN_EMAIL ?? "admin@smeta.uz";
    const password = process.env.ADMIN_PASSWORD ?? "smeta123";
    const existingUser = await this.usersRepository.findOne({
      where: {
        email
      }
    });

    if (existingUser) {
      return;
    }

    const user = this.usersRepository.create({
      active: true,
      displayName: "Smeta superadmin",
      email,
      passwordHash: await hashPassword(password),
      role: "superadmin",
      status: "active"
    });

    await this.usersRepository.save(user);
  }
}
