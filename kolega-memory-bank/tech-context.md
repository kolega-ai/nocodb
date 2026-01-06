# Technical Context

## Technology Stack
- **Backend**: Node.js, TypeScript
- **Database Support**: Oracle, PostgreSQL, MySQL, SQLite, and more
- **Query Builder**: Knex.js
- **Deployment**: Docker, binary distributions
- **License**: AGPLv3

## Project Structure
```
packages/
  nocodb/
    src/
      db/
        sql-client/
          lib/
            oracle/
              OracleClient.ts  # VULNERABLE FILE
            KnexClient.ts      # Base class
```

## Development Environment
- Package manager: pnpm
- Monorepo structure with lerna
- Uses workspace configuration

## Oracle Client Architecture
- Extends `KnexClient` base class
- Provides Oracle-specific database operations
- Implements schema introspection
- Handles table/column operations
- Supports triggers, functions, procedures, views

## Key Dependencies
- `knex` - SQL query builder
- Oracle database driver integration
- TypeScript for type safety

## Security Context
**Current Issue**: SQL Injection via string concatenation
**Required Fix**: Replace with parameterized queries
- Oracle bind variables (`:1`, `:2`, etc.)
- Knex parameterization
- Input validation and sanitization

## Useful Commands
- `pnpm install` - Install dependencies
- `pnpm build` - Build project
- Development server and testing commands need investigation