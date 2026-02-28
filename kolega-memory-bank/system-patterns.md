# System Architecture & Patterns - NocoDB

## Architecture Overview

NocoDB is a Node.js/TypeScript application that provides a no-code database interface. The core architecture follows a layered pattern:

- **Frontend**: Vue.js application (`nc-gui`)
- **Backend**: NestJS API server (`nocodb`) 
- **Database Layer**: Knex.js query builder supporting MySQL, PostgreSQL, SQLite
- **Models**: Active record pattern for data access

## Query Construction Patterns

### Current Vulnerable Pattern (TO BE ELIMINATED)

```typescript
// DANGEROUS - Double wrapping pattern
const finalStatement = users.reduce((acc, user) => {
  const qb = knex.raw(`REPLACE(${acc}, ?, ?)`, [
    user.id,
    user.display_name || user.email  // User-controlled data
  ]);
  return qb.toQuery(); // Converts parameterized query to string
}, knex.raw(`??`, [column.column_name]).toQuery());

// Re-inject the string into raw SQL - VULNERABLE
qb = qb.where(knex.raw(`(${finalStatement}) ilike ?`, [val]));
```

**Why This Is Dangerous:**
1. `qb.toQuery()` converts parameterized queries to raw SQL strings
2. User data gets embedded into the string during conversion
3. String concatenation destroys parameterization protection
4. Final `knex.raw()` injection treats user data as part of SQL syntax

### Secure Pattern (GOAL)

PostgreSQL and SQLite already use this secure approach:

```typescript
// SECURE - Maintain parameterization throughout
finalStatement = replaceDelimitedWithKeyValuePg({
  knex,
  needleColumn: column.column_name,
  stack: users.map((user) => ({
    key: user.id,
    value: user.display_name || user.email  // Stays parameterized
  }))
});
```

## Component Architecture

### Key Modules

1. **conditionV2.ts**: Filter processing for database queries
   - Handles all WHERE clause construction
   - Processes user/display name filtering (Vulnerability #6)

2. **formulaQueryBuilderv2.ts**: Formula column processing  
   - Builds complex calculated field queries
   - Processes user column references (Vulnerability #8)

3. **Base Model SQL v2**: Core query execution layer
   - Interfaces with Knex.js
   - Provides database abstraction

### Database Clients

- **MySQL**: Uses vulnerable `.toQuery()` pattern (needs fixing)
- **PostgreSQL**: Uses safe `replaceDelimitedWithKeyValuePg()` 
- **SQLite**: Uses safe `replaceDelimitedWithKeyValueSqlite3()`

## Security Patterns

### Current Protection Mechanisms

1. **Input Sanitization**: Basic sanitization in `sqlSanitize.js`
2. **Parameterized Queries**: Knex.js provides protection when used correctly
3. **User Context**: Authentication and base-level access controls

### Missing/Broken Protection

1. **Query String Conversion**: `.toQuery()` breaks parameterization
2. **String Concatenation**: Raw SQL building defeats protection
3. **User Data in SQL**: Display names/emails treated as trusted data

## Fix Architecture

### Strategy

1. **Eliminate .toQuery() Usage**: Replace with composition-based approach
2. **Extend PostgreSQL/SQLite Pattern**: Create MySQL equivalent functions
3. **Maintain Query Structure**: Preserve existing functionality while fixing security
4. **Cross-Database Compatibility**: Ensure consistent behavior

### Implementation Approach

```typescript
// Target secure pattern for MySQL
function replaceDelimitedWithKeyValueMySQL({ knex, needleColumn, stack }) {
  // Build parameterized query without string conversion
  // Keep all user values as parameters throughout
}
```

## Critical Implementation Paths

### Vulnerability #6 (conditionV2.ts)
**Path**: User filtering → Display name processing → MySQL query building
**Fix Point**: Lines 303-309 in the MySQL client type branch

### Vulnerability #8 (formulaQueryBuilderv2.ts)  
**Path**: Formula evaluation → User column processing → MySQL query building
**Fix Point**: Lines 263-273 in the User/CreatedBy/LastModifiedBy case

## Dependencies & Constraints

### External Dependencies
- **Knex.js**: Query builder library - must work within its patterns
- **Database Clients**: MySQL, PostgreSQL, SQLite drivers
- **NestJS**: Framework patterns for dependency injection

### Internal Dependencies
- **BaseUser.getUsersList()**: Source of user data for replacements
- **getColumnName()**: Column name resolution
- **Model/Column classes**: ORM layer interactions

### Backwards Compatibility
- API contract must remain unchanged
- Query results must be identical
- Performance cannot degrade significantly