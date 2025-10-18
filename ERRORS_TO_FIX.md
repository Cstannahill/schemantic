## Errors

The following errors were detected in a new project that I used schemantic in.
We need to address these one by one.

Also, we need to fix the following smaller errors I noticed:

Schemantic.config.json should be schemantic.config.json

We are unable to properly utilize config settings, calling with the --config flag.

Naming convention leaves some room to be desired. For instance with no prefix or no suffix -
convertImageConvertPost and batchConvertImagesConvertBatchPost the names are a bit long and clunky.

when generating with no prefix or suffix, we sometimes have types declared within other types or functions that unexpectedly pick up a prefixed name (e.g., `API`), causing naming conflicts and type errors. This should be fixed so an empty prefix produces unprefixed names.

```terminal
[{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/api-client.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<T>'.",
	"source": "ts",
	"startLineNumber": 293,
	"startColumn": 20,
	"endLineNumber": 293,
	"endColumn": 26,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/api-client.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 293,
	"startColumn": 32,
	"endLineNumber": 293,
	"endColumn": 35,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/api-client.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<T>'.",
	"source": "ts",
	"startLineNumber": 308,
	"startColumn": 62,
	"endLineNumber": 308,
	"endColumn": 68,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/api-client.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<T>'.",
	"source": "ts",
	"startLineNumber": 310,
	"startColumn": 20,
	"endLineNumber": 310,
	"endColumn": 26,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/api-client.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 310,
	"startColumn": 32,
	"endLineNumber": 310,
	"endColumn": 35,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/barrel.ts",
	"owner": "typescript",
	"code": "2308",
	"severity": 8,
	"message": "Module './types' has already exported a member named 'ValidationError'. Consider explicitly re-exporting to resolve the ambiguity.",
	"source": "ts",
	"startLineNumber": 3,
	"startColumn": 1,
	"endLineNumber": 3,
	"endColumn": 30,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/barrel.ts",
	"owner": "typescript",
	"code": "2307",
	"severity": 8,
	"message": "Cannot find module './hooks' or its corresponding type declarations.",
	"source": "ts",
	"startLineNumber": 4,
	"startColumn": 15,
	"endLineNumber": 4,
	"endColumn": 24,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2741",
	"severity": 8,
	"message": "Property 'files' is missing in type '{ targetFormat: \"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"; preserveNames: boolean | undefined; }' but required in type 'BodyBatchConvertImagesConvertBatchPost'.",
	"source": "ts",
	"startLineNumber": 93,
	"startColumn": 29,
	"endLineNumber": 93,
	"endColumn": 33,
	"relatedInformation": [
		{
			"startLineNumber": 10,
			"startColumn": 3,
			"endLineNumber": 10,
			"endColumn": 8,
			"message": "'files' is declared here.",
			"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts"
		}
	],
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<{ targetFormat: \"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"; preserveNames: boolean | undefined; }>'.",
	"source": "ts",
	"startLineNumber": 98,
	"startColumn": 26,
	"endLineNumber": 98,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 99,
	"startColumn": 8,
	"endLineNumber": 99,
	"endColumn": 11,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2741",
	"severity": 8,
	"message": "Property 'files' is missing in type '{ targetFormat: \"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"; preserveNames: boolean | undefined; }' but required in type 'BodyBatchConvertImagesConvertBatchPost'.",
	"source": "ts",
	"startLineNumber": 110,
	"startColumn": 3,
	"endLineNumber": 110,
	"endColumn": 9,
	"relatedInformation": [
		{
			"startLineNumber": 10,
			"startColumn": 3,
			"endLineNumber": 10,
			"endColumn": 8,
			"message": "'files' is declared here.",
			"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts"
		}
	],
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2741",
	"severity": 8,
	"message": "Property 'file' is missing in type '{ targetFormat: \"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"; }' but required in type 'BodyConvertImageConvertPost'.",
	"source": "ts",
	"startLineNumber": 197,
	"startColumn": 29,
	"endLineNumber": 197,
	"endColumn": 33,
	"relatedInformation": [
		{
			"startLineNumber": 144,
			"startColumn": 3,
			"endLineNumber": 144,
			"endColumn": 7,
			"message": "'file' is declared here.",
			"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts"
		}
	],
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<{ targetFormat: \"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"; }>'.",
	"source": "ts",
	"startLineNumber": 202,
	"startColumn": 26,
	"endLineNumber": 202,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 203,
	"startColumn": 8,
	"endLineNumber": 203,
	"endColumn": 11,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2741",
	"severity": 8,
	"message": "Property 'file' is missing in type '{ targetFormat: \"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"; }' but required in type 'BodyConvertImageConvertPost'.",
	"source": "ts",
	"startLineNumber": 214,
	"startColumn": 3,
	"endLineNumber": 214,
	"endColumn": 9,
	"relatedInformation": [
		{
			"startLineNumber": 144,
			"startColumn": 3,
			"endLineNumber": 144,
			"endColumn": 7,
			"message": "'file' is declared here.",
			"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts"
		}
	],
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2552",
	"severity": 8,
	"message": "Cannot find name 'APIValidationErrorSchema'. Did you mean 'ValidationErrorSchema'?",
	"source": "ts",
	"startLineNumber": 252,
	"startColumn": 21,
	"endLineNumber": 252,
	"endColumn": 45,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<{ detail?: any[] | undefined; }>'.",
	"source": "ts",
	"startLineNumber": 272,
	"startColumn": 26,
	"endLineNumber": 272,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 273,
	"startColumn": 8,
	"endLineNumber": 273,
	"endColumn": 11,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<{ status: string; version: string; environment: string; }>'.",
	"source": "ts",
	"startLineNumber": 344,
	"startColumn": 26,
	"endLineNumber": 344,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 345,
	"startColumn": 8,
	"endLineNumber": 345,
	"endColumn": 11,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '\"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"' is not assignable to type 'ImageFormat'.\n  Type '\"png\"' is not assignable to type 'ImageFormat'.",
	"source": "ts",
	"startLineNumber": 391,
	"startColumn": 29,
	"endLineNumber": 391,
	"endColumn": 33,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<\"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\">'.",
	"source": "ts",
	"startLineNumber": 396,
	"startColumn": 26,
	"endLineNumber": 396,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 397,
	"startColumn": 8,
	"endLineNumber": 397,
	"endColumn": 11,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '\"png\" | \"jpeg\" | \"jpg\" | \"webp\" | \"avif\" | \"tiff\" | \"tif\" | \"ico\" | \"heic\" | \"heif\" | \"bmp\" | \"svg\"' is not assignable to type 'ImageFormat'.\n  Type '\"png\"' is not assignable to type 'ImageFormat'.",
	"source": "ts",
	"startLineNumber": 406,
	"startColumn": 3,
	"endLineNumber": 406,
	"endColumn": 9,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ loc: unknown[]; msg: string; type: string; }' is not assignable to type 'ValidationError'.\n  Types of property 'loc' are incompatible.\n    Type 'unknown[]' is not assignable to type 'string | number[]'.\n      Type 'unknown[]' is not assignable to type 'number[]'.\n        Type 'unknown' is not assignable to type 'number'.",
	"source": "ts",
	"startLineNumber": 459,
	"startColumn": 29,
	"endLineNumber": 459,
	"endColumn": 33,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2339",
	"severity": 8,
	"message": "Property 'errors' does not exist on type 'ZodError<{ loc: unknown[]; msg: string; type: string; }>'.",
	"source": "ts",
	"startLineNumber": 464,
	"startColumn": 26,
	"endLineNumber": 464,
	"endColumn": 32,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "7006",
	"severity": 8,
	"message": "Parameter 'err' implicitly has an 'any' type.",
	"source": "ts",
	"startLineNumber": 465,
	"startColumn": 8,
	"endLineNumber": 465,
	"endColumn": 11,
	"origin": "extHost1"
},{
	"resource": "/S:/Code/Node/nextjs/image-conversion/src/app/lib/api/types.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ loc: unknown[]; msg: string; type: string; }' is not assignable to type 'ValidationError'.\n  Types of property 'loc' are incompatible.\n    Type 'unknown[]' is not assignable to type 'string | number[]'.\n      Type 'unknown[]' is not assignable to type 'number[]'.\n        Type 'unknown' is not assignable to type 'number'.",
	"source": "ts",
	"startLineNumber": 474,
	"startColumn": 3,
	"endLineNumber": 474,
	"endColumn": 9,
	"origin": "extHost1"
}]
```
