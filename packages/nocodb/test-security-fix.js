// Quick verification test for path traversal security fix
const path = require('path');
const { validateAndNormaliseLocalPath } = require('./src/helpers/attachmentHelpers');

// Test cases that should be blocked
const maliciousPaths = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  'uploads/../../../secret.txt',
  'file.txt\x00/../../../etc/passwd',
  '%2e%2e%2fsecret.txt',
  '%252e%252e%252fsecret.txt',
  '\uff0e\uff0e/secret.txt',
  '\\\\server\\share\\file.txt',
  'C:\\Windows\\System32\\config\\SAM',
  'uploads/con',
  'file.txt:hidden.txt',
  '..\u200b./secret.txt',
];

// Test cases that should be allowed
const validPaths = [
  'uploads/file.txt',
  'images/photo.jpg',
  'documents/readme.md',
  'uploads/subfolder/file.txt',
];

console.log('Testing security fix for path traversal vulnerability...\n');

// Test malicious paths (should all throw errors)
console.log('Testing malicious paths (should be blocked):');
let blockedCount = 0;
for (const maliciousPath of maliciousPaths) {
  try {
    validateAndNormaliseLocalPath(maliciousPath);
    console.log(`❌ SECURITY ISSUE: ${maliciousPath} was NOT blocked!`);
  } catch (error) {
    console.log(`✅ Blocked: ${maliciousPath} - ${error.message}`);
    blockedCount++;
  }
}

console.log(`\nBlocked ${blockedCount}/${maliciousPaths.length} malicious paths\n`);

// Test valid paths (should all work)
console.log('Testing valid paths (should be allowed):');
let allowedCount = 0;
for (const validPath of validPaths) {
  try {
    const result = validateAndNormaliseLocalPath(validPath);
    console.log(`✅ Allowed: ${validPath} -> ${result}`);
    allowedCount++;
  } catch (error) {
    console.log(`❌ ISSUE: Valid path ${validPath} was blocked: ${error.message}`);
  }
}

console.log(`\nAllowed ${allowedCount}/${validPaths.length} valid paths`);

if (blockedCount === maliciousPaths.length && allowedCount === validPaths.length) {
  console.log('\n🎉 Security fix appears to be working correctly!');
} else {
  console.log('\n⚠️  Security fix needs attention - some tests failed.');
}