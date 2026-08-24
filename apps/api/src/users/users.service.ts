import { BadRequestException, Injectable, NotFoundException, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { USER_ROLES, type UserRole } from "@smeta/shared";
import { Repository } from "typeorm";
import type { UpdateUserAccessDto } from "./dto/update-user-access.dto";
import { UserEntity } from "./entities/user.entity";

const DEFAULT_SUPERADMIN_ROLES: UserRole[] = ["superadmin", "admin", "finance"];

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
      existingUser.roles = Array.from(new Set([...DEFAULT_SUPERADMIN_ROLES, ...(existingUser.roles?.length ? existingUser.roles : [])]));
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
      roles: DEFAULT_SUPERADMIN_ROLES,
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

  async findAll() {
    const users = await this.usersRepository.find({
      order: {
        lastLoginAt: "DESC",
        displayName: "ASC"
      },
      take: 200
    });

    return users.map((user) => this.toResponse(user));
  }

  async updateAccess(id: string, dto: UpdateUserAccessDto) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException("Foydalanuvchi topilmadi");
    }

    if (dto.roles) {
      const roles = Array.from(new Set(dto.roles));

      if (roles.length === 0) {
        throw new BadRequestException("Kamida bitta rol tanlanishi kerak");
      }

      user.roles = roles;
      user.role = roles.includes(user.role as UserRole) ? user.role : roles[0];
    }

    if (dto.status) {
      user.status = dto.status;
    }

    if (dto.active !== undefined) {
      user.active = dto.active;
    } else if (dto.status) {
      user.active = dto.status === "active";
    }

    const saved = await this.usersRepository.save(user);
    return this.toResponse(saved);
  }

  async addRoleByTelegramUserId(telegramUserId: string | null | undefined, role: UserRole) {
    if (!telegramUserId) {
      return null;
    }

    const user = await this.findByTelegramUserId(telegramUserId);

    if (!user) {
      return null;
    }

    const roles = normalizeUserRoles(user);
    user.active = true;
    user.status = "active";
    user.roles = Array.from(new Set([...roles, role]));
    user.role = user.roles.includes(user.role) ? user.role : user.roles[0];

    return this.usersRepository.save(user);
  }

  async removeRoleByTelegramUserId(telegramUserId: string | null | undefined, role: UserRole) {
    if (!telegramUserId) {
      return null;
    }

    const user = await this.findByTelegramUserId(telegramUserId);

    if (!user) {
      return null;
    }

    const nextRoles = normalizeUserRoles(user).filter((item) => item !== role);
    user.roles = nextRoles.length ? nextRoles : ["customer"];
    user.role = user.roles.includes(user.role) ? user.role : user.roles[0];

    return this.usersRepository.save(user);
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

  private toResponse(user: UserEntity) {
    return {
      active: user.active,
      createdAt: user.createdAt,
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      lastLoginAt: user.lastLoginAt,
      role: user.role,
      roles: normalizeUserRoles(user),
      status: user.status,
      telegramLinked: Boolean(user.telegramUserId),
      telegramUserId: user.telegramUserId,
      telegramUsername: user.telegramUsername,
      updatedAt: user.updatedAt
    };
  }
}

function normalizeUserRoles(user: UserEntity): UserRole[] {
  const roles = [user.role, ...(user.roles?.length ? user.roles : [])].filter(Boolean);
  const normalized = roles.filter((role): role is UserRole => USER_ROLES.includes(role as UserRole));
  return normalized.length ? Array.from(new Set(normalized)) : ["customer"];
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
