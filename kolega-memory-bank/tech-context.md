# Technical Context - NocoDB

## Technology Stack

### Core Technologies
- **Node.js**: Runtime environment
- **TypeScript**: Primary programming language
- **NestJS**: Backend framework with dependency injection
- **Knex.js**: SQL query builder and database abstraction layer
- **Vue.js**: Frontend framework (not relevant to current security fix)

### Database Support
- **MySQL/MariaDB**: Primary production database (vulnerable)
- **PostgreSQL**: Enterprise database (secure implementation exists)
- **SQLite**: Development/testing database (secure implementation exists)

### Build & Development Tools
- **pnpm**: Package manager
- **Lerna**: Monorepo management
- **TypeScript Compiler**: Type checking and compilation

## Development Environment

### Project Structure
```
packages/nocodb/src/
├── db/                          # Database layer
│   ├── conditionV2.ts          # Filter processing (Vuln #6)
│   ├── formulav2/              # Formula processing
│   │   └── formulaQueryBuilderv2.ts  # Formula queries (Vuln #8)  
│   └── aggregations/           # Database-specific helpers
│       ├── pg.ts              # PostgreSQL functions (secure)
│       └── sqlite3.ts         # SQLite functions (secure)
├── models/                     # Data models
├── helpers/                    # Utility functions
└── cache/                      # Caching layer
```

### Key Files for This Fix

1. **conditionV2.ts** (303-309): User display name filtering vulnerability
2. **formulaQueryBuilderv2.ts** (263-273): Formula user column vulnerability  
3. **aggregations/pg.ts**: Secure PostgreSQL implementation pattern
4. **aggregations/sqlite3.ts**: Secure SQLite implementation pattern

## Database Query Patterns

### Current Knex.js Usage Patterns

#### Secure Pattern (PostgreSQL/SQLite)
```typescript
// Uses dedicated helper functions that maintain parameterization
const result = replaceDelimitedWithKeyValuePg({
  knex,
  needleColumn: columnName,
  stack: users.map(user => ({ key: user.id, value: user.email }))
});
```

#### Vulnerable Pattern (MySQL)
```typescript
// Converts parameterized queries to strings, then re-injects
const result = users.reduce((acc, user) => {
  const qb = knex.raw(`REPLACE(${acc}, ?, ?)`, [user.id, user.email]);
  return qb.toQuery(); // PROBLEM: String conversion
}, knex.raw(`??`, [columnName]).toQuery());
```

### Database Client Detection
```typescript
if (knex.clientType() === 'pg') {
  // PostgreSQL logic
} else if (knex.clientType() === 'sqlite3') {
  // SQLite logic  
} else {
  // MySQL logic (currently vulnerable)
}
```

## Testing Strategy

### Current Test Structure
- Tests located in `/tests` directory
- Database-specific test configurations
- Integration tests for query functionality

### Testing Commands
```bash
# Run tests
pnpm test

# Run specific database tests  
pnpm test:mysql
pnpm test:pg
pnpm test:sqlite

# Development server
pnpm dev
```

## Security Context

### Current Protection Layers

1. **Knex.js Parameterization**: Automatically escapes parameters when used correctly
2. **Input Sanitization**: Basic sanitization in `~/helpers/sqlSanitize`
3. **Authentication**: User must be authenticated to access bases
4. **Base-level Authorization**: Users must have access to specific bases

### Attack Vector Analysis

**Prerequisites for Exploitation:**
1. Attacker must be authenticated user with base access
2. Attacker sets malicious display name or email
3. Another user creates filter using User/CreatedBy/LastModifiedBy columns
4. Filter uses 'like' or 'nlike' operators
5. System uses MySQL database (PostgreSQL/SQLite are safe)

**Impact Scope:**
- Complete database access within the base
- Potential data exfiltration or destruction
- Limited to MySQL installations only

## Development Guidelines

### Code Style
- TypeScript with strict typing
- ESLint and Prettier for formatting
- Async/await preferred over Promises
- Comprehensive error handling

### Security Patterns to Follow
- Always maintain parameterization throughout query construction
- Never use `.toQuery()` followed by string concatenation
- Validate all user inputs before database operations
- Use database-specific helper functions for complex operations

### Debugging Tools
- NestJS Logger for application logging
- Database query logging via Knex.js
- Error extraction and classification system

## Deployment Context

### Production Considerations
- Multiple database support required
- Zero-downtime deployment expectations
- Backwards compatibility with existing bases
- Performance requirements for large datasets

### Environment Variables
- Database connection strings
- Security configuration
- Feature flags for experimental features

## Dependencies

### Critical Dependencies
- `knex`: Query builder - version must support all required databases
- `@nestjs/core`: Framework dependency
- Database drivers: `mysql2`, `pg`, `sqlite3`

### Development Dependencies  
- TypeScript compiler and type definitions
- Testing framework and utilities
- Linting and formatting tools

## Integration Points

### External Integrations
- Authentication providers
- Cloud storage services
- Email services
- Webhook systems

### Internal Integration
- Caching layer coordination
- Real-time updates via WebSockets
- Background job processing