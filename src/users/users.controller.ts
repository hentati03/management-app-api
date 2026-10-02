import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto } from './dto';
import { Roles, CurrentUser } from '../common';
import { Role } from '@prisma/client';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(user.sub);
  }

  @Patch('profile')
  updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateProfile(user.sub, updateProfileDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.update(id, updateUserDto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.remove(id, user.sub, user.role);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.usersService.toggleActive(id);
  }
}
