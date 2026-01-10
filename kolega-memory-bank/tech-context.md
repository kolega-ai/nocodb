# NocoDB Technical Context

## Technology Stack
- **Backend**: Node.js with TypeScript
- **Framework**: Likely NestJS or Express (based on service patterns)
- **Database**: Multi-database support (MySQL, PostgreSQL, SQL Server, SQLite, MariaDB)
- **Authentication**: JWT-based with custom token versioning

## Development Environment
- **Monorepo Structure**: Uses packages/ directory structure
- **Path Aliases**: Uses `~/` alias for internal imports (e.g., `~/helpers/stringHelpers`)
- **TypeScript**: Full TypeScript implementation with proper typing

## Key Dependencies & Utilities

### String Helpers
- **Location**: `~/helpers/stringHelpers`
- **Key Function**: `randomTokenString()` - generates 80-char cryptographically secure hex strings
- **Usage**: Token versioning, secure random values for authentication

### Authentication Components
- **JWT Strategy**: Custom JWT validation with token versioning
- **Auth Service**: Main authentication logic and user registration
- **User Services**: Various user management and invitation flows

## Security Infrastructure

### Token Version System
- **Purpose**: Enable selective token invalidation
- **Implementation**: Random 80-character hex strings
- **Storage**: User database records
- **Validation**: JWT strategy checks token_version match

### User Registration Flows
- Multiple paths with different security implementations
- Standard signup, org invites, base invites, admin init
- Each should use proper token versioning

## File Structure Patterns
```
packages/nocodb/src/
├── modules/auth/
│   └── auth.service.ts (VULNERABILITY LOCATION)
├── services/
│   ├── users/users.service.ts
│   ├── org-users.service.ts
│   └── base-users.service.ts
├── strategies/
│   └── jwt.strategy.ts
└── helpers/
    └── stringHelpers.ts
```

## Critical Security Requirements
- All user registrations must have non-empty, random token_version
- JWT tokens must be validated against current token_version
- Token invalidation must work for all user creation paths
- No security-critical fields should ever be left empty or hardcoded