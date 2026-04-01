import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InvitationsService } from './invitations.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { SendInvitationDto } from './dto/send-invitation.dto';
import { CompleteInvitationDto } from './dto/complete-invitation.dto';
import { GetInvitationsDto } from './dto/get-invitations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PreventSelfRoleChangeGuard } from '../auth/guards/prevent-self-role-change.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitationsService: InvitationsService,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Public registration - creates CUSTOMER by default
   */
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password, ...result } = user;
    return result;
  }

  // ==================== USER PROFILE ENDPOINTS ====================

  /**
   * Get current user's profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.usersService.findByUuid(req.user.uuid);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...result } = user;
    return result;
  }

  /**
   * Update current user's profile
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(req.user.uuid, updateUserDto);
    const { password, ...result } = user;
    return result;
  }

  /**
   * Change current user's password
   */
  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(req.user.uuid, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get user statistics (ADMIN only)
   */
  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStats() {
    return await this.usersService.getUserStats();
  }

  /**
   * Get all users with filters (ADMIN only)
   */
  @Get('admin/users')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll(@Query() getUsersDto: GetUsersDto) {
    const result = await this.usersService.findAllPaginated(getUsersDto);

    // Remove passwords from all users
    result.data = result.data.map(({ password, ...user }) => user) as any;

    return result;
  }

  /**
   * Get single user by UUID (ADMIN only)
   */
  @Get('admin/users/:uuid')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOne(@Param('uuid') uuid: string) {
    const user = await this.usersService.findByUuid(uuid);
    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }
    const { password, ...result } = user;
    return result;
  }

  /**
   * Create user with role assignment (ADMIN only)
   */
  @Post('admin/users')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async createByAdmin(@Body() createUserAdminDto: CreateUserAdminDto) {
    const user = await this.usersService.createByAdmin(createUserAdminDto);
    const { password, ...result } = user;
    return result;
  }

  /**
   * Update user (ADMIN only)
   */
  @Patch('admin/users/:uuid')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async updateByAdmin(
    @Param('uuid') uuid: string,
    @Body() updateUserAdminDto: UpdateUserAdminDto,
  ) {
    const user = await this.usersService.updateByAdmin(
      uuid,
      updateUserAdminDto,
    );
    const { password, ...result } = user;
    return result;
  }

  /**
   * Update user role (ADMIN only)
   */
  @Patch('admin/users/:uuid/role')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, PreventSelfRoleChangeGuard)
  async updateRole(
    @Param('uuid') uuid: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const user = await this.usersService.updateRole(uuid, updateRoleDto);
    const { password, ...result } = user;
    return result;
  }

  /**
   * Reset user password (ADMIN only)
   */
  @Patch('admin/users/:uuid/password')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async resetPassword(
    @Param('uuid') uuid: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    await this.usersService.resetPassword(uuid, resetPasswordDto);
    return { message: 'Password reset successfully' };
  }

  /**
   * Soft delete user (ADMIN only)
   */
  @Delete('admin/users/:uuid')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, PreventSelfRoleChangeGuard)
  async delete(@Param('uuid') uuid: string) {
    const user = await this.usersService.softDelete(uuid);
    return {
      message: 'User deleted successfully',
      uuid: user.uuid,
    };
  }

  // ==================== INVITATION ENDPOINTS ====================

  /**
   * Send invitation email (ADMIN only)
   */
  @Post('admin/invite')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async sendInvitation(
    @Body() dto: SendInvitationDto,
    @Request() req,
  ) {
    const invitation = await this.invitationsService.createInvitation(
      dto,
      req.user.id,
    );
    return {
      uuid: invitation.uuid,
      email: invitation.email,
      role: invitation.role,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  /**
   * List invitations with filters (ADMIN only)
   */
  @Get('admin/invitations')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async listInvitations(@Query() dto: GetInvitationsDto) {
    return await this.invitationsService.listInvitations(dto);
  }

  /**
   * Revoke a pending invitation (ADMIN only)
   */
  @Delete('admin/invitations/:uuid')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async revokeInvitation(@Param('uuid') uuid: string) {
    await this.invitationsService.revokeInvitation(uuid);
    return { message: 'Invitación revocada exitosamente' };
  }

  /**
   * Validate invitation token (public)
   */
  @Get('invitation/:token')
  async validateInvitation(@Param('token') token: string) {
    const invitation = await this.invitationsService.validateToken(token);
    return {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Complete registration via invitation (public)
   */
  @Post('register/invitation')
  async completeInvitation(@Body() dto: CompleteInvitationDto) {
    const user = await this.invitationsService.completeRegistration(dto);
    const { password, ...result } = user;
    return result;
  }

  // ==================== ORDER_ADMIN READ-ONLY ACCESS ====================

  /**
   * Get all users (ORDER_ADMIN read-only)
   */
  @Get('order-admin/users')
  @Roles(UserRole.ORDER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAllForOrderAdmin(@Query() getUsersDto: GetUsersDto) {
    const result = await this.usersService.findAllPaginated(getUsersDto);

    // Remove passwords from all users
    result.data = result.data.map(({ password, ...user }) => user) as any;

    return result;
  }

  /**
   * Get single user (ORDER_ADMIN read-only)
   */
  @Get('order-admin/users/:uuid')
  @Roles(UserRole.ORDER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOneForOrderAdmin(@Param('uuid') uuid: string) {
    const user = await this.usersService.findByUuid(uuid);
    if (!user) {
      throw new NotFoundException(`User with UUID ${uuid} not found`);
    }
    const { password, ...result } = user;
    return result;
  }
}
