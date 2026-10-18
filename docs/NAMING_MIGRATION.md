# Generated naming migration

Status: implemented. CamelCase application properties are now the default, with schema-aware request serialization and JSON response deserialization. API wire names stay intact. `propertyNaming: "preserve"` retains payload-shaped types for existing consumers.

## Agreed default

Use PascalCase for classes, interfaces, type aliases and enum names, and camelCase for methods, parameters, local variables and application-facing properties. Normalize common acronyms consistently: `user_id` becomes `userId`, `HTTP_response` becomes `httpResponse`, and `user_profile` becomes `UserProfile` as a type name. Keep enum wire values unchanged. Use conventional uppercase enum member names.

The new property behavior defaults to camelCase with generated request serialization and response deserialization. Projects that want payload-shaped types can select preservation:

```typescript
// Current configuration.
propertyNaming: "camelCase" // default
// or
propertyNaming: "preserve"  // retain user_id, x-label, etc.
```

Property naming is separate from method/type naming. `namingConvention` continues to control method/parameter naming for compatibility; types and classes use PascalCase. Numeric modes are not used. Component names that shadow built-in generic utility types or client declarations receive a `Model` suffix; further collisions fail generation explicitly.

## Expected output

For a payload `{ "user_id": "42", "display_name": "Ada" }`:

```typescript
export interface User {
  userId: string;
  displayName: string;
}

// Generated schema-aware functions. Conversion does not validate payloads.
export function deserializeUser(payload: unknown): User;
export function serializeUser(value: User): unknown;
```

`client.getUser()` returns application-shaped `User`. `client.updateUser({ userId: "42", displayName: "Ada" })` sends the original API keys. Preservation mode retains the wire-shaped interface and avoids property conversion. Types-only projects receive the converters when selecting camelCase, so the same contract works without a generated HTTP client.

## Conversion contract

- Generate an explicit wire-to-property mapping from the schema, shared by types, clients, hooks and validation plugins. Keep parameter wire names independently for path/query/header/cookie serialization.
- Convert declared object properties recursively through arrays, references, nullable values, compositions and nested objects. Preserve absent versus present properties, optional fields and `null`.
- Preserve dictionary keys, unknown payload fields, enum values and strings. For `Record<string, User>`, keep the keys and convert each `User` value. Do not run a global recursive casing function over arbitrary JSON.
- Treat binary values, `Blob`, `File`, `FormData`, dates and other non-JSON inputs according to their explicit schema/media conversion rules. Do not turn arbitrary objects into JSON while renaming keys.
- Keep string dates as strings unless a separate runtime conversion setting explicitly requests dates. Custom TypeScript mappings alone are not runtime parsers.
- Select union variants using wire discriminators before renaming the discriminator property. Ambiguous unions need a deterministic documented policy and a diagnostic when safe conversion cannot be established.
- Retain source wire metadata on generated members. Generated Zod validators validate application-shaped values. Validation helpers remain explicit integrations; enabling a plugin does not automatically validate HTTP traffic. Hooks expose the same application properties as clients.
- Fail generation for normalized property/type/export collisions (`user_id` and `userId`) with the schema path and both source names. Rename the conflicting source property or select preserve mode; explicit property overrides are not implemented. Reserved identifiers and invalid leading characters use shared formatters. Conflicting method identifiers receive deterministic suffixes.
- Avoid mutation of input payloads and schemas. Build new converted values; guard recursive references in generated converter definitions.

## Implementation sequence

1. Add naming metadata and one shared formatter. Audit all first-party and plugin generators against it; add separate property configuration and explicit collision diagnostics. Preserve existing type-prefix/suffix behavior and review API-title-derived client names for duplicate `Api`/`Client` words.
2. Generate and export schema-aware serializers/deserializers. Add preservation mode first, then implement camelCase conversion with fixtures for arrays, dictionaries, optional/null values, recursive references and unions.
3. Connect converters at HTTP boundaries for JSON requests/responses and declared form fields. Align hooks and Zod output. Ensure errors, headers and dictionary keys retain their intended semantics.
4. Validate both modes using compiled consumer code and real local HTTP round trips. Test spelling, wire bytes, decoded objects, validation failures and collision errors, including custom prefixes and nested filenames.
5. The camelCase default and preservation mode are implemented in the working tree, with before/after examples in maintained guides. Publishing a migration release and a separate generated-name mapping report remain future release work.

## Release acceptance

Every repository schema compiles under strict TypeScript in both modes. A camelCase request reaches the server with unchanged wire keys; a wire response returns camelCase application properties. Preservation mode returns the original payload shape. Dictionaries, enums and binary inputs survive round trips unchanged where specified. Plugins and hooks use the same names and converters. No public naming change ships without a documented compatibility setting.
