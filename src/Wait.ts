export class Wait<T> {

    private readonly call: () => Promise<T>;
    private TIMEOUT: number = 30000;
    private INTERVAL: number = 1000;
    private MAX_ATTEMPTS?: number;
    private EXPONENTIAL_BACKOFF: boolean = false;
    private BACKOFF_MULTIPLIER: number = 2;
    private MAX_INTERVAL?: number;
    private message?: string;

    constructor(call: () => Promise<T>) {
        this.call = call;
    }

    public withTimeout(timeout: number): Wait<T> {
        this.TIMEOUT = timeout;
        return this;
    }

    public pollingEvery(interval: number): Wait<T> {
        this.INTERVAL = interval;
        return this;
    }

    public withMessage(message: string): Wait<T> {
        this.message = message;
        return this;
    }

    public withMaxAttempts(maxAttempts: number): Wait<T> {
        this.MAX_ATTEMPTS = maxAttempts;
        return this;
    }

    public withExponentialBackoff(multiplier: number = 2, maxInterval?: number): Wait<T> {
        this.EXPONENTIAL_BACKOFF = true;
        this.BACKOFF_MULTIPLIER = multiplier;
        this.MAX_INTERVAL = maxInterval;
        return this;
    }

    public async until(condition: (it: T) => boolean): Promise<T> {
        const startTime = Date.now();
        let attemptCount = 0;
        let currentInterval = this.INTERVAL;
        let lastError: Error | undefined;

        let result: T = undefined as T;

        try {
            result = (await this.call()) as T;
        } catch (error) {
            lastError = error as Error;
        }
        attemptCount++;

        while (!condition(result) && this.shouldContinuePolling(startTime, attemptCount)) {
            await new Promise(resolve => setTimeout(resolve, currentInterval));
            
            try {
                result = (await this.call()) as T;
            } catch (error) {
                lastError = error as Error;
            }
            attemptCount++;

            // Apply exponential backoff if enabled
            if (this.EXPONENTIAL_BACKOFF) {
                currentInterval = this.calculateNextInterval(currentInterval);
            }
        }

        if (!condition(result)) {
            const errorMessage = this.message || this.buildErrorMessage(condition, attemptCount, lastError);
            throw new Error(errorMessage);
        }
        return result;
    }

    private shouldContinuePolling(startTime: number, attemptCount: number): boolean {
        const timeoutNotExceeded = (Date.now() - startTime) < this.TIMEOUT;
        const attemptsNotExceeded = this.MAX_ATTEMPTS === undefined || attemptCount < this.MAX_ATTEMPTS;
        return timeoutNotExceeded && attemptsNotExceeded;
    }

    private calculateNextInterval(currentInterval: number): number {
        const nextInterval = currentInterval * this.BACKOFF_MULTIPLIER;
        return this.MAX_INTERVAL !== undefined 
            ? Math.min(nextInterval, this.MAX_INTERVAL) 
            : nextInterval;
    }

    private buildErrorMessage(condition: (it: T) => boolean, attemptCount: number, lastError?: Error): string {
        const timeInfo = `timeout: ${this.TIMEOUT} ms`;
        const attemptInfo = this.MAX_ATTEMPTS !== undefined 
            ? `, max attempts: ${this.MAX_ATTEMPTS}` 
            : '';
        const actualAttempts = `, actual attempts: ${attemptCount}`;
        const errorInfo = lastError 
            ? `. Last error: ${lastError.message}` 
            : '';
        return `Condition not met: [${condition.toString()}] (${timeInfo}${attemptInfo}${actualAttempts})${errorInfo}`;
    }
}
