# FastAPI tutorial

This example uses Node.js 20+, Python with FastAPI/Uvicorn, and a TypeScript consumer. The generated client uses fetch; no React dependency is needed for the default output.

## Run the API

```sh
python -m pip install fastapi uvicorn
```

Save `main.py`:

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Users API")

class User(BaseModel):
    id: int
    display_name: str

@app.get("/users/{user_id}", response_model=User, operation_id="getUser")
def get_user(user_id: int):
    return User(id=user_id, display_name="Example")

@app.post("/users", response_model=User, operation_id="createUser")
def create_user(user: User):
    return user
```

```sh
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Generate and use the client

From your TypeScript project:

```sh
npm install --save-dev schemantic typescript
npx schemantic generate --url http://127.0.0.1:8000/openapi.json --output ./src/generated
```

```ts
import { UsersApiClient as ApiClient } from './generated/index.js';

const client = new ApiClient({ baseUrl: 'http://127.0.0.1:8000' });
const user = await client.getUser(1);
console.log(user.id, user.displayName);
```

The explicit `operation_id` gives stable operation/method names. The API sends `display_name`; the default application property is `displayName`. Use `propertyNaming: "preserve"` if your application should keep the wire property names. Generated types derive from the live schema, including request/response projections; inspect generated body signatures before constructing a request. Use requestInit headers for per-call overrides. For bearer auth, use `setAuthToken(token)`/`clearAuthToken()`; the client does not perform an OAuth authorization flow.

```ts
import { UsersApiClient as ApiClient } from './generated/index.js';

const client = new ApiClient({ baseUrl: 'http://127.0.0.1:8000' });
const user = await client.getUser(1, { headers: { 'X-Request-ID': 'example' } });
console.log(user.id, user.displayName);
```

## Optional plain React hooks

```sh
npm install react
npx schemantic generate --url http://127.0.0.1:8000/openapi.json --output ./src/generated --hooks
```

```tsx
import { UsersApiClient as ApiClient, createApiHooks } from './generated/index.js';

const client = new ApiClient({ baseUrl: 'http://127.0.0.1:8000' });
const hooks = createApiHooks(client);

export function UserView() {
  const { data, error, loading, refetch } = hooks.useGetUserQuery({ path: { user_id: 1 } });
  if (loading) return <p>Loading</p>;
  if (error) return <p>{error.message}</p>;
  return <button onClick={() => { void refetch(); }}>{data?.id}</button>;
}
```

Mutation hooks take no callback options. Get `mutate` and `loading` from the hook, then `await mutate({ body: value })` in an event handler with try/catch. Do not pass TanStack Query `enabled`, `onSuccess`, `onError`, or read `isLoading`; these are plain React hooks.

## Config and validation

```sh
npx schemantic init --yes
```

Edit `schemantic.config.json`:

```json
{
  "schemaUrl": "http://127.0.0.1:8000/openapi.json",
  "outputDir": "./src/generated",
  "generateHooks": false
}
```

```sh
npx schemantic validate --config
npx schemantic generate --verbose
```

A config file is never replaced implicitly: explicit `init --force` is required. Validation reports supported-schema diagnostics and does not repair files. File watch is available for local JSON snapshots; URL watch is unsupported.

For runtime validation, install Zod 4 and enable `zod-validation`, then explicitly call the generated validator helpers. Enabling a plugin does not insert validation/caching/timing into each endpoint automatically. JSON OpenAPI 3.0.x/3.1.x and local refs are supported; YAML, external refs, and OpenAPI 3.2+ are rejected. See [configuration](CONFIGURATION.md) and [plugin contracts](PLUGINS.md).
