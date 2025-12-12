import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUsersDto } from './dto/get-users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      password: hashedPassword,
    });

    return await this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async findByUuid(uuid: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { uuid } });
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async createByAdmin(createUserAdminDto: CreateUserAdminDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserAdminDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserAdminDto.password, 10);

    const user = this.usersRepository.create({
      firstName: createUserAdminDto.firstName,
      lastName: createUserAdminDto.lastName,
      email: createUserAdminDto.email,
      password: hashedPassword,
      role: createUserAdminDto.role,
      isActive: createUserAdminDto.isActive ?? true,
    });

    return await this.usersRepository.save(user);
  }

  async update(uuid: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.uuid !== uuid) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async updateByAdmin(
    uuid: string,
    updateUserAdminDto: UpdateUserAdminDto,
  ): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    if (updateUserAdminDto.email && updateUserAdminDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserAdminDto.email },
      });

      if (existingUser && existingUser.uuid !== uuid) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserAdminDto);
    return await this.usersRepository.save(user);
  }

  async updateRole(uuid: string, updateRoleDto: UpdateRoleDto): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    user.role = updateRoleDto.role;
    return await this.usersRepository.save(user);
  }

  async changePassword(
    uuid: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  async resetPassword(
    uuid: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    user.password = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  async softDelete(uuid: string): Promise<User> {
    const user = await this.findByUuid(uuid);

    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }

    await this.usersRepository.softRemove(user);
    return user;
  }

  async findAllPaginated(getUsersDto: GetUsersDto): Promise<{
    data: User[];
    total: number;
    page: number;
    lastPage: number;
  }> {
    const { search, role, isActive, sortBy, sortOrder } = getUsersDto;
    let { page, limit } = getUsersDto;

    page = page ?? 1;
    limit = limit ?? 20;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    deleted: number;
    byRole: Record<string, number>;
  }> {
    // Contar total (incluyendo soft deleted)
    const total = await this.usersRepository
      .createQueryBuilder('user')
      .withDeleted()
      .getCount();

    // Contar activos (isActive = true, no eliminados)
    const active = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .getCount();

    // Contar inactivos (isActive = false, no eliminados)
    const inactive = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: false })
      .getCount();

    // Contar eliminados (deletedAt no es null)
    const deleted = await this.usersRepository
      .createQueryBuilder('user')
      .withDeleted()
      .where('user.deletedAt IS NOT NULL')
      .getCount();

    // Contar por rol (solo usuarios no eliminados)
    const roleStats = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const byRole: Record<string, number> = {};
    roleStats.forEach((stat) => {
      byRole[stat.role] = parseInt(stat.count, 10);
    });

    return {
      total,
      active,
      inactive,
      deleted,
      byRole,
    };
  }
}
