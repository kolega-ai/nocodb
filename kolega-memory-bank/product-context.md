# Product Context

## NocoDB Overview
NocoDB is an open-source **Airtable alternative** that transforms databases into smart spreadsheets with REST APIs, webhooks, and various integrations.

## Attachment Upload Feature
- **Purpose**: Allow users to upload files as attachments to database records
- **Methods**: 
  - Direct file upload (base64)
  - URL-based upload (user provides URL, server downloads and stores)
- **Use Cases**: Document management, image galleries, file attachments

## URL Upload Vulnerability Impact
The SSRF vulnerability in URL-based attachment uploads allows **authenticated users** to:
- **Internal network reconnaissance** - scan internal services
- **Cloud metadata access** - potentially access AWS/GCS metadata endpoints
- **Local file access** - via file:// protocol
- **Firewall bypass** - access normally restricted resources

## Business Impact
- **Critical security risk** - complete infrastructure compromise possible
- **Compliance violations** - may violate security policies
- **Trust issues** - affects enterprise adoption
- **Attack surface** - authenticated users can exploit (not just admin)

## User Experience Requirements
- **Transparent fix** - no functional changes for legitimate users
- **Error handling** - clear feedback when URLs are blocked
- **Performance** - minimal impact on upload speed
- **Compatibility** - works with all existing attachment workflows