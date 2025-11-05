import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedAdminUser();
  }

  private async seedAdminUser() {
    // Validate required environment variables
    const requiredEnvVars = [
      'ADMIN_EMAIL',
      'ADMIN_PASSWORD',
      'ADMIN_FIRST_NAME',
      'ADMIN_LAST_NAME',
    ];

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    );

    if (missingVars.length > 0) {
      this.logger.error(
        `Missing required environment variables for admin user: ${missingVars.join(', ')}. ` +
          `Admin user will not be created. Please set these variables in your .env file.`,
      );
      return;
    }

    const adminEmail = process.env.ADMIN_EMAIL!;
    const adminPassword = process.env.ADMIN_PASSWORD!;
    const adminFirstName = process.env.ADMIN_FIRST_NAME!;
    const adminLastName = process.env.ADMIN_LAST_NAME!;

    // Check if admin user already exists
    const existingAdmin = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      this.logger.log(
        `Admin user with email ${adminEmail} already exists. Skipping seed.`,
      );
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminUser = this.userRepository.create({
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });

    await this.userRepository.save(adminUser);

    this.logger.log(`Admin user created successfully with email: ${adminEmail}`);
  }
}
