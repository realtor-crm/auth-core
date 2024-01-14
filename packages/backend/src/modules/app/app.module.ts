import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '@/config/configuration';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    KeycloakModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
