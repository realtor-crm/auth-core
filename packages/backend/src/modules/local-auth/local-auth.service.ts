import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { TokenResponse } from '../auth/types/auth.types';
import { KeycloakAdminService } from '../keycloak/services/admin.service';
import { KeycloakGrantService } from '../keycloak/services/grant.service';
import { UserService } from '../user/user.service';
import { LocalLoginDto } from './dtos/login.dto';
import { LocalRegisterDto } from './dtos/register.dto';

@Injectable()
export class LocalAuthService {
  constructor(
    private readonly grantService: KeycloakGrantService,
    private readonly userService: UserService,
    private readonly adminService: KeycloakAdminService
  ) {}
  async login(loginDto: LocalLoginDto): Promise<
    TokenResponse & {
      refresh_expires_in: number | undefined;
    }
  > {
    const { email, password } = loginDto;

    const grant = await this.grantService.issueGrant({ email, password });

    const keycloakUser = await this.grantService.getUserInfoFromToken(grant.access_token!);

    if (!keycloakUser) {
      throw new InternalServerErrorException('Cannot get user info from token');
    }

    const userInDb = await this.userService.findUserByEmail(keycloakUser.email);
    if (!userInDb) {
      throw new InternalServerErrorException('User does not exist in database');
    }
    const { refresh_token, access_token } = grant;
    return {
      refresh_token: refresh_token.token,
      access_token: access_token.token,
      refresh_expires_in: refresh_token.content.exp
    };
  }

  public async register(registerDto: LocalRegisterDto) {
    return this.createUser(registerDto);
  }

  private async createUser(registerDto: LocalRegisterDto): Promise<{ message: string }> {
    const keycloakUser = await this.adminService.createKeycloakUser({
      registerDto,
      verifyEmail: true,
      activeProfile: true
    });

    try {
      const userInDb = await this.userService.createUser(registerDto, keycloakUser.id);
      if (!userInDb) {
        throw new InternalServerErrorException('Cannot create user');
      }
    } catch (error) {
      // If there's an error when creating the user in the local database,
      // delete the user from Keycloak to keep the two systems in sync.
      await this.adminService.deleteUserById(keycloakUser.id);
      throw error;
    }

    return {
      message: 'User created successfully'
    };
  }

  public async logout() {
    return 'logout';
  }
}
