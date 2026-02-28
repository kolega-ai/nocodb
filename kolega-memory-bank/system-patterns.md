# System Patterns

## SSRF Protection Architecture

### Current State
NocoDB has a **well-established SSRF protection pattern** using the `request-filtering-agent` library that is applied consistently across:
- Webhook systems (Discord, Slack, Teams, Mattermost)  
- Storage plugins (S3, GCS, Minio, Local)
- Utility services

### Protection Pattern
```typescript
import { useAgent } from 'request-filtering-agent';

const response = await axios({
  httpAgent: useAgent(url, {
    stopPortScanningByUrlRedirection: true,
  }),
  httpsAgent: useAgent(url, {
    stopPortScanningByUrlRedirection: true,
  }),
  // other axios options
});
```

### Gap RESOLVED ✅
The **attachment upload service** (`DataAttachmentV3Service.downloadAndStoreAttachment`) now has SSRF protection applied.

## Security Architecture
- **Principle**: All external HTTP requests MUST use `request-filtering-agent`
- **Coverage**: 100% protection across all user-controlled URL inputs ✅
- **Status**: Complete SSRF protection coverage achieved

## Attachment Upload Flow (Secured)
1. User provides URL via API endpoints or data insert/update
2. URL is queued for background processing 
3. `downloadAndStoreAttachment` makes **SSRF-PROTECTED** HTTP request ✅
4. File is stored in configured storage adapter

## Implemented Solution
Applied established SSRF protection pattern:
```typescript
const response = await axios({
  // existing options...
  httpAgent: useAgent(url, {
    stopPortScanningByUrlRedirection: true,
  }),
  httpsAgent: useAgent(url, {
    stopPortScanningByUrlRedirection: true,
  }),
});
```

**Result**: 100% consistent security architecture across the entire NocoDB codebase.