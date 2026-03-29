# 🚀 COOLIFY DEPLOYMENT - STEP BY STEP GUIDE

**Your GitHub:** mariopablobarron/LuciernagaAI  
**Latest Commit:** 1983f8f (Dockerfile + production files)  
**Status:** ✅ Ready to deploy

---

## STEP 1: ACCESS COOLIFY DASHBOARD

Go to your Coolify instance:
```
https://your-coolify-domain.com
or
https://your-vps-ip:3000  (if first time setup)
```

**If you don't have Coolify yet:**
1. Find your VPS IP address
2. SSH into VPS: `ssh root@YOUR_VPS_IP`
3. Install Coolify:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
4. Access at: `https://YOUR_VPS_IP:443`

---

## STEP 2: LOGIN & CREATE PROJECT

In Coolify Dashboard:

```
1. Login with credentials (if already setup)
   
2. Click "Projects" (top left)

3. Click "+ New Project"
   • Name: mentor-web
   • Description: AI Mentorship Chat App
   • Click "Create"
```

**Expected:** You're now in the mentor-web project.

---

## STEP 3: CONNECT GITHUB

```
1. In Project → Settings → Integrations → GitHub

2. Click "Connect to GitHub"
   • Authorize Coolify to access your repos
   • Select: mariopablobarron/LuciernagaAI
   • Branch: main
   • Click "Save"

3. Verify you see the repo listed
```

**Expected:** GitHub repository visible in Coolify.

---

## STEP 4: ADD DOCKER SERVICE

```
1. In Project → Dashboard → "+ Add Service"

2. Choose "Docker"
   
3. Click "GitHub" (Import from GitHub)

4. Fill in details:
   
   Repository:        mariopablobarron/LuciernagaAI
   Branch:            main
   Dockerfile Path:   ./Dockerfile
   Build Context:     .  (root)
   
   Port Mapping:
   • Container Port:  3000
   • Exposed Port:    80 (Coolify will add HTTPS)
   • Public Access:   Toggle ON ✅
```

5. Click "Save"

**Expected:** Service created, shows building/deploying status.

---

## STEP 5: ADD ENVIRONMENT VARIABLES

In Coolify UI → Service Settings → Environment:

### 🔴 REQUIRED (must add)

Mark as **SECRET** ⭐:
```
OPENROUTER_API_KEY = sk-or-XXX-your-key

(Get from https://openrouter.ai/keys)
```

### 🟡 OPTIONAL (auto-set)

These are usually auto-set:
```
NODE_ENV = production
NEXT_TELEMETRY_DISABLED = 1
PORT = 3000
```

---

## STEP 6: CONFIGURE HEALTH CHECK

In Coolify UI → Service → Health Check:

```
☑️ Enable Health Check

Protocol:    HTTP
Path:        /api/health
Port:        3000
Interval:    30 seconds
Timeout:     10 seconds
Retries:     3
Start:       40 seconds (wait for server startup)
```

Click "Save"

**Why?** Coolify will automatically restart if health check fails.

---

## STEP 7: DEPLOY 🚀

```
Click the big green "DEPLOY" button

Coolify will:
  1. Clone your GitHub repo
  2. Build Docker image  (~3-5 min)
  3. Start container     (~1 min)
  4. Run health check    (~40 sec)
  5. Make it public      (~10 sec)

Total time: ~5-10 minutes
```

**Watch the logs:**
- Green messages = ✅ Good
- Red messages = ❌ Error
- Yellow messages = ⚠️ Warning

---

## STEP 8: VERIFY DEPLOYMENT ✅

Once "Deployment Successful" appears:

### Test health endpoint:
```bash
curl https://your-coolify-domain.com/api/health | jq .

Expected response:
{
  "ready": true,
  "statusCode": 200,
  "server": { "status": "✅ RUNNING" },
  "dependencies": { "openrouter": "✅" }
}
```

### Test in browser:
```
1. Open https://your-coolify-domain.com
2. Type: "no sé qué hacer"
3. Press Enter
4. Wait 5 seconds...
5. Should see mentor response
```

### Test chat endpoint:
```bash
curl -X POST https://your-coolify-domain.com/api/chat-direct \
  -H "Content-Type: application/json" \
  -d '{"message":"estoy bloqueado","userId":"test123"}'

Expected: 200 OK with mentor response
```

---

## STEP 9: ADD CUSTOM DOMAIN (Optional)

If you want `mentor.yourdomain.com` instead of IP:

In Coolify → Services → Domains:

```
1. Click "+ Add Domain"

2. Domain:          mentor.yourdomain.com
   Protocol:        HTTPS (auto SSL)
   Target:          Your Docker service
   Public:          Toggle ON ✅

3. Click "Save"

4. In your DNS:
   A Record:
   subdomain:  mentor
   value:      YOUR_VPS_IP
   TTL:        300
```

Wait ~2 minutes for SSL certificate.

---

## STEP 10: MONITOR & TROUBLESHOOT

### View logs (real-time):
```
Service → Logs → Watch for [CHAT-DIRECT] markers

Signs of success:
  [CHAT-DIRECT] 📨 Petición recibida
  [CHAT-DIRECT] 🎯 Estado detectado
  [CHAT-DIRECT] 🌐 Llamando OpenRouter
  [CHAT-DIRECT] ✨ Éxito
```

### Common Issues:

| Problem | Solution |
|---------|----------|
| **Build fails** | Check Dockerfile: `git show 1983f8f:Dockerfile` |
| **"API key missing"** | Verify OPENROUTER_API_KEY in Coolify secrets |
| **502 errors** | Check logs for OpenRouter errors |
| **Slow responses** | Check OpenRouter status: https://status.openrouter.ai |
| **Health check fails** | Verify `/api/health` returns 200 |

### Restart service:
```
Service → Actions → Restart
(Wait 30 seconds for startup)
```

---

## STEP 11: AUTO-DEPLOY ON PUSH

After first successful deployment:

**Automatic Updates:**
1. Make changes locally
2. Push to GitHub: `git push origin main`
3. Coolify sees the push (GitHub webhook)
4. **Automatically builds and deploys**

No need to click Deploy again! 🎉

---

## ✅ FINAL CHECKLIST

- [x] GitHub repo has Dockerfile
- [x] Commit pushed to main branch
- [ ] Coolify account created
- [ ] Project "mentor-web" created
- [ ] GitHub connected to Coolify
- [ ] Docker service added
- [ ] OPENROUTER_API_KEY set (SECRET)
- [ ] Health check configured
- [ ] Deploy clicked
- [ ] Build successful (logs show ✅)
- [ ] Health endpoint returns 200
- [ ] Chat endpoint works
- [ ] Custom domain added (optional)
- [ ] Domain DNS configured (optional)

---

## 🆘 NEED HELP?

### Quick Test Before Coolify:
```bash
docker build -t mentor-web .
docker run -p 3000:3000 \
  -e OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  mentor-web

# Test
curl http://localhost:3000/api/health
```

### Check Dockerfile is correct:
```bash
cat Dockerfile | head -20
```

### Verify GitHub:
```bash
git log --oneline -1
git push origin main
```

---

## 📞 COOLIFY SUPPORT

- Docs: https://coolify.io/docs
- Community: https://coolify.io/community
- GitHub Issues: https://github.com/coollabsio/coolify

---

**Status:** Ready for Coolify deployment ✅  
**GitHub Commit:** 1983f8f  
**Last Updated:** 2026-03-29

🚀 **Next: Go to Coolify Dashboard and click Deploy!**
