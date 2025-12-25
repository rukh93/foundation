import { Global, Module } from '@nestjs/common';

import { ErrorManagerService, HttpService } from './services';

@Global()
@Module({
	exports: [ErrorManagerService, HttpService],
	providers: [ErrorManagerService, HttpService],
})
export class SharedModule {}
