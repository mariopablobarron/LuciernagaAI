# 🌙 Luciérnaga - AI Mentorship Chat

A production-ready Next.js application that provides confrontational, state-aware mentorship through an AI chat interface.

**Status:** ✅ Production Ready | **Stack:** Next.js 16 + TypeScript + OpenRouter API | **Deployed:** Coolify Docker

---

## 🚀 Quick Start

### Development
```bash
npm install
OPENROUTER_API_KEY=sk-or-your-key npm run dev
# Open http://localhost:3000
```

### Production (Coolify)
See **[QUICKSTART.md](QUICKSTART.md)** for 5-minute deploy.

---

## 📋 Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 5-minute deployment guide |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Complete Coolify setup (step-by-step) |
| [PRODUCTION.md](PRODUCTION.md) | Pre/post deployment checklist |

---

## 🏗️ Architecture

### Stack
- **Frontend:** Next.js 16.2.1 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- **Backend:** Next.js API Routes + OpenRouter (OpenAI gpt-4o-mini)
- **Deployment:** Docker + Coolify
- **Database:** PostgreSQL (optional, not required for MVP)

### Endpoints
```
GET  /api/health                 → System health check
POST /api/chat-direct            → Chat with AI mentor (no DB)
POST /api/mock-chat              → Test endpoint (mock response)
GET  /api/admin/insights         → Admin insights (protected)
GET  /api/*                      → 404 Not Found
```

### Error Handling
- ✅ Global error boundary (no white screen)
- ✅ Structured error logging
- ✅ Semantic HTTP status codes
- ✅ User-friendly error messages

---

## 🎯 Features Implemented

### MVP (Live)
- [x] Chat interface with OpenRouter integration
- [x] State detection (perdido, ansioso, bloqueado, normal)
- [x] Confrontational prompts (psychology-driven)
- [x] Health check endpoint
- [x] Error handling + error boundary
- [x] Production-grade logging
- [x] Docker containerization
- [x] ZERO crashes (graceful degradation)

### Future
- [ ] User session persistence (PostgreSQL)
- [ ] Conversation history
- [ ] Admin dashboard
- [ ] User feedback collection
- [ ] Prompt iteration based on metrics

---

## ⚙️ Configuration

### Required Environment Variables
```
OPENROUTER_API_KEY=sk-or-YOUR-KEY   # Get from https://openrouter.ai/keys
NODE_ENV=production                 # production | development
AUTH_TOKEN_SECRET=replace-me        # HMAC secret for session tokens
ADMIN_USERNAME=admin                # Admin login username
ADMIN_PASSWORD=replace-me           # Admin login password
```

### Optional
```
DATABASE_URL=postgresql://...       # For persistence (future)
LOG_LEVEL=info                      # info | debug | error
PORT=3000                           # Server port (Coolify manages)
ADMIN_AUTH_SECRET=replace-me        # Optional dedicated secret for admin cookies
```

### Setup
```bash
# Create .env file
cp .env.example .env

# Add your OpenRouter API key
echo "OPENROUTER_API_KEY=sk-or-YOUR-KEY" >> .env
```

### Admin Access
- ` /admin` y ` /api/admin/*` ahora requieren autenticación admin.
- En producción define `ADMIN_USERNAME` y `ADMIN_PASSWORD` en Coolify.
- En desarrollo, si no defines variables, el fallback es:
  - usuario: `admin`
  - contraseña: `admin123`

---

## 🔧 Build & Deploy

### Local Development
```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Local Production Testing
```bash
npm run build
npm run start
# Open http://localhost:3000
```

### Docker (Production)
```bash
# Build image
docker build -t mentor-web .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e OPENROUTER_API_KEY=sk-or-your-key \
  mentor-web

# Test
curl http://localhost:3000/api/health | jq .
```

### Coolify (VPS Deployment)
See [QUICKSTART.md](QUICKSTART.md) - takes 5 minutes.

---

## 📊 API Examples

### Health Check
```bash
curl http://localhost:3000/api/health
```
Response:
```json
{
  "ready": true,
  "statusCode": 200,
  "server": { "status": "✅ RUNNING" },
  "dependencies": { "openrouter": "✅" }
}
```

### Chat with Mentor
```bash
curl -X POST http://localhost:3000/api/chat-direct \
  -H "Content-Type: application/json" \
  -d '{"message":"no sé qué hacer","userId":"user_123"}'
```
Response:
```json
{
  "ok": true,
  "reply": "Confrontational mentor response...",
  "state": "perdido",
  "timestamp": "2026-03-29T..."
}
```

### Error Example
```bash
curl -X POST http://localhost:3000/api/chat-direct \
  -H "Content-Type: application/json" \
  -d '{"message":"","userId":""}'
```
Response (400):
```json
{
  "reply": "Necesito que me cuentes qué te pasa",
  "error": "EMPTY_INPUT"
}
```

---

## 📝 Scripts

```bash
npm run dev      # Development server (hot reload)
npm run build    # Build for production
npm run start    # Production server (next start)
npm run lint     # Run ESLint

