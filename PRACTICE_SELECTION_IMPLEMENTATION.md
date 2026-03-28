# Practice Selection Implementation - Complete ✅

## What Was Implemented

The EHR UI now supports multi-tenant practice selection with automatic header injection.

## Files Created/Modified

### 1. **New Files Created:**

- `src/utils/tenantService.ts` - Service for tenant operations
- `src/components/auth/PracticeSelection.tsx` - Practice selection component
- `src/app/(full-width-pages)/(auth)/select-practice/page.tsx` - Practice selection page

### 2. **Modified Files:**

- `src/utils/fetchWithOrg.ts` - Added `X-Tenant-Name` header to all API requests
- `src/app/(full-width-pages)/(auth)/callback/page.tsx` - Added practice selection check after login

## User Flow

### Single Tenant User:
```
Login → Callback → Auto-select tenant → Dashboard
```

### Multi-Tenant User:
```
Login → Callback → Practice Selection Page → User selects → Dashboard
```

### All Subsequent Requests:
```
Every API call automatically includes X-Tenant-Name header from localStorage
```

## How It Works

### 1. After Login (callback/page.tsx)
```typescript
// Check if user needs to select practice
const tenantsData = await getAccessibleTenants(token);

if (tenantsData.requiresSelection) {
    // Multi-tenant user → redirect to practice selection
    router.push("/select-practice");
} else if (tenantsData.tenants.length === 1) {
    // Single tenant → auto-select and go to dashboard
    setSelectedTenant(tenantsData.tenants[0]);
    router.push("/dashboard");
}
```

### 2. Practice Selection Page
- Shows all accessible practices as cards
- User clicks to select
- Selection stored in localStorage
- Redirects to dashboard

### 3. All API Requests (fetchWithOrg.ts)
```typescript
// Automatically adds X-Tenant-Name header
const selectedTenant = localStorage.getItem("selectedTenant");
if (selectedTenant) {
    headers.set("X-Tenant-Name", selectedTenant);
}
```

## API Endpoint Used

**GET /api/tenants/accessible**

Response:
```json
{
  "success": true,
  "data": {
    "hasFullAccess": false,
    "tenants": ["Qiaben Health", "MediPlus"],
    "requiresSelection": true
  }
}
```

## localStorage Keys

- `selectedTenant` - Currently selected practice name
- `token` - JWT authentication token
- `userEmail`, `userFullName`, `userId` - User info
- `groups` - User's Keycloak groups

## Testing

### Test Single Tenant User:
1. Login with user that has only one tenant group
2. Should auto-redirect to dashboard
3. Check localStorage: `selectedTenant` should be set

### Test Multi-Tenant User:
1. Login with user that has multiple tenant groups
2. Should see practice selection page
3. Select a practice
4. Should redirect to dashboard
5. Check localStorage: `selectedTenant` should be set

### Test API Requests:
1. Open browser DevTools → Network tab
2. Make any API request
3. Check request headers
4. Should see: `X-Tenant-Name: Qiaben Health`

## UI Features

✅ Beautiful card-based practice selection  
✅ Dark mode support  
✅ Loading states  
✅ Error handling  
✅ Sign out option  
✅ Responsive design (mobile, tablet, desktop)

## Next Steps (Optional)

### Add Practice Switcher in Header:
Create a dropdown in the main layout to switch between practices without logging out.

### Add Practice Info:
Show additional practice details (address, phone) on selection cards.

### Remember Last Selected:
Store last selected practice per user and auto-select on next login.

## Troubleshooting

### Practice selection not showing:
- Check if backend endpoint `/api/tenants/accessible` is working
- Verify token is valid in localStorage
- Check browser console for errors

### X-Tenant-Name not in requests:
- Verify `selectedTenant` is in localStorage
- Check if using `fetchWithOrg` utility for API calls
- Clear localStorage and login again

### Backend returns 400 "X-Tenant-Name required":
- User has multiple tenants but header is missing
- Clear localStorage and go through practice selection again

## Summary

🎉 **Implementation Complete!**

- ✅ Practice selection page created
- ✅ Auto-selection for single-tenant users
- ✅ X-Tenant-Name header automatically added to all requests
- ✅ Stored in localStorage
- ✅ Beautiful UI with dark mode support
- ✅ Full error handling

Users with multiple tenant groups will now see a practice selection page after login, and all API requests will automatically include the selected practice in the `X-Tenant-Name` header!
