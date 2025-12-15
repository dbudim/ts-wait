# Wait Library
The Wait library provides a convenient way to implement polling mechanisms with customizable timeouts and intervals in TypeScript.

### Installation
You can install the Wait library via npm:

```Shell
npm install ts-wait
```


### Usage 

```Typescript
import { Wait } from 'ts-wait';

// Basic usage
await new Wait<Document>(() => client.documents.getDocument(id))
        .pollingEvery(1000)
        .withTimeout(20000)
        .until(document => document.status === 'COMPLETED')

// With maximum attempts limit
await new Wait<Document>(() => client.documents.getDocument(id))
        .pollingEvery(1000)
        .withMaxAttempts(10) // Stop after 10 polling attempts
        .until(document => document.status === 'COMPLETED')

// With exponential backoff
await new Wait<Document>(() => client.documents.getDocument(id))
        .pollingEvery(1000) // Initial interval
        .withExponentialBackoff(2, 10000) // Multiply by 2 each time, max 10 seconds
        .withTimeout(60000)
        .until(document => document.status === 'COMPLETED')

// Combining features
await new Wait<Document>(() => client.documents.getDocument(id))
        .pollingEvery(500)
        .withMaxAttempts(15)
        .withExponentialBackoff(1.5) // Gradually increase with 1.5x multiplier
        .withTimeout(30000)
        .until(document => document.status === 'COMPLETED')       
```

### API
`Wait<T>`
A class that represents the Wait library.

Constructor
`new Wait(call: () => Promise<T>)`: Creates a new `Wait` instance with the provided asynchronous function.

##### Methods:
`withTimeout(timeout: number): Wait<T>:` Sets the timeout for waiting in milliseconds (default: 30000)

`pollingEvery(interval: number): Wait<T>:` Sets the polling interval in milliseconds (default: 1000).

`withMessage(message: string): Wait<T>:` Sets a custom error message.

`withMaxAttempts(maxAttempts: number): Wait<T>:` Sets the maximum number of polling attempts. The polling will stop when either the timeout is reached or the maximum number of attempts is exceeded, whichever comes first.

`withExponentialBackoff(multiplier: number = 2, maxInterval?: number): Wait<T>:` Enables exponential backoff for the polling interval. The interval will be multiplied by the specified multiplier after each attempt. Optionally, you can set a maximum interval to cap the growth.
- `multiplier`: The factor by which to multiply the interval (default: 2)
- `maxInterval`: Optional maximum interval in milliseconds to prevent unbounded growth

`async until(condition: (it: T) => boolean): Promise<T>:` Waits until the provided condition function returns true or the timeout/max attempts is reached. Returns the result when the condition is met.

### Contributions
Contributions are welcome! Feel free to submit issues or pull requests.

### License
This library is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.



