import { Module } from '@nestjs/common';
import { LanguageModule } from '@repo/nest-language';

import { UserConsumer } from './user.consumer';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
	imports: [LanguageModule],
  controllers: [UserController],
	exports: [UserService],
	providers: [UserService, UserConsumer],
})
export class UserModule {}
