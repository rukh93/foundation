import { Injectable } from '@nestjs/common';
import { PrismaService } from '@repo/nest-prisma';

import type { ApplyEntryInput } from './credits.types';

@Injectable()
export class CreditsService {
  constructor(private readonly prismaService: PrismaService) {}
}
