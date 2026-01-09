# NocoDB Technical Context

## Technologies Used
- **Backend Framework**: NestJS with TypeScript
- **Database**: Multi-database support with abstraction layer
- **File Storage**: Pluggable storage adapters
- **Package Manager**: pnpm (monorepo setup)
- **Testing**: Jest-based testing suite
- **Build System**: Node.js with TypeScript compilation

## Development Setup
- Monorepo structure with `packages/` directory
- Main backend code in `packages/nocodb/`
- Services organized by version (`src/services/v3/`)
- Shared utilities and helpers in dedicated directories

## Key Dependencies
- `nanoid` - ID generation
- `axios` - HTTP client for URL-based uploads
- `slash` - Path normalization
- `nocodb-sdk` - Core SDK functionality

## File Structure
```
packages/nocodb/src/
├── services/v3/           # Version 3 API services
├── helpers/               # Utility functions
├── models/                # Database models
├── utils/                 # General utilities
└── constants.ts           # Application constants
```

## Error Handling Infrastructure
- `NcError` class provides standardized error responses
- Context-aware error handling
- Different error types for different scenarios
- Integration with audit system

## Security Infrastructure
- File validation utilities
- Filename normalization functions
- Storage adapter security features
- Audit logging system

## Common Commands
- `pnpm install` - Install dependencies
- `pnpm build` - Build the project
- `pnpm test` - Run tests
- `pnpm lint` - Code linting