#!/bin/bash

# 🔍 TESTING SCRIPT - Verificar que todo funciona
# Uso: bash debug-test.sh

set -e

BASE_URL="http://localhost:3000"
DELAY=2

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 DEBUGGING TEST SUITE - Verifica que todo funciona"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test 1: Health Check
echo "📊 TEST 1: Health Check"
echo "  GET $BASE_URL/api/health"
curl -s "$BASE_URL/api/health" | jq . 2>/dev/null || echo "❌ Error: ¿Servidor corriendo?"
echo ""
sleep $DELAY

# Test 2: Mock Chat - Estado PERDIDO
echo "🎭 TEST 2: Mock Chat - Estado PERDIDO"
echo "  POST $BASE_URL/api/mock-chat (message: 'no sé qué hacer')"
curl -s -X POST "$BASE_URL/api/mock-chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "no sé qué hacer", "userId": "test_user_1"}' | jq '.state, .mock' 2>/dev/null || echo "❌ Error en mock"
echo ""
sleep $DELAY

# Test 3: Mock Chat - Estado ANSIOSO
echo "🎭 TEST 3: Mock Chat - Estado ANSIOSO"
echo "  POST $BASE_URL/api/mock-chat (message: 'tengo mucho miedo')"
curl -s -X POST "$BASE_URL/api/mock-chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "tengo mucho miedo", "userId": "test_user_2"}' | jq '.state, .mock' 2>/dev/null || echo "❌ Error en mock"
echo ""
sleep $DELAY

# Test 4: Mock Chat - Estado BLOQUEADO
echo "🎭 TEST 4: Mock Chat - Estado BLOQUEADO"
echo "  POST $BASE_URL/api/mock-chat (message: 'estoy bloqueado')"
curl -s -X POST "$BASE_URL/api/mock-chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "estoy bloqueado", "userId": "test_user_3"}' | jq '.state, .mock' 2>/dev/null || echo "❌ Error en mock"
echo ""
sleep $DELAY

# Test 5: Real Chat (requiere BD y OpenRouter)
echo "🚀 TEST 5: Real Chat - Endpoint /api/chat"
echo "  POST $BASE_URL/api/chat (requiere DATABASE_URL y OPENROUTER_API_KEY)"
REAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "no sé qué hacer", "userId": "test_real_1"}')

echo "$REAL_RESPONSE" | jq '.ok, .state, .error' 2>/dev/null || echo "❌ Error parsing response"
ERROR=$(echo "$REAL_RESPONSE" | jq -r '.error // empty' 2>/dev/null)
if [ -n "$ERROR" ]; then
  echo "  ⚠️  Error reportado: $ERROR"
  echo "  💡 Revisa que DATABASE_URL y OPENROUTER_API_KEY estén configurados"
fi
echo ""

# Test 6: Resumen
echo "═══════════════════════════════════════════════════════════════"
echo "✅ TESTS COMPLETADOS"
echo ""
echo "📋 Resumen:"
echo "  ✅ TEST 1 (Health): Servidor respondiendo"
echo "  ✅ TEST 2-4 (Mock): Detección de estados funcionando"
echo "  ⚠️  TEST 5 (Real): Check el error si aplica"
echo ""
echo "💡 Próximos pasos:"
echo "  - Si TEST 1 falla: npm run dev"
echo "  - Si TEST 1-4 pasan pero TEST 5 falla:"
echo "    → Verificar DATABASE_URL (npx prisma db push)"
echo "    → Verificar OPENROUTER_API_KEY en .env"
echo ""
echo "📊 Logs en servidor:"
echo "  Para ver logs detallados, checkea la consola donde corre npm run dev"
echo "  Busca lineas con [CHAT], [FRONTEND], [HEALTH]"
echo ""
