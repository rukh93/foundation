import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: 'localhost',
  port: 6379,
  username: process.env.REDIS_USERNAME!,
  password: process.env.REDIS_PASSWORD!,
}));
