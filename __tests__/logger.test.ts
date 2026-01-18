import { logger } from '../src/utils/logger';

describe('Logger', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    it('should log info messages', () => {
        logger.info('Test info message');
        expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
        logger.error('Test error message');
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log warning messages', () => {
        logger.warn('Test warning message');
        expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log success messages', () => {
        logger.success('Test success message');
        expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should support verbose mode', () => {
        logger.setVerbose(true);
        logger.debug('Test debug message');
        expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when verbose is off', () => {
        logger.setVerbose(false);
        consoleLogSpy.mockClear();
        logger.debug('Test debug message');
        expect(consoleLogSpy).not.toHaveBeenCalled();
    });
});
