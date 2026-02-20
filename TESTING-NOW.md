# 🧪 PWA Testing in Progress

**Server Status**: ✅ Running on http://localhost:3000
**Browser**: Should be opening automatically

## Quick Testing Checklist

### ✅ Step 1: Verify Page Loads

- [ ] Browser opened to http://localhost:3000
- [ ] Page loads successfully
- [ ] No console errors (F12 to check)

### ✅ Step 2: Check Service Worker (F12 > Application Tab)

Open Chrome DevTools (press F12):

1. Go to **Application** tab
2. Click **Service Workers** in left sidebar
3. **Expected**: You should see:
   - Status: ✅ **activated and is running**
   - Source: `/service-worker.js`
   - Scope: `/`

**Console Commands to Test:**

```javascript
// Paste in Console to check registration
navigator.serviceWorker.getRegistrations().then((regs) => {
  console.log(
    "✅ Service Workers:",
    regs.length > 0 ? "REGISTERED" : "❌ NOT FOUND",
  );
  regs.forEach((reg) => console.log("  - Scope:", reg.scope));
});
```

### ✅ Step 3: Check Manifest (F12 > Application Tab)

1. Click **Manifest** in left sidebar
2. **Expected fields**:
   - Name: "CopyPaste.me - Secure Device Sharing"
   - Short name: "CopyPaste"
   - Start URL: "/"
   - Theme color: #63a9e1
   - Icons: 2 icons (192x192, 256x256)

### ✅ Step 4: Check Cache Storage (F12 > Application Tab)

1. Expand **Cache Storage** in left sidebar
2. **Expected caches**:
   - `copypaste-v1-static` (contains index.html, style.css, app.js, etc.)
   - `copypaste-v1-dynamic` (may be empty initially)

**Console Command:**

```javascript
// Paste in Console to see cached files
caches
  .keys()
  .then((keys) => {
    console.log("💾 Cache names:", keys);
    return Promise.all(
      keys.map((key) => caches.open(key).then((cache) => cache.keys())),
    );
  })
  .then((all) => {
    console.log("📦 Total cached files:", all.flat().length);
  });
```

### ✅ Step 5: Test Install Prompt

**Wait 3 seconds** after page load:

- [ ] Install prompt should slide up from bottom
- [ ] Shows app icon
- [ ] Has "Install" and "Later" buttons

**To test Install button:**

- Click "Install"
- Should trigger browser's native install dialog

**To test Later button:**

- Click "Later"
- Prompt should dismiss smoothly

**Manual trigger (if prompt doesn't auto-show):**

```javascript
// Paste in Console
if (window.PWAManager) {
  console.log("✅ PWA Manager loaded");
  if (window.PWAManager.deferredPrompt) {
    window.PWAManager.promptInstall();
  } else {
    console.log("⚠️ Install prompt not captured (may already be installed)");
  }
} else {
  console.log("❌ PWA Manager not found");
}
```

### ✅ Step 6: Test Offline Mode

1. In DevTools, go to **Network** tab
2. Check the **Offline** checkbox
3. Refresh page (F5)
4. **Expected**:
   - ✅ Page loads from cache
   - ✅ Red offline indicator appears at top
   - ✅ Core UI is functional
   - ⚠️ Real-time features disabled (expected)

5. **Uncheck Offline** to go back online
6. **Expected**:
   - ✅ Offline indicator disappears
   - ✅ Real-time features reconnect

### ✅ Step 7: Check PWA Manager

```javascript
// Paste in Console - Full PWA Status
console.log("=== PWA STATUS ===");
console.log("PWA Manager:", window.PWAManager ? "✅ Loaded" : "❌ Not found");
console.log(
  "Service Worker:",
  "serviceWorker" in navigator ? "✅ Supported" : "❌ Not supported",
);
console.log(
  "Standalone:",
  matchMedia("(display-mode: standalone)").matches
    ? "✅ Yes"
    : "⬜ Browser mode",
);
console.log("Online:", navigator.onLine ? "✅ Online" : "❌ Offline");

// Check service worker details
navigator.serviceWorker.getRegistration().then((reg) => {
  if (reg) {
    console.log("SW Active:", reg.active ? "✅ Yes" : "❌ No");
    console.log("SW Installing:", reg.installing ? "⏳ Yes" : "⬜ No");
    console.log("SW Waiting:", reg.waiting ? "⏳ Yes" : "⬜ No");
  }
});
```

### ✅ Step 8: Test Installation (Desktop)

1. Look for install icon in Chrome address bar (⊕ or install icon)
2. Click it
3. Click "Install" in the dialog
4. **Expected**:
   - App opens in new window (standalone mode)
   - No browser UI (address bar, tabs, etc.)
   - App icon in taskbar/dock

### ✅ Step 9: Lighthouse Audit

1. In DevTools, click **Lighthouse** tab
2. Select **Progressive Web App**
3. Click **Analyze page load**
4. **Expected Score**: 90-100/100
   - ⚠️ May be lower without HTTPS (that's OK for local testing)

### ✅ Step 10: Test Core Functionality

After PWA features verified, test app features:

- [ ] QR code generates
- [ ] Manual code works
- [ ] Invite links work
- [ ] Connection establishment works
- [ ] File sharing works

## 🐛 Common Issues & Fixes

### Issue: Service Worker Not Registered

**Fix:**

```javascript
// Clear and reload
navigator.serviceWorker
  .getRegistrations()
  .then((r) => r.forEach((reg) => reg.unregister()))
  .then(() => location.reload());
```

### Issue: Install Prompt Not Showing

**Reasons:**

- Already installed (check chrome://apps)
- Need HTTPS for production (OK on localhost)
- Manifest or SW not loading

**Fix:**

```javascript
// Check manifest
fetch("/site.webmanifest")
  .then((r) => r.json())
  .then(console.log);

// Check SW
fetch("/service-worker.js").then((r) => console.log("SW Status:", r.status));
```

### Issue: Cache Not Working

**Check:**

```javascript
caches.keys().then(console.log); // Should show cache names
```

**Clear cache:**

```javascript
caches
  .keys()
  .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  .then(() => location.reload());
```

### Issue: Offline Mode Not Working

**Requirements:**

1. Visit page online first (to cache assets)
2. Service worker must be active
3. Wait for caching to complete

**Verify:**

```javascript
caches
  .open("copypaste-v1-static")
  .then((cache) => cache.keys())
  .then((keys) => console.log("Cached files:", keys.length));
```

## 📊 Success Indicators

### ✅ All Green Means Success

- Service Worker: ✅ Registered & Active
- Manifest: ✅ Valid & Loaded
- Cache: ✅ Files Cached
- Install Prompt: ✅ Appears & Works
- Offline: ✅ Page Loads Offline
- PWA Manager: ✅ Loaded & Functional
- Console: ✅ No Errors

## 🎯 Next: Test on Mobile

Once desktop testing passes, test on mobile:

### Option 1: Use ngrok (Recommended)

```powershell
# Install ngrok, then:
ngrok http 3000
# Use the https:// URL on mobile
```

### Option 2: Local Network

```powershell
# Find your IP
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
# On mobile: http://YOUR_IP:3000
```

## 📝 Testing Complete?

When all checks pass:

- ✅ Mark as tested in PWA-TESTING-GUIDE.md
- ✅ Move to mobile device testing
- ✅ Deploy to production with HTTPS

---

**Current Status**: Testing in progress...
**Started**: Just now
**Server**: http://localhost:3000
