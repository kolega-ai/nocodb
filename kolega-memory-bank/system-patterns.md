# System Patterns

## Database Client Pattern
NocoDB uses an adapter pattern for different database types:
- Base class `KnexClient` provides common functionality
- Database-specific clients (OracleClient, etc.) extend base class
- Each client implements database-specific operations

## Query Building Approach
- **Current (Vulnerable)**: String concatenation for complex queries
- **Target**: Knex parameterized queries + Oracle bind variables
- **Fallback**: Manual parameterization with validation

## Security Patterns
**Current Anti-pattern**:
```typescript
const query = `SELECT * FROM table WHERE name = '${userInput}'`;
```

**Secure Pattern**:
```typescript
const query = this.raw('SELECT * FROM table WHERE name = ?', [userInput]);
// OR Oracle-specific
const query = this.raw('SELECT * FROM table WHERE name = :1', [userInput]);
```

## Error Handling
- Uses `Result` class for operation results
- Logging with Debug utility
- Try-catch blocks around database operations

## Method Signatures
Most methods follow pattern:
- Accept `args` object with parameters
- Return `Result` object
- Use async/await
- Include function name logging

## Critical Vulnerable Patterns Identified
1. **User/Database Name Queries**: Direct substitution of connection config
2. **Schema Introspection**: Table/column names in WHERE clauses  
3. **Object Names**: Function/procedure/view/trigger names in queries
4. **System Catalog Access**: Queries against Oracle system tables

## Implemented Security Fixes

### DML Queries (SELECT/INSERT/UPDATE/DELETE)
**Pattern Applied**: Parameterized queries with Knex bind variables

**Before (Vulnerable)**:
```typescript
const query = `SELECT * FROM all_tables WHERE owner = '${this.connectionConfig.connection.user}'`;
await this.raw(query);
```

**After (Secure)**:
```typescript
const query = 'SELECT * FROM all_tables WHERE owner = ?';
const result = await this.raw(query, [this.connectionConfig.connection.user]);
```

**Fixed Methods**: 
- hasTable, hasDatabase, tableList, columnList, indexList
- constraintList, relationList, triggerList, functionList
- procedureList, viewList, functionRead, procedureRead, viewRead, triggerRead

### DDL Queries (CREATE/ALTER/DROP)
**Pattern Applied**: Identifier validation + quoted identifiers

**Added Validation Helper**:
```typescript
private validateOracleIdentifier(identifier: string, name: string = 'identifier'): string {
  // Validates Oracle identifier rules and prevents injection
  const validIdentifierRegex = /^[A-Za-z][A-Za-z0-9_$#]{0,127}$/;
  if (!validIdentifierRegex.test(cleaned)) {
    throw new Error(`Invalid ${name}: must start with letter and contain only alphanumeric, _, $, or #`);
  }
  return cleaned.toUpperCase();
}
```

**Before (Vulnerable)**:
```typescript
await this.raw(`CREATE USER ${user} IDENTIFIED BY ${password}`);
```

**After (Secure)**:
```typescript
const validatedUser = this.validateOracleIdentifier(user, 'user');
await this.raw(`CREATE USER "${validatedUser}" IDENTIFIED BY "${validatedUser}"`);
```

**Fixed Methods**:
- createDatabaseIfNotExists, dropDatabase (user operations)
- triggerCreate, triggerUpdate, triggerDelete
- functionCreate, functionUpdate, functionDelete  
- procedureCreate, procedureUpdate, procedureDelete
- viewCreate, viewUpdate, viewDelete
- schemaCreate, schemaDelete

### Session Management
**Special Case**: Session killing in dropDatabase
- Added numeric validation for SID and SERIAL# parameters
- Prevented injection through session identifier validation

### Vulnerability Summary
**Total Vulnerabilities Fixed**: 25+ SQL injection points across:
- Lines 169, 325, 345, 399: User/database/table name queries
- Lines 538, 563, 637, 683-685: Column/constraint metadata queries  
- Lines 755, 808, 862, 909, 955, 995, 1035, 1081, 1123: DDL operations
- Additional DDL operations in trigger/function/procedure/view management