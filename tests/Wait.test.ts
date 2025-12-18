import { Wait } from '../src/Wait';

describe('Wait', () => {
    describe('Basic functionality', () => {
        it('should resolve when condition is met immediately', async () => {
            const mockCall = jest.fn().mockResolvedValue(5);
            
            const result = await new Wait(mockCall)
                .until(value => value === 5);
            
            expect(result).toBe(5);
            expect(mockCall).toHaveBeenCalledTimes(1);
        });

        it('should poll until condition is met', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const result = await new Wait<number>(mockCall)
                .pollingEvery(100)
                .until(value => value >= 3);
            
            expect(result).toBe(3);
            expect(mockCall).toHaveBeenCalledTimes(3);
        });

        it('should throw error when timeout is reached', async () => {
            const mockCall = jest.fn().mockResolvedValue(1);
            
            await expect(
                new Wait(mockCall)
                    .pollingEvery(100)
                    .withTimeout(300)
                    .until(value => value === 10)
            ).rejects.toThrow();
        });

        it('should use custom error message when provided', async () => {
            const mockCall = jest.fn().mockResolvedValue(1);
            const customMessage = 'Custom timeout message';
            
            await expect(
                new Wait(mockCall)
                    .pollingEvery(100)
                    .withTimeout(200)
                    .withMessage(customMessage)
                    .until(value => value === 10)
            ).rejects.toThrow(customMessage);
        });

        it('should handle rejected promises gracefully', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => {
                counter++;
                if (counter < 3) {
                    return Promise.reject(new Error('API Error'));
                }
                return Promise.resolve(counter);
            });
            
            const result = await new Wait(mockCall)
                .pollingEvery(100)
                .withTimeout(1000)
                .until(value => value === 3);
            
            expect(result).toBe(3);
            expect(mockCall).toHaveBeenCalledTimes(3);
        });

        it('should include last error in error message when condition not met', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => {
                counter++;
                return Promise.reject(new Error('Connection timeout'));
            });
            
            try {
                await new Wait(mockCall)
                    .pollingEvery(50)
                    .withMaxAttempts(3)
                    .withTimeout(1000)
                    .until(value => value === 'success');
                fail('Should have thrown an error');
            } catch (error) {
                expect((error as Error).message).toContain('Condition not met');
                expect((error as Error).message).toContain('Last error: Connection timeout');
                expect((error as Error).message).toContain('actual attempts: 3');
            }
        });
    });

    describe('withMaxAttempts', () => {
        it('should stop polling after max attempts is reached', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            await expect(
                new Wait<number>(mockCall)
                    .pollingEvery(50)
                    .withMaxAttempts(5)
                    .withTimeout(10000)
                    .until(value => value >= 10)
            ).rejects.toThrow();
            
            expect(mockCall).toHaveBeenCalledTimes(5);
        });

        it('should succeed if condition is met before max attempts', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const result = await new Wait<number>(mockCall)
                .pollingEvery(50)
                .withMaxAttempts(10)
                .until(value => value >= 3);
            
            expect(result).toBe(3);
            expect(mockCall).toHaveBeenCalledTimes(3);
        });

        it('should include max attempts in error message', async () => {
            const mockCall = jest.fn().mockResolvedValue(1);
            
            try {
                await new Wait(mockCall)
                    .pollingEvery(50)
                    .withMaxAttempts(5)
                    .withTimeout(10000)
                    .until(value => value === 10);
                fail('Should have thrown an error');
            } catch (error) {
                expect((error as Error).message).toContain('max attempts: 5');
                expect((error as Error).message).toContain('actual attempts: 5');
            }
        });

        it('should respect both timeout and max attempts (timeout first)', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const startTime = Date.now();
            
            await expect(
                new Wait<number>(mockCall)
                    .pollingEvery(100)
                    .withMaxAttempts(100) // High max attempts
                    .withTimeout(300) // Low timeout
                    .until(value => value >= 100)
            ).rejects.toThrow();
            
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(500); // Should timeout, not wait for 100 attempts
            expect(mockCall).toHaveBeenCalledTimes(4); // ~300ms with 100ms intervals
        });

        it('should respect both timeout and max attempts (max attempts first)', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            await expect(
                new Wait<number>(mockCall)
                    .pollingEvery(50)
                    .withMaxAttempts(5) // Low max attempts
                    .withTimeout(10000) // High timeout
                    .until(value => value >= 100)
            ).rejects.toThrow();
            
            expect(mockCall).toHaveBeenCalledTimes(5); // Should stop at max attempts
        });
    });

    describe('withExponentialBackoff', () => {
        it('should increase interval exponentially with default multiplier', async () => {
            let counter = 0;
            const intervals: number[] = [];
            let lastTime = Date.now();
            
            const mockCall = jest.fn().mockImplementation(() => {
                const now = Date.now();
                if (counter > 0) {
                    intervals.push(now - lastTime);
                }
                lastTime = now;
                return Promise.resolve(++counter);
            });
            
            await new Wait<number>(mockCall)
                .pollingEvery(100)
                .withExponentialBackoff()
                .withTimeout(10000)
                .until(value => value >= 5);
            
            expect(intervals.length).toBe(4);
            // Each interval should be roughly double the previous (with some tolerance for timing)
            expect(intervals[1]).toBeGreaterThan(intervals[0] * 1.5);
            expect(intervals[2]).toBeGreaterThan(intervals[1] * 1.5);
        });

        it('should use custom multiplier', async () => {
            let counter = 0;
            const intervals: number[] = [];
            let lastTime = Date.now();
            
            const mockCall = jest.fn().mockImplementation(() => {
                const now = Date.now();
                if (counter > 0) {
                    intervals.push(now - lastTime);
                }
                lastTime = now;
                return Promise.resolve(++counter);
            });
            
            await new Wait<number>(mockCall)
                .pollingEvery(100)
                .withExponentialBackoff(1.5)
                .withTimeout(10000)
                .until(value => value >= 5);
            
            expect(intervals.length).toBe(4);
            // Intervals should increase by 1.5x
            expect(intervals[1]).toBeGreaterThan(intervals[0] * 1.2);
            expect(intervals[1]).toBeLessThan(intervals[0] * 2);
        });

        it('should cap interval at maxInterval', async () => {
            let counter = 0;
            const intervals: number[] = [];
            let lastTime = Date.now();
            
            const mockCall = jest.fn().mockImplementation(() => {
                const now = Date.now();
                if (counter > 0) {
                    intervals.push(now - lastTime);
                }
                lastTime = now;
                return Promise.resolve(++counter);
            });
            
            await new Wait<number>(mockCall)
                .pollingEvery(100)
                .withExponentialBackoff(2, 300) // Cap at 300ms
                .withTimeout(10000)
                .until(value => value >= 6);
            
            expect(intervals.length).toBe(5);
            // Later intervals should be capped
            const laterIntervals = intervals.slice(3);
            laterIntervals.forEach(interval => {
                expect(interval).toBeLessThan(400); // Some tolerance
            });
        });

        it('should work without maxInterval cap', async () => {
            let counter = 0;
            const intervals: number[] = [];
            let lastTime = Date.now();
            
            const mockCall = jest.fn().mockImplementation(() => {
                const now = Date.now();
                if (counter > 0) {
                    intervals.push(now - lastTime);
                }
                lastTime = now;
                return Promise.resolve(++counter);
            });
            
            await new Wait<number>(mockCall)
                .pollingEvery(50)
                .withExponentialBackoff(2) // No max cap
                .withTimeout(10000)
                .until(value => value >= 5);
            
            expect(intervals.length).toBe(4);
            // Should continue doubling without a cap
            expect(intervals[3]).toBeGreaterThan(300); // 50 * 2^3 = 400
        });
    });

    describe('Combined features', () => {
        it('should work with maxAttempts and exponential backoff', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            await expect(
                new Wait<number>(mockCall)
                    .pollingEvery(50)
                    .withMaxAttempts(5)
                    .withExponentialBackoff(2)
                    .withTimeout(10000)
                    .until(value => value >= 10)
            ).rejects.toThrow();
            
            expect(mockCall).toHaveBeenCalledTimes(5);
        });

        it('should work with all features combined', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const result = await new Wait<number>(mockCall)
                .pollingEvery(50)
                .withMaxAttempts(10)
                .withExponentialBackoff(1.5, 300)
                .withTimeout(5000)
                .withMessage('Custom message')
                .until(value => value >= 5);
            
            expect(result).toBe(5);
            expect(mockCall).toHaveBeenCalledTimes(5);
        });

        it('should prioritize the first limit reached (timeout vs attempts)', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const startTime = Date.now();
            
            await expect(
                new Wait<number>(mockCall)
                    .pollingEvery(100)
                    .withMaxAttempts(50)
                    .withTimeout(400)
                    .until(value => value >= 100)
            ).rejects.toThrow();
            
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(600);
            expect(mockCall).toHaveBeenCalledTimes(5); // Should timeout first
        });
    });

    describe('Edge cases', () => {
        it('should handle zero timeout', async () => {
            const mockCall = jest.fn().mockResolvedValue(1);
            
            await expect(
                new Wait(mockCall)
                    .withTimeout(0)
                    .until(value => value === 10)
            ).rejects.toThrow();
            
            expect(mockCall).toHaveBeenCalledTimes(1);
        });

        it('should handle maxAttempts of 1', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            await expect(
                new Wait<number>(mockCall)
                    .withMaxAttempts(1)
                    .until(value => value >= 5)
            ).rejects.toThrow();
            
            expect(mockCall).toHaveBeenCalledTimes(1);
        });

        it('should work with very small intervals', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const result = await new Wait<number>(mockCall)
                .pollingEvery(1)
                .withTimeout(1000)
                .until(value => value >= 3);
            
            expect(result).toBe(3);
            expect(mockCall).toHaveBeenCalledTimes(3);
        });

        it('should handle complex condition functions', async () => {
            interface ComplexObject {
                status: string;
                data: { count: number };
            }
            
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => {
                counter++;
                return Promise.resolve({
                    status: counter >= 3 ? 'ready' : 'pending',
                    data: { count: counter }
                });
            });
            
            const result = await new Wait<ComplexObject>(mockCall)
                .pollingEvery(50)
                .until(obj => obj.status === 'ready' && obj.data.count >= 3);
            
            expect(result.status).toBe('ready');
            expect(result.data.count).toBe(3);
        });

        it('should handle undefined initial result', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => {
                counter++;
                return counter < 3 ? Promise.reject(new Error()) : Promise.resolve('success');
            });
            
            const result = await new Wait(mockCall)
                .pollingEvery(50)
                .withTimeout(1000)
                .until(value => value === 'success');
            
            expect(result).toBe('success');
        });
    });

    describe('Fluent API', () => {
        it('should support method chaining in any order', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const result = await new Wait<number>(mockCall)
                .withMessage('Custom')
                .withTimeout(5000)
                .pollingEvery(50)
                .withMaxAttempts(10)
                .withExponentialBackoff(1.5)
                .until(value => value >= 3);
            
            expect(result).toBe(3);
        });

        it('should allow reconfiguration before until is called', async () => {
            let counter = 0;
            const mockCall = jest.fn().mockImplementation(() => Promise.resolve(++counter));
            
            const wait = new Wait<number>(mockCall)
                .withTimeout(1000)
                .pollingEvery(200);
            
            wait.withTimeout(5000).pollingEvery(50);
            
            const result = await wait.until(value => value >= 3);
            
            expect(result).toBe(3);
        });
    });

    describe('Skip condition evaluation on undefined', () => {
        it('should not evaluate condition on undefined when all calls fail', async () => {
            const mockCall = jest.fn().mockRejectedValue(new Error('API Error'));
            const mockCondition = jest.fn().mockReturnValue(false);
            
            await expect(
                new Wait(mockCall)
                    .pollingEvery(50)
                    .withMaxAttempts(3)
                    .until(mockCondition)
            ).rejects.toThrow('Condition not met');
            
            // The condition should never be called since we never got a valid result
            expect(mockCondition).not.toHaveBeenCalled();
        });

        it('should handle condition that would throw on undefined', async () => {
            interface ApiResponse {
                status: string;
                data: number;
            }
            
            let callCount = 0;
            const mockCall = jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount < 3) {
                    return Promise.reject(new Error('Connection failed'));
                }
                return Promise.resolve({ status: 'ready', data: 42 });
            });
            
            // This condition would throw TypeError if called with undefined
            const result = await new Wait<ApiResponse>(mockCall)
                .pollingEvery(50)
                .withTimeout(1000)
                .until(response => response.status === 'ready');
            
            expect(result).toEqual({ status: 'ready', data: 42 });
            expect(mockCall).toHaveBeenCalledTimes(3);
        });

        it('should clear last error when a subsequent call succeeds', async () => {
            let callCount = 0;
            const mockCall = jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.reject(new Error('Temporary error'));
                }
                return Promise.resolve(5);
            });
            
            const result = await new Wait(mockCall)
                .pollingEvery(50)
                .until(value => value === 5);
            
            expect(result).toBe(5);
        });
    });
});
