# Contributing to Sync-Type

Thank you for your interest in contributing to Sync-Type! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 16+ (recommended: Node.js 18+)
- npm 7+ or yarn
- Git
- Basic knowledge of TypeScript and OpenAPI

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/sync-type.git
   cd sync-type
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Run Tests**

   ```bash
   npm test
   ```

5. **Test with Local Applications**

   ```bash
   # Start the FastAPI test server
   cd local-test/fast-api-app
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python start.py

   # In another terminal, test type generation
   cd ../../
   npx sync-type generate --url http://localhost:8000/openapi.json --output ./test-output
   ```

## Types of Contributions

### 🐛 Bug Fixes

- Fix issues listed in GitHub Issues
- Include tests that demonstrate the fix
- Update documentation if behavior changes

### ✨ New Features

- Discuss major features in GitHub Discussions first
- Follow the existing architecture patterns
- Include comprehensive tests
- Update documentation and examples

### 📚 Documentation

- Improve existing documentation
- Add examples and tutorials
- Fix typos and clarify confusing sections
- Translate documentation (future)

### 🧪 Tests

- Add test coverage for untested code
- Create integration tests for real-world scenarios
- Add performance benchmarks

### 🔌 Plugins

- Create new generators for different output formats
- Add support for new frameworks
- Extend the plugin API

## Development Guidelines

### Code Style

- Follow the existing TypeScript style
- Use ESLint configuration: `npm run lint`
- Fix linting issues: `npm run lint:fix`
- Format code consistently

### Architecture Principles

1. **Modular Design**: Keep components separate and focused
2. **Plugin Architecture**: New functionality should be pluggable
3. **Type Safety**: Maintain strong typing throughout
4. **Error Handling**: Provide clear, actionable error messages
5. **Performance**: Consider performance implications of changes

### Testing Requirements

- **Unit Tests**: All new functions and classes
- **Integration Tests**: End-to-end scenarios with real schemas
- **Performance Tests**: For changes affecting generation speed
- **Error Cases**: Test error conditions and edge cases

### Documentation Standards

- **Code Comments**: Complex logic should be documented
- **API Documentation**: Public methods need JSDoc comments
- **User Documentation**: Update guides for user-facing changes
- **Examples**: Include practical examples

## Submission Process

### Pull Request Guidelines

1. **Branch Naming**

   ```bash
   git checkout -b feature/short-description
   git checkout -b fix/issue-number-short-description
   git checkout -b docs/area-being-improved
   ```

2. **Commit Messages**
   Use conventional commits format:

   ```
   type(scope): description

   feat(generators): add support for enum descriptions
   fix(cli): handle missing output directory
   docs(readme): update installation instructions
   test(integration): add FastAPI authentication tests
   ```

3. **Pull Request Template**
   - Clear description of changes
   - Link to related issues
   - Testing checklist completed
   - Documentation updated
   - Breaking changes noted

### Code Review Process

1. Automated checks must pass (CI/CD, tests, linting)
2. At least one maintainer review required
3. Address review feedback promptly
4. Squash commits before merging (if requested)

## Project Structure

```
sync-type/
├── src/                      # Source code
│   ├── cli/                  # Command-line interface
│   ├── core/                 # Core generation logic
│   ├── generators/           # Type generators
│   ├── parsers/              # Schema parsers
│   ├── plugins/              # Plugin system
│   └── types/                # TypeScript type definitions
├── docs/                     # Documentation
├── local-test/              # Test applications
│   ├── fast-api-app/        # FastAPI test server
│   └── react-app/           # React test client
├── __tests__/               # Test files
└── dist/                    # Built output
```

### Key Components

- **Core**: Main TypeSync class and configuration
- **Generators**: Convert schema objects to TypeScript code
- **Parsers**: Parse OpenAPI schemas into internal format
- **Plugins**: Extensible system for custom functionality
- **CLI**: Command-line interface and commands

## Testing Strategy

### Test Categories

1. **Unit Tests**: `src/__tests__/*.test.ts`
2. **Integration Tests**: `src/__tests__/integration/*.test.ts`
3. **CLI Tests**: Test command-line functionality
4. **Performance Tests**: `.github/workflows/performance.yml`

### Test Data

- Real-world OpenAPI schemas in `local-test/`
- Generated test schemas for edge cases
- Large schemas for performance testing

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Integration tests only
npm test -- --testPathPattern=integration

# Performance tests
npm run test:perf  # If implemented
```

## Release Process

### Version Management

- Follow Semantic Versioning (semver)
- Update CHANGELOG.md with notable changes
- Tag releases in Git

### Release Checklist

1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Build and test distribution
5. Create GitHub release
6. Publish to npm (automated via CI/CD)

## Getting Help

### For Contributors

- **General Questions**: GitHub Discussions
- **Technical Issues**: GitHub Issues
- **Real-time Chat**: Discord (link in README)
- **Mentorship**: Tag @maintainers in discussions

### For Maintainers

- **Code Reviews**: Use GitHub review tools
- **Release Management**: Follow documented process
- **Community Management**: Foster welcoming environment

## Recognition

Contributors are recognized in:

- GitHub contributors list
- CHANGELOG.md acknowledgments
- Annual contributor highlights

## Resources

### Learning

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Tools

- [VS Code](https://code.visualstudio.com/) with TypeScript extension
- [Postman](https://www.postman.com/) for API testing
- [OpenAPI Generator](https://openapi-generator.tech/) for comparison

Thank you for contributing to Sync-Type! 🚀
