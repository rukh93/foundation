import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import config from './rabbitmq.config';

@Global()
@Module({
	imports: [
		ConfigModule.forFeature(config),
		RabbitMQModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService<{ rabbitmq: RabbitMQConfig }, true>) =>
				configService.get<RabbitMQConfig>('rabbitmq'),
		}),
	],
	exports: [RabbitMQModule],
})
export class RabbitmqModule {}
