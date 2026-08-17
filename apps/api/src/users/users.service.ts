import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    const telegramUserId = process.env.SUPERADMIN_TELEGRAM_USER_ID?.trim() || null;

    if (!telegramUserId) {
      return;
    }

    const existingUser = await this.usersRepository.findOne({
      where: {
        telegramUserId
      }
    });

    if (existingUser) {
      existingUser.active = true;
      existingUser.role = "superadmin";
      existingUser.roles = Array.from(new Set([...(existingUser.roles?.length ? existingUser.roles : [existingUser.role]), "superadmin"]));
      existingUser.status = "active";
      await this.usersRepository.save(existingUser);
      return;
    }

    const user = this.usersRepository.create({
      active: true,
      displayName: "Smeta superadmin",
      email: null,
      passwordHash: null,
      role: "superadmin",
      roles: ["superadmin"],
      status: "active",
      telegramUserId
    });

    await this.usersRepository.save(user);
  }

  findByTelegramUserId(telegramUserId: string) {
    return this.usersRepository.findOne({
      where: {
        telegramUserId
      }
    });
  }

  findById(id: string) {
    return this.usersRepository.findOne({
      where: {
        id
      }
    });
  }

  async upsertTelegramUser(input: {
    displayName: string;
    role?: string;
    status?: string;
    telegramUserId: string;
    telegramUsername?: string | null;
  }) {
    const existingUser = await this.findByTelegramUserId(input.telegramUserId);

    if (existingUser) {
      if (!existingUser.displayName || shouldReplaceDisplayName(existingUser.displayName, input.displayName)) {
        existingUser.displayName = input.displayName;
      }

      existingUser.telegramUsername = input.telegramUsername ?? existingUser.telegramUsername;
      existingUser.lastLoginAt = new Date();

      if (!existingUser.roles?.length) {
        existingUser.roles = [existingUser.role || input.role || "customer"];
      }

      return this.usersRepository.save(existingUser);
    }

    const role = input.role ?? "customer";
    const user = this.usersRepository.create({
      active: true,
      displayName: input.displayName,
      email: null,
      lastLoginAt: new Date(),
      passwordHash: null,
      role,
      roles: [role],
      status: input.status ?? (role === "customer" ? "active" : "pending"),
      telegramUserId: input.telegramUserId,
      telegramUsername: input.telegramUsername ?? null
    });

    return this.usersRepository.save(user);
  }
}

function shouldReplaceDisplayName(currentName: string, nextName: string) {
  const current = currentName.trim();
  const next = nextName.trim();

  if (!next) {
    return false;
  }

  if (!current) {
    return true;
  }

  const currentLooksCorrupt = current.includes("?") || current.includes("\uFFFD");
  const nextLooksCorrupt = next.includes("?") || next.includes("\uFFFD");

  return currentLooksCorrupt && !nextLooksCorrupt;
}
