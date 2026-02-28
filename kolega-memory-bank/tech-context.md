# Tech Context

## Technologies Used
- **Node.js** with **TypeScript** 
- **NestJS** framework for dependency injection and modular architecture
- **axios** for HTTP requests
- **request-filtering-agent** package for SSRF protection (version 1.1.2)

## SSRF Protection Pattern
NocoDB uses the `request-filtering-agent` package consistently throughout the codebase for SSRF protection:

```typescript
import { useAgent } from 'request-filtering-agent';

// Standard pattern for axios requests
await axios({
  method: 'GET',
  url: url,
  httpAgent: useAgent(url, {
    stopPortScanningByUrlRedirection: true,
  }),
  httpsAgent: useAgent(url, {
    stopPortScanningByUrlRedirection: true,
  }),
  // other options...
});
```

## Current Usage Locations
- **Webhook notifications**: Discord, Slack, Teams, Mattermost plugins
- **Storage plugins**: GenericS3, GCS, Minio, Local storage
- **Utils service**: Various utility HTTP requests
- **Webhook invoker**: Main webhook invocation logic

## Security Constants
- `NC_ATTACHMENT_URL_MAX_REDIRECT = 3` - Maximum redirects allowed
- `NC_ATTACHMENT_FIELD_SIZE = 20MB` - Maximum attachment size

## File Structure
- Services are in `packages/nocodb/src/services/v3/`
- Security vulnerabilities typically involve user-controlled URLs in HTTP requests