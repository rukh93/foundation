import { createLogger, format, transports } from 'winston';

const customFormat = format.printf(({ timestamp, level, stack, message, context, action, entity, meta }) => {
	const logMessage = `${timestamp as string} - [${level.toUpperCase().padEnd(7)}]`;

	return [logMessage, context, action, entity, meta, message, stack].filter(Boolean).join(' - ');
});

const options = {
	file: {
		filename: 'error.log',
		level: 'error',
	},
	console: {
		level: 'silly',
	},
};

const devLogger = {
	format: format.combine(format.timestamp(), format.errors({ stack: true }), customFormat),
	transports: [new transports.Console(options.console)],
};

const prodLogger = {
	format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
	transports: [
		new transports.File(options.file),
		new transports.File({
			filename: 'combine.log',
			level: 'info',
		}),
	],
};

const instanceLogger = process.env.NODE_ENV === 'production' ? prodLogger : devLogger;

export const instance = createLogger(instanceLogger);
