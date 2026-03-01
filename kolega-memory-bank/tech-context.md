# Technical Context - NocoDB WebSocket Security

## Technology Stack
- **Backend Framework**: NestJS with TypeScript
- **WebSocket Library**: Socket.IO
- **Authentication**: 
  - JWT tokens via `xc-auth` header
  - API tokens via `xc-token` header or Bearer tokens
  - Multiple authentication strategies (JWT, API token, Base View, Basic)

## Authentication Architecture

### Authentication Strategies
1. **JWT Strategy** (`strategies/jwt.strategy.ts`)
   - Primary user authentication
   - Uses `xc-auth` header
   - Token validation with replay attack prevention

2. **API Token Strategy** (`strategies/authtoken.strategy.ts`) 
   - API authentication
   - Uses `xc-token` header or Bearer token

3. **Global Guard** (`guards/global/global.guard.ts`)
   - Orchestrates authentication chain
   - Handles fallback between strategies
   - Provides guest access when appropriate

### Key Authentication Patterns
- Token extraction: `getApiTokenFromHeader({ headers })`
- Error handling: Specific error messages for token expiry
- Context creation: `ExecutionContextHost([request])`
- Guard instantiation: `new (AuthGuard('jwt'))(context)`

## WebSocket Configuration
```typescript
@WebSocketGateway({
  cors: {
    origin: '*',
    allowedHeaders: ['xc-auth'],
    credentials: true,
  },
  namespace,
})
```

## Current Vulnerability
- Empty catch block in WebSocket middleware
- No authentication validation before calling next()
- Allows unauthenticated WebSocket connections

## Required Dependencies
```typescript
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { getApiTokenFromHeader } from '~/helpers';
```