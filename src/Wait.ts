export class Wait<T> {

    private readonly call: () => Promise<T>;
    private TIMEOUT: number = 30000;
    private INTERVAL: number = 1000;
    private message: string = "Condition didn't met!";

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

    public async until(condition: (it: T) => boolean): Promise<T> {
        const startTime = Date.now();

        let result: T = undefined as T;

        try {
            result = (await this.call()) as T;
        } catch (error) {
            console.log(error);
        }

        while (!condition(result) && ((Date.now() - startTime) < this.TIMEOUT)) {
            await new Promise(resolve => setTimeout(resolve, this.INTERVAL));
            try {
                result = (await this.call()) as T;
            } catch (error) {
                console.log(error);
            }
        }

        if (!condition(result)) {
            this.message = this.message
                ? this.message
                : `Condition not met: [${condition.toString()}] in ${this.TIMEOUT} ms`;
            throw new Error(this.message);
        }
        return result;
    }
}
