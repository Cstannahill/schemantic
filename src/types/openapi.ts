/**
 * Core OpenAPI 3.0+ schema type definitions
 * These types represent the structure of OpenAPI schemas as they would be
 * received from FastAPI applications
 */

export interface OpenAPISchema {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: OpenAPIPaths;
  webhooks?: Record<string, OpenAPIPathItem | OpenAPIRef>;
  components?: OpenAPIComponents;
  security?: OpenAPISecurityRequirement[];
  tags?: OpenAPITag[];
  externalDocs?: OpenAPIExternalDocumentation;
}

/** Input may omit paths for OpenAPI 3.1 components-only documents; parsers normalize it. */
export type OpenAPIInputDocument = Omit<OpenAPISchema, 'paths'> & { paths?: OpenAPIPaths };

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
}

export interface OpenAPIContact {
  name?: string;
  url?: string;
  email?: string;
}

export interface OpenAPILicense {
  name: string;
  url?: string;
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface OpenAPIPaths {
  [path: string]: OpenAPIPathItem;
}

export interface OpenAPIPathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  servers?: OpenAPIServer[];
  parameters?: (OpenAPIParameter | OpenAPIRef)[];
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocumentation;
  operationId?: string;
  parameters?: (OpenAPIParameter | OpenAPIRef)[];
  requestBody?: OpenAPIRequestBody | OpenAPIRef;
  responses: OpenAPIResponses;
  callbacks?: Record<string, OpenAPICallback | OpenAPIRef>;
  deprecated?: boolean;
  security?: OpenAPISecurityRequirement[];
  servers?: OpenAPIServer[];
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchemaObject | OpenAPIRef;
  example?: unknown;
  examples?: Record<string, OpenAPIExample | OpenAPIRef>;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

export interface OpenAPIResponses {
  [statusCode: string]: OpenAPIResponse | OpenAPIRef;
}

export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIRef>;
  content?: Record<string, OpenAPIMediaType>;
  links?: Record<string, OpenAPILink | OpenAPIRef>;
}

export interface OpenAPIHeader {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchemaObject | OpenAPIRef;
  example?: unknown;
  examples?: Record<string, OpenAPIExample | OpenAPIRef>;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchemaObject | OpenAPIRef;
  example?: unknown;
  examples?: Record<string, OpenAPIExample | OpenAPIRef>;
  encoding?: Record<string, OpenAPIEncoding>;
}

export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

export interface OpenAPIEncoding {
  contentType?: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIRef>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
  description?: string;
  server?: OpenAPIServer;
}

export interface OpenAPICallback {
  [expression: string]: OpenAPIPathItem;
}

export interface OpenAPIRef {
  $ref: string;
  /** OpenAPI 3.1 Schema Object siblings are evaluated; 3.0 ignores ref siblings. */
  [key: string]: unknown;
}

/** Raw 3.1 document schemas can be booleans. The parser normalizes them before generation. */
export type OpenAPISchemaValue = OpenAPISchemaObject | OpenAPIRef | boolean;

/**
 * OpenAPI Schema Object - represents a JSON Schema
 */
export interface OpenAPISchemaObject {
  type?: string | string[];
  properties?: Record<string, OpenAPISchemaObject | OpenAPIRef>;
  items?: OpenAPISchemaObject | OpenAPIRef;
  required?: string[];
  additionalProperties?: boolean | OpenAPISchemaObject | OpenAPIRef;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  /** JSON Schema content annotations; encoded strings are not raw upload parts. */
  contentMediaType?: string;
  contentEncoding?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean | number;
  exclusiveMaximum?: boolean | number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  multipleOf?: number;
  minProperties?: number;
  maxProperties?: number;
  allOf?: (OpenAPISchemaObject | OpenAPIRef)[];
  anyOf?: (OpenAPISchemaObject | OpenAPIRef)[];
  oneOf?: (OpenAPISchemaObject | OpenAPIRef)[];
  not?: OpenAPISchemaObject | OpenAPIRef;
  if?: OpenAPISchemaObject | OpenAPIRef;
  then?: OpenAPISchemaObject | OpenAPIRef;
  else?: OpenAPISchemaObject | OpenAPIRef;
  description?: string;
  title?: string;
  default?: unknown;
  example?: unknown;
  examples?: unknown[];
  nullable?: boolean;
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };
  xml?: {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
  };
  externalDocs?: OpenAPIExternalDocumentation;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  [key: string]: unknown; // Allow additional properties
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchemaValue>;
  responses?: Record<string, OpenAPIResponse | OpenAPIRef>;
  parameters?: Record<string, OpenAPIParameter | OpenAPIRef>;
  examples?: Record<string, OpenAPIExample | OpenAPIRef>;
  requestBodies?: Record<string, OpenAPIRequestBody | OpenAPIRef>;
  headers?: Record<string, OpenAPIHeader | OpenAPIRef>;
  securitySchemes?: Record<string, OpenAPISecurityScheme | OpenAPIRef>;
  links?: Record<string, OpenAPILink | OpenAPIRef>;
  callbacks?: Record<string, OpenAPICallback | OpenAPIRef>;
  pathItems?: Record<string, OpenAPIPathItem | OpenAPIRef>;
}

export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocumentation;
}

export interface OpenAPIExternalDocumentation {
  description?: string;
  url: string;
}
