# NocoDB System Patterns & Architecture

## Authentication Architecture

NocoDB implements a multi-layer authentication system with multiple strategies:

### Authentication Strategies
1. **JWT Strategy** (`strategies/jwt.strategy.ts`)
   - Primary user authentication via `xc-auth` header
   - Includes token version validation for replay attack prevention
   - Returns user object with `isAuthorized: true` flag

2. **API Token Strategy** (`strategies/authtoken.strategy.ts`)
   - API-based authentication via `xc-token` header or `Authorization: Bearer` token
   - Used for programmatic access

3. **Global Guard Pattern** (`guards/global/global.guard.ts`)
   - Orchestrates authentication chain with fallback strategies
   - Uses `extractBoolVal()` helper to handle Observable/Promise/boolean results
   - Implements graceful degradation for guest access

### Helper Utilities
- **Token Extraction**: `getApiTokenFromHeader({ headers })` 
  - Prefers `xc-token` header
  - Falls back to `Authorization: Bearer <token>`
- **Result Extraction**: `extractBoolVal()` handles guard results consistently

## WebSocket Security Implementation

### Original Vulnerability
```typescript
try {
  const context = new ExecutionContextHost([socket.handshake as any]);
  const guard = new (AuthGuard('jwt'))(context);
  await guard.canActivate(context);
} catch {} // ❌ Empty catch - silently ignores ALL errors

next(); // ❌ Always continues regardless of auth status
```

### Fixed Implementation
```typescript
private async authenticateWebSocket(socket: Socket, next: (err?: Error) => void) {
  try {
    const handshake = socket.handshake as any;
    const context = new ExecutionContextHost([handshake]);
    let isAuthenticated = false;

    // JWT authentication (xc-auth header)
    if (handshake.headers?.['xc-auth']) {
      const guard = new (AuthGuard('jwt'))(context);
      const result = await this.extractBoolVal(guard.canActivate(context));
      if (result) isAuthenticated = true;
    }

    // API token fallback (xc-token or Bearer)
    if (!isAuthenticated && getApiTokenFromHeader({ headers: handshake.headers })) {
      const guard = new (AuthGuard('authtoken'))(context);
      const result = await this.extractBoolVal(guard.canActivate(context));
      if (result) isAuthenticated = true;
    }

    // Require authentication for WebSocket connections
    if (isAuthenticated) {
      next();
    } else {
      next(new Error('Authentication required'));
    }
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}
```

## Key Security Principles Applied

1. **Explicit Authentication Check**: No connection allowed without valid credentials
2. **Error Propagation**: Authentication failures properly communicated to client
3. **Multi-Strategy Support**: Both JWT and API token authentication supported
4. **Consistent Patterns**: Follows same authentication flow as HTTP routes
5. **Proper Logging**: Security events logged for monitoring
6. **Graceful Error Handling**: Specific error messages for different failure cases

## WebSocket Configuration Updates

- Added `xc-token` and `authorization` to `allowedHeaders` in CORS configuration
- Enables both JWT and API token authentication over WebSocket connections