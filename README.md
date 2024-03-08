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

await new Wait<Document>(() => client.documents.getDocument(id))
        .pollingEvery(1000)
        .withTimeout(20000)
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

`async until(condition: (it: T) => boolean): Promise<T>:` Waits until the provided condition function returns true or the timeout is reached. Returns the result when the condition is met.

### Contributions
Contributions are welcome! Feel free to submit issues or pull requests.

### License
This library is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.



