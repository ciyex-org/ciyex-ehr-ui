# Debugging Practice Selection Issue

## Problem
User alice@example.com has 2 tenant groups but practice selection page is not showing.

## Debugging Steps

### 1. Check Browser Console Logs

After logging in with alice@example.com, open browser DevTools (F12) and check the Console tab for these logs:

```
Checking accessible tenants for user...
Tenants data: { hasFullAccess: false, tenants: [...], requiresSelection: true }
User has multiple tenants, redirecting to practice selection
```

### 2. Check Network Tab

In DevTools → Network tab, look for the request to `/api/tenants/accessible`:

**Request:**
- URL: `http://localhost:8080/api/tenants/accessible`
- Method: GET
- Headers should include: `Authorization: Bearer <token>`

**Expected Response:**
```json
{
  "success": true,
  "message": "Accessible tenants retrieved",
  "data": {
    "hasFullAccess": false,
    "tenants": ["CareWell", "Qiaben Health"],
    "requiresSelection": true
  }
}
```

### 3. Check localStorage

In DevTools → Application → Local Storage → http://localhost:3000

Should have:
- `token`: JWT token
- `groups`: `["/Tenants/CareWell", "/Tenants/Qiaben Health"]`
- `selectedTenant`: Should NOT be set yet (or should be empty)

### 4. Possible Issues & Solutions

#### Issue 1: Backend endpoint not working
**Symptom:** Network request to `/api/tenants/accessible` fails with 404 or 500

**Solution:** 
- Make sure backend is running with `local` profile
- Check if `TenantController` has the `/api/tenants/accessible` endpoint
- Restart backend: `SPRING_PROFILES_ACTIVE=local ./gradlew bootRun`

#### Issue 2: Frontend not calling the endpoint
**Symptom:** No network request to `/api/tenants/accessible` in Network tab

**Solution:**
- Check if `tenantService.ts` exists in `src/utils/`
- Check if callback page imports `getAccessibleTenants`
- Clear browser cache and try again

#### Issue 3: selectedTenant already set
**Symptom:** `selectedTenant` is already in localStorage

**Solution:**
```javascript
// In browser console, clear it:
localStorage.removeItem('selectedTenant');
// Then refresh and login again
```

#### Issue 4: Backend returns wrong data
**Symptom:** `requiresSelection` is `false` even though user has 2 tenants

**Solution:**
- Check backend logs for errors
- Verify `TenantAccessService.getAccessibleTenants()` is working correctly
- Test endpoint manually with curl (see test_tenant_endpoint.sh)

### 5. Manual Test

Run this in browser console after login:

```javascript
// Get token
const token = localStorage.getItem('token');

// Call endpoint
fetch('http://localhost:8080/api/tenants/accessible', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

Expected output:
```javascript
Response: {
  success: true,
  data: {
    hasFullAccess: false,
    tenants: ["CareWell", "Qiaben Health"],
    requiresSelection: true
  }
}
```

### 6. Force Redirect to Practice Selection

If all else fails, manually navigate to:
```
http://localhost:3000/select-practice
```

This should show the practice selection page if the endpoint is working.

### 7. Check UI Build

Make sure the UI changes are compiled:

```bash
cd /home/siva/git/ciyex/ciyex-ehr-ui

# Install dependencies if needed
pnpm install

# Run dev server
pnpm dev
```

Then access: http://localhost:3000

### 8. Common Mistakes

❌ **Backend not running with `local` profile**
```bash
# Wrong
./gradlew bootRun

# Correct
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

❌ **UI not restarted after code changes**
```bash
# Stop UI (Ctrl+C) and restart
pnpm dev
```

❌ **Old token in localStorage**
```javascript
// Clear everything and login fresh
localStorage.clear();
```

❌ **CORS issues**
Check backend logs for CORS errors. Make sure `application.yml` has:
```yaml
cors:
  allowed-origins: http://localhost:3000
```

## Quick Fix

If you just want to test the practice selection page directly:

1. Login with alice@example.com
2. Open browser console
3. Run:
```javascript
window.location.href = '/select-practice';
```

This will take you directly to the practice selection page to verify it's working.
