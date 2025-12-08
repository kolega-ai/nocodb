# NocoDB System Architecture & Security Patterns

## Authentication System Architecture

### JWT Token Strategy
- **Location**: `packages/nocodb/src/strategies/jwt.strategy.ts`
- **Purpose**: Validates JWT tokens and verifies token_version for security
- **Key Logic**: Rejects tokens when `token_version` doesn't match between user record and JWT payload

### Token Versioning Security Pattern
- **Function**: `randomTokenString()` generates 80-character cryptographically secure hex strings
- **Purpose**: Enables token invalidation by changing user's token_version
- **Usage**: Updated during logout, password reset, and security-critical operations
- **Import**: Available from `~/helpers/stringHelpers`

### User Registration Paths
1. **Vulnerable Path**: Standard signup via `/auth/user/signup` 
   - File: `packages/nocodb/src/modules/auth/auth.service.ts`
   - Method: `registerNewUserIfAllowed()`
   - Issue: Sets empty token_version instead of random value

2. **Secure Paths**: All other registration flows properly use `randomTokenString()`
   - Organization user invites (`org-users.service.ts`)
   - Base user invites (`base-users.service.ts`) 
   - Admin initialization (`initAdminFromEnv.ts`)

## Critical Security Components

### JWT Validation Logic
```typescript
if (
  !user.token_version ||
  !jwtPayload.token_version ||
  user.token_version !== jwtPayload.token_version
) {
  throw new Error('Token Expired. Please login again.');
}
```

### Token Invalidation Mechanism
- **Trigger**: User logout, password reset, role changes
- **Method**: Generate new `token_version` using `randomTokenString()`
- **Effect**: All existing JWT tokens become invalid immediately

## Monorepo Structure
- **Main Backend**: `packages/nocodb/`
- **Auth Module**: `packages/nocodb/src/modules/auth/`
- **Services**: `packages/nocodb/src/services/`
- **Strategies**: `packages/nocodb/src/strategies/`