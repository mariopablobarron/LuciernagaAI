# 🎯 COOLIFY DEPLOYMENT - QUICK REFERENCE

**Status:** Ready to deploy! ✅

---

## 🔑 STEP 1: GET YOUR API KEY

1. Go to: https://openrouter.ai/keys
2. Sign up (free) if needed
3. Copy your API key (starts with `sk-or-`)
4. Keep it safe - you'll need it in Step 5

---

## 📍 STEP 2: COOLIFY DASHBOARD

**Access:**

- If you have Coolify: `https://your-coolify-server.com`
- First time? SSH to VPS: `ssh root@YOUR_VPS_IP`
- Install: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`

---

## ⚡ STEP 3: CREATE PROJECT IN COOLIFY

```
Dashboard > Projects > + New Project

PROJECT DETAILS:
  Name:        mentor-web
  Description: AI Mentorship Chat App

Click: CREATE
```

---

## 🔗 STEP 4: CONNECT GITHUB

```
Project Settings > Integrations > GitHub

  Repository: mariopablobarron/Tres Mil Millones de LatidosAI
  Branch:     main

Click: CONNECT & AUTHORIZE
```

---

## 🐳 STEP 5: ADD DOCKER SERVICE

```
Dashboard > + Add Service > Docker

SERVICE DETAILS:
  Source:          GitHub
  Repository:      mariopablobarron/Tres Mil Millones de LatidosAI
  Branch:          main
  Dockerfile:      ./Dockerfile
  Build Context:   .

PORT MAPPING:
  Container Port:  3000
  Public:          Toggle ON ✅

Click: SAVE

STATUS: You should see "Preparing..." or similar
```

---

## 🔐 STEP 6: ADD YOUR API KEY

```
Service Settings > Environment > Secrets

ADD SECRET (click + button):

Name:  OPENROUTER_API_KEY
Value: sk-or-PASTE-YOUR-KEY-HERE
Mark as Secret: ✅ YES

Click: SAVE
```

**⚠️ IMPORTANT:** The value must start with `sk-or-`

---

## 🏥 STEP 7: CONFIGURE HEALTH CHECK

```
Service Settings > Health Check

Enable:     Toggle ON ✅
Protocol:   HTTP
Endpoint:   /api/health
Port:       3000
Interval:   30 seconds
Timeout:    10 seconds
Retries:    3
Start Period: 40 seconds

Click: SAVE

This allows auto-restart if service dies!
```

---

## 🚀 STEP 8: DEPLOY!

```
Click: BIG GREEN DEPLOY BUTTON

Coolify will:
  1. Pull code from GitHub
  2. Build Docker image (3-5 min)
  3. Start container (1 min)
  4. Run health check (40 sec)
  5. Make public (10 sec)

WATCH LOGS for:
  ✅ "Successfully built image..."
  ✅ "Container started"
  ✅ "Health check: OK"

Status will change to: RUNNING ✅
```

---

## ✅ STEP 9: VERIFY IT WORKS

### Test 1: Health Check

```bash
curl https://your-domain-or-ip:3000/api/health | jq .

Expected:
{
  "ready": true,
  "statusCode": 200,
  "server": { "status": "✅ RUNNING" }
}
```

### Test 2: In Browser

```
1. Open: https://your-domain-or-ip:3000
2. Type: "no sé qué hacer"
3. Press Enter
4. Should see mentor response in 5 seconds ✅
```

### Test 3: Chat Endpoint

```bash
curl -X POST https://your-domain-or-ip:3000/api/chat-direct \
  -H "Content-Type: application/json" \
  -d '{"message":"estoy ansioso","userId":"test"}'

Expected Response:
{
  "ok": true,
  "reply": "[mentor response]",
  "state": "ansioso"
}
```

---

## 🌐 STEP 10: CUSTOM DOMAIN (Optional)

If you want `mentor.yourdomain.com`:

```
Service > Domains > + Add Domain

Domain:   mentor.yourdomain.com
Protocol: HTTPS (Coolify handles SSL)
Public:   Toggle ON ✅

Click: SAVE

Then in your DNS provider:
  A Record:
  subdomain: mentor
  value:     YOUR_VPS_IP
  TTL:       300

Wait 2 minutes for SSL cert
```

---

## 📊 MONITORING

### View Logs

```
Service > Logs (real-time)

Watch for these signs of success:
  [CHAT-DIRECT] 📨 Petición recibida
  [CHAT-DIRECT] 🎯 Estado detectado: perdido
  [CHAT-DIRECT] 🌐 Llamando OpenRouter...
  [CHAT-DIRECT] ✨ Éxito (320 chars)
```

### View Metrics

```
Service > Monitor
  • CPU usage
  • Memory usage
  • Network traffic
  • Restart count
```

### Restart Service

```
Service > Actions > Restart

Wait 30-40 seconds for startup
then health check runs
```

---

## 🆘 TROUBLESHOOTING

| Issue                  | Fix                                                                |
| ---------------------- | ------------------------------------------------------------------ |
| **Build fails**        | Check logs. Usually: Dockerfile path wrong or GitHub access denied |
| **"API key missing"**  | Verify OPENROUTER_API_KEY is in Secrets (not Environment)          |
| **502 errors**         | Check OpenRouter status: https://status.openrouter.ai              |
| **Health check fails** | Wait 40 seconds. If still fails, check `/api/health` returns 200   |
| **Slow responses**     | Normal first time (cold start). Should be <5 sec after             |
| **White screen**       | Check browser console (F12). Should see `[FRONTEND]` logs          |

---

## 🔄 AUTO-DEPLOY ON PUSH

This repo now includes a workflow:

- [ .github/workflows/coolify-auto-deploy.yml ](.github/workflows/coolify-auto-deploy.yml)

Final one-time setup needed:

1. In GitHub repo settings add this secret:

- Name: `COOLIFY_DEPLOY_WEBHOOK_URL`
- Value: your Coolify Deploy Webhook URL

2. Keep pushing to `main` as usual.

After that:

```bash
# On your Mac:
git add .
git commit -m "your message"
git push origin main

# GitHub Action triggers the Coolify deploy webhook automatically.
# Coolify then:
#   1. Builds new image
#   2. Stops old container
#   3. Starts new one
#   4. Runs health check

No need to click Deploy again! 🎉
```

---

## 📱 WHAT YOU HAVE NOW

✅ Production Docker app running  
✅ Auto-restart on crashes  
✅ Health monitoring  
✅ Error boundaries (no white screen)  
✅ Clever mentor responses  
✅ 0 downtime deployments

---

## 🎯 AFTER DEPLOYMENT

1. **Test with real users** (5-10 people)
2. **Measure feedback:**
   - "Did this help?" (1-10 scale)
   - "Do you know what to do?" (1-10 scale)
3. **Iterate prompts** based on feedback
4. **Plan next features:**
   - Add database (PostgreSQL) for persistence
   - Build admin dashboard
   - Track user metrics

---

## 📚 RESOURCES

- Coolify Docs: https://coolify.io/docs
- GitHub Repo: https://github.com/mariopablobarron/Tres Mil Millones de LatidosAI
- OpenRouter: https://openrouter.ai/docs
- Next.js: https://nextjs.org/docs

---

## ⏱️ TIMELINE

| Step                   | Time  | Total  |
| ---------------------- | ----- | ------ |
| Coolify setup          | 5 min | 5 min  |
| Add GitHub + Docker    | 5 min | 10 min |
| First build            | 5 min | 15 min |
| Startup + health check | 2 min | 17 min |
| Verify + test          | 3 min | 20 min |

**Total to production:** ~20 minutes ⚡

---

## ✨ CONGRATS!

You now have a production-grade Next.js app deployed on Coolify! 🎉

**Next step:** Go to Coolify dashboard and click that big green DEPLOY button!

---

**GitHub:** mariopablobarron/Tres Mil Millones de LatidosAI  
**Commit:** 5cf2b2c (latest)  
**Status:** READY ✅
