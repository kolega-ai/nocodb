# NocoDB System Patterns

## Architecture Overview
- NestJS-based backend with dependency injection
- Service-oriented architecture with versioned APIs (v3)
- Modular design with separate services for different concerns
- Storage adapter pattern for file handling

## Error Handling Patterns
- `NcError` utility class for standardized error responses
- Different error types: `unprocessableEntity`, `invalidRequestBody`, `fieldNotFound`, etc.
- Context-aware error handling with user context
- Audit logging for all data operations

## File Attachment System
- Base64 and URL-based file upload support
- File validation (size, type, filename)
- Storage adapter abstraction for different backends
- Thumbnail generation for supported file types
- File reference tracking in database

## Security Patterns
- Context-based authorization
- File size and type validation
- Normalized filename handling to prevent path traversal
- Audit trail for all operations

## Database Patterns
- Model-based database abstraction
- Primary key-based record identification
- JSON column storage for attachment metadata
- Transaction-aware operations

## Security Fix Applied
**CWE-209 Information Disclosure Vulnerability Fixed**

### Issue
The error handling in `appendBase64AttachmentToCellData` method was directly exposing raw error objects in API responses, leaking:
- Absolute file paths
- System usernames  
- Operating system details
- Internal ID structures

### Solution Implemented
Updated the catch block in the base64 attachment processing (lines 293-296) to:
1. Log detailed errors server-side using `console.error()` for debugging
2. Return generic error messages to clients using `NcError.unprocessableEntity()`
3. Prevent information disclosure while maintaining debuggability

### Code Changes
```typescript
// Before (vulnerable):
} catch (error) {
  NcError.unprocessableEntity(
    `Failed to process base64 attachment: ${error}`,
  );
}

// After (secure):
} catch (error) {
  // Log detailed error server-side for debugging
  console.error('Base64 attachment processing failed:', error);

  // Return generic message to client to prevent information disclosure
  NcError.unprocessableEntity('Failed to process base64 attachment');
}
```

This maintains the established security pattern throughout the codebase.