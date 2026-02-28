# Product Context - NocoDB Security Fix

## Problem Statement

NocoDB's core database query construction layer contains critical SQL injection vulnerabilities that could allow complete database compromise. These vulnerabilities exist in the user filtering and formula processing systems - core functionality that powers the spreadsheet-like interface users rely on daily.

## Why This Matters

### User Trust & Data Safety
- NocoDB handles sensitive business data for thousands of organizations
- SQL injection attacks could expose or destroy years of user work
- Even limited exploitation could breach customer confidentiality

### Platform Integrity 
- Core query systems affect every database operation
- Vulnerabilities undermine the entire no-code platform value proposition
- Security issues in open-source projects spread rapidly across deployments

### Business Continuity
- Organizations depend on NocoDB for daily operations
- Security incidents could force emergency migrations
- Reputation damage affects adoption of open-source alternatives

## How The System Should Work

### Current Vulnerable Behavior
1. User sets display name with malicious SQL payload
2. System creates parameterized query with user data
3. Query gets converted to raw SQL string using `.toQuery()`
4. Raw string gets concatenated into larger SQL template
5. Final result injected into `knex.raw()` without parameterization
6. When another user filters data, SQL injection executes

### Desired Secure Behavior
1. User data enters query construction system
2. All values remain properly parameterized throughout processing
3. Query composition uses Knex's safe methods exclusively
4. No string concatenation or `.toQuery()` conversion occurs
5. Final query maintains parameterization integrity
6. Database receives properly escaped, injection-proof SQL

## User Experience Goals

### Transparency
- Users should see no functional changes in filtering behavior
- Query performance should remain equivalent or improve
- All existing filter types and operators continue working

### Reliability
- No breaking changes to existing bases or views
- Consistent behavior across MySQL, PostgreSQL, and SQLite
- Seamless deployment without user intervention required

### Security
- Complete elimination of SQL injection attack vectors
- Robust protection even with malicious user-generated content
- Future-proof patterns that prevent regression of similar vulnerabilities