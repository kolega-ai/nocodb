# NocoDB Product Context

## What is NocoDB
NocoDB is an open-source no-code database platform that transforms existing databases (MySQL, PostgreSQL, SQL Server, SQLite, MariaDB) into smart spreadsheet interfaces. It allows users to collaborate on data without needing SQL knowledge.

## The Security Problem
The current vulnerability (Vulnerability #56) affects user authentication and security:

### Problem Impact
- **Users Cannot Login**: New users who register through the standard signup flow receive empty `token_version` fields
- **Broken Authentication**: JWT validation fails for these users because the token version check fails
- **Security Risk**: Even if users could login, token invalidation wouldn't work, meaning compromised tokens couldn't be revoked

### User Experience Impact
1. **Registration Flow**: Users can complete signup but cannot login afterward
2. **Authentication Failure**: All JWT-based requests fail with "Token Expired" errors
3. **Account Lockout**: Users are effectively locked out of their newly created accounts

## Business Context

### Why This Matters
- **User Acquisition**: New users cannot successfully use the platform after registration
- **Security Compliance**: Token invalidation is critical for enterprise security requirements
- **Trust**: Authentication failures erode user confidence in the platform

### Affected User Flows
- **Standard Signup**: Primary user registration path is completely broken
- **Self-Service Registration**: Users registering without invites cannot access their accounts
- **Demo/Trial Users**: First-time users cannot complete the onboarding process

## Expected User Experience (After Fix)
1. **Smooth Registration**: Users complete signup with proper security tokens
2. **Immediate Access**: Users can login immediately after registration
3. **Secure Sessions**: Token invalidation works correctly for security
4. **Consistent Experience**: All registration paths work identically from a user perspective

## Security Requirements
- **Token Uniqueness**: Every user must have a unique, random token version
- **Token Invalidation**: Admins/users can revoke tokens when needed
- **Session Management**: Proper session lifecycle management
- **Enterprise Security**: Compliance with enterprise security standards