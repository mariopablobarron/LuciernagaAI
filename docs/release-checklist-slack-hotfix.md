# Release Checklist (Slack) - Hotfix

Copia y pega este bloque para ejecutar un hotfix bajo incidente.

## Contexto

- Tipo: hotfix
- Severidad: SEV-1 / SEV-2 / SEV-3
- Service: mentor-web
- Commit:
- Owner:

## Pre-deploy

- [ ] Tests minimos de superficie afectada en verde
- [ ] Variables criticas en Coolify
- [ ] Rollback listo

## Deploy

- [ ] Deploy hotfix ejecutado
- [ ] Build/Start en verde

## Recuperacion

- [ ] /api/health OK
- [ ] /api/ready OK
- [ ] Flujo primario recuperado
- [ ] Alertas criticas apagadas

## Monitoreo 30-60 min

- [ ] Sin 5xx nuevos
- [ ] Sin reinicios de contenedor
- [ ] Latencia estable

## Cierre

- [ ] Incidente mitigado
- [ ] Postmortem agendado (24h)
- [ ] Riesgos/remanentes documentados
