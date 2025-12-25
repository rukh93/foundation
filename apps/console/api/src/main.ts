import 'dotenv/config';

import { clerkPlugin } from '@clerk/fastify';
import { HttpStatus, NotAcceptableException, ValidationError, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ErrorCodes } from '@repo/nest-shared';
import Fastify from 'fastify';
import { WinstonModule } from 'nest-winston';

import { AppModule } from '@/app/app.module';

import { instance } from './winston';

const mapError = (error: ValidationError) => {
	const [childrenError] = error.children || [];

	if (childrenError) {
		return mapError(childrenError);
	}

	return {
		property: error.property,
		value: error.value as unknown,
		message: Object.values(error.constraints ?? {}),
	};
};

async function bootstrap() {
	const fastify = Fastify({ logger: true });

	await fastify.register(clerkPlugin);

	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(fastify), {
		cors: true,
		logger: WinstonModule.createLogger({ instance }),
	});

	app.setGlobalPrefix('api');

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
			exceptionFactory: (errors: ValidationError[]) => {
				const data = errors.map(mapError);
				return new NotAcceptableException({
					statusCode: HttpStatus.NOT_ACCEPTABLE,
					message: ErrorCodes.SHARED_DTO_VALIDATION_ERROR,
					data,
				});
			},
		}),
	);

	await app.listen(3000, '0.0.0.0');
}

// eslint-disable-next-line
bootstrap();
