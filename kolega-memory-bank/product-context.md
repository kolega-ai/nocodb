# Product Context

## What NocoDB Is
NocoDB transforms databases into smart spreadsheets, providing a no-code interface that makes database management accessible to everyone. It's an open-source alternative to Airtable that can connect to existing databases.

## Problems It Solves
1. **Database Complexity**: Makes databases as easy to use as spreadsheets
2. **Vendor Lock-in**: Open source alternative to proprietary solutions
3. **Accessibility**: Brings powerful database capabilities to non-technical users
4. **Multi-database Support**: Unified interface across different database types

## User Experience Goals
- **Familiar Interface**: Spreadsheet-like UI that users already know
- **Powerful Features**: Advanced database operations without SQL knowledge
- **Collaboration**: Multiple users working on the same data
- **Flexibility**: Support for multiple data types and relationships

## Security Requirements
- **Data Protection**: User data must be protected from SQL injection attacks
- **Multi-tenancy**: Secure isolation between different users/organizations
- **Access Control**: Fine-grained permissions and authentication
- **Audit Trail**: Logging of operations for security and compliance

## Current Security Issue Impact
**SQL Injection Vulnerabilities in Oracle Client**:

**Risk to Users**:
- Malicious admins in multi-tenant setups could access other tenants' data
- Database compromise leading to data theft
- Privilege escalation to DBA level access
- Complete database takeover

**Business Impact**:
- Loss of user trust
- Potential data breach notifications
- Compliance violations (GDPR, etc.)
- Reputation damage to open source project

**Urgency**: CRITICAL - These vulnerabilities affect the core database abstraction layer that all Oracle database operations depend on.

## Quality Standards
- **Reliability**: Database operations must be bulletproof
- **Performance**: Efficient queries that scale with data growth
- **Security**: Secure by default, parameterized queries, input validation
- **Maintainability**: Clean, readable code following established patterns