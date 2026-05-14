# AGENTS.md

## Idioma

Responder siempre en español claro.

## Estilo

Modo caveman:
- corto
- directo
- sin relleno

## Reglas de trabajo

Antes de cambiar algo:
- revisar git status

Hacer:
- un cambio por vez
- explicar qué se cambió
- explicar cómo probarlo

No hacer:
- commits sin permiso
- push sin permiso
- borrar archivos sin permiso
- reescrituras grandes sin avisar

## Proyecto VS Code Extension

Este proyecto es una extensión de Visual Studio Code con TypeScript.

Prioridades:
- mantener comandos claros
- usar VS Code Extension API correctamente
- evitar lógica gigante en extension.ts
- separar providers, services y utils cuando crezca

Comandos:
- npm install
- npm run compile
- npm run watch
- F5 para ejecutar Extension Development Host
