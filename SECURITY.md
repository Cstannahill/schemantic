# Security Policy

## Supported Versions

We provide security updates for the following versions of Schemantic:

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ Yes    |
| < 0.1   | ❌ No     |

## Reporting a Vulnerability

We take the security of Schemantic seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT create a public issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Report privately

Instead, please report security vulnerabilities via email to:
**security@schemantic.dev** (or create a private security advisory on GitHub)

### 3. Include details

Please provide as much information as possible, including:

- **Type of vulnerability** (e.g., code injection, path traversal, etc.)
- **Location** of the vulnerable code (file path, line number if possible)
- **Step-by-step instructions** to reproduce the issue
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)

### 4. Response timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix development**: Within 2-4 weeks (depending on complexity)
- **Public disclosure**: After fix is released and users have time to update

## Security Best Practices

### For Users

1. **Keep Schemantic updated** to the latest version
2. **Validate input schemas** before processing
3. **Sanitize generated output** if using in web applications
4. **Use HTTPS** when fetching schemas from URLs
5. **Review generated code** before committing to version control

### For Contributors

1. **Validate all inputs** from CLI arguments and configuration files
2. **Sanitize file paths** to prevent directory traversal
3. **Escape output** to prevent code injection in generated files
4. **Use secure defaults** in configuration options
5. **Review dependencies** for known vulnerabilities

## Security Considerations

### Code Generation

- Generated TypeScript code should be safe by default
- No execution of arbitrary code from schemas
- Proper escaping of schema content in generated code

### File System Operations

- Validate output paths to prevent writing outside intended directories
- Proper handling of file permissions
- Safe cleanup of temporary files

### Network Operations

- HTTPS validation for remote schema fetching
- Timeout handling for network requests
- No execution of downloaded content

### Dependencies

- Regular security audits with `npm audit`
- Minimal dependency footprint
- Automated dependency updates with security checks

## Known Security Considerations

### Schema Processing

- **Malicious schemas**: Large or deeply nested schemas could cause DoS
- **Code injection**: Schema content is escaped before code generation
- **Path traversal**: Output paths are validated and sanitized

### CLI Usage

- **Argument injection**: CLI arguments are properly validated
- **File permissions**: Generated files inherit safe default permissions

## Disclosure Policy

When we receive a security vulnerability report:

1. **Confirmation**: We confirm the vulnerability and assess its impact
2. **Fix development**: We develop and test a fix
3. **Release preparation**: We prepare a security release
4. **Coordinated disclosure**: We work with the reporter on disclosure timing
5. **Public disclosure**: We publish details after users have time to update

## Bug Bounty

We currently do not offer a formal bug bounty program, but we greatly appreciate security researchers who responsibly disclose vulnerabilities. We will:

- Acknowledge your contribution in release notes (if desired)
- Provide public credit for the discovery
- Consider featuring your contribution in our security hall of fame

## Contact

For security-related questions or concerns:

- **Email**: security@schemantic.dev
- **GitHub Security Advisories**: [Create a security advisory](https://github.com/Cstannahill/schemantic/security/advisories/new)

For general questions about Schemantic:

- **GitHub Issues**: [Regular issues](https://github.com/Cstannahill/schemantic/issues)
- **GitHub Discussions**: [Community discussions](https://github.com/Cstannahill/schemantic/discussions)
