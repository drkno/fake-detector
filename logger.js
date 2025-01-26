import { createLogger, transports, format } from 'winston';

export default createLogger({
    level: 'info',
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        })
    ],
    exceptionHandlers: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        })
    ],
});