# Docker
docker build -t mentor-web .                    # Build image
docker run -p 3000:3000 mentor-web             # Run container
docker-compose up -d                           # Or use docker-compose
bash scripts/docker-test.sh                    # Run tests in Docker
```

---

## 📧 Workflow

### Development
1. Make changes in code
2. Test locally: `npm run dev`
3. Commit: `git add . && git commit -m "message"`

### Deployment (Coolify Auto-Deploy)
1. Push to GitHub: `git push origin main`
2. Coolify automatically deploys
3. View changes at: https://your-domain.com

### Manual Testing
```bash
# Test endpoint
curl https://your-domain.com/api/health | jq .

# Test chat
curl -X POST https://your-domain.com/api/chat-direct \
  -H "Content-Type: application/json" \
  -d '{"message":"test","userId":"test"}'
```

---

## 🔍 Monitoring

### Health Check (Production)
```bash
curl https://your-domain.com/api/health
# Status 200 = ✅ Healthy
# Status 503 = ❌ Missing API key
```

### Log Markers (Watch for these)
```
[CHAT-DIRECT] 📨 Petición recibida          ← Request in
[CHAT-DIRECT] 🎯 Estado detectado: perdido  ← State detected
[CHAT-DIRECT] 🌐 Llamando OpenRouter...     ← API call
[CHAT-DIRECT] ✨ Éxito (320 chars)          ← Success
```

### Common Errors
| Error | Cause | Fix |
|-------|-------|-----|
| 501 MISSING_API_KEY | No API key | Add OPENROUTER_API_KEY to .env |
| 502 OPENROUTER_ERROR | API external | Check OpenRouter status |
| 502 EMPTY_RESPONSE | API bug | Retry or check model |
| 500 INTERNAL_ERROR | Server bug | Check logs, report issue |

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Health endpoint returns 200
- [ ] Chat accepts message with any state
- [ ] Errors show user-friendly messages
- [ ] No white screen of death
- [ ] Browser console has [FRONTEND] logs
- [ ] Response time < 5 seconds
- [ ] Mobile responsive layout

### Automated Testing (Todo)
```bash
npm run test  # (Not implemented yet)
```

---

## 📦 Project Structure

```
mentor-web/
├── app/
│   ├── page.tsx                 # Chat UI
│   ├── layout.tsx               # Root layout
│   ├── error.tsx                # Error boundary ✨
│   ├── not-found.tsx            # 404 page ✨
│   ├── globals.css              # Styles
│   └── api/
│       ├── chat-direct/route.ts # Main endpoint ✨
│       ├── health/route.ts      # Health check
│       └── mock-chat/route.ts   # Test endpoint
├── lib/                         # Utilities (future)
├── public/                      # Static files
├── prisma/                      # Database schema (optional)
├── Dockerfile                   # Production image ✨
├── docker-compose.yml           # Local testing ✨
├── next.config.ts               # Next.js config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
└── .env.production              # Env template ✨

✨ = New files for production
```

---

## 🚨 Known Issues & Limitations

### Current (MVP)
- No user session persistence (stateless)
- State detection is keyword-based (not ML)
- Single model: OpenAI gpt-4o-mini
- No rate limiting yet

### Planned Fixes
- Add PostgreSQL for persistence (Priority 1)
- Build admin dashboard (Priority 2)
- ML-based state detection (Priority 3)
- Multi-model support (Priority 4)

---

## 🔐 Security

### Production Checks
- ✅ No API keys in git
- ✅ Secrets managed via environment variables
- ✅ HTTPS enforced (Coolify SSL)
- ✅ Security headers configured
- ✅ Error messages don't leak internals
- ✅ CORS configured

### TODO
- [ ] Rate limiting per IP
- [ ] Request validation
- [ ] SQL injection prevention (when using DB)
- [ ] XSS protection
- [ ] CSRF tokens

---

## 🐛 Troubleshooting

### Build fails locally
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### "API key not found" error
```bash
# Set API key
export OPENROUTER_API_KEY=sk-or-your-key
npm run dev
```

### Slow responses
```bash
# Check OpenRouter status
curl https://status.openrouter.ai

# Increase timeout in browser DevTools
curl -X POST ... &
sleep 10
# See response
```

### White screen of death
```bash
# Check browser console (F12)
# Look for [FRONTEND] error messages
# Check /api/health returns 200
```

---

## 📚 Learning Resources

- [Next.js Docs](https://nextjs.org/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [Docker Docs](https://docs.docker.com/)
- [Coolify Docs](https://coolify.io/docs)

---

## 🤝 Contributing

Any issues or questions?
1. Check logs: `docker logs mentor-web`
2. Check health: `curl /api/health`
3. Review [DEPLOYMENT.md](DEPLOYMENT.md)
4. Report issue with logs

---

## 📄 License

MIT

---

## 👤 Author

Luciérnaga AI Mentorship Platform

**Version:** 1.0  
**Last Updated:** 2026-03-29  
**Status:** Production Ready ✅

---

## 🎯 Next Steps

1. **Deploy to Coolify** → [QUICKSTART.md](QUICKSTART.md)
2. **Test with real users** → Collect feedback
3. **Iterate prompts** → Based on user responses
4. **Add database** → PostgreSQL persistence
5. **Build dashboard** → Admin analytics
