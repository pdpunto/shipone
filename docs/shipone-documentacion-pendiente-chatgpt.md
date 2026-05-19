# ShipOne - Documentacion pendiente para pulir

Fecha: 2026-05-19

Este documento resume, de forma practica, todo lo que todavia falta para que la documentacion de ShipOne quede realmente redonda y con tono de producto publico.

Sirve para pasar a otra IA o para usarlo como lista de trabajo.

## Objetivo

La documentacion ya tiene buena base.

Lo que falta ahora no es funcionalidad nueva, sino:

- mas claridad;
- mejor orden;
- menos tono interno;
- mas consistencia;
- mas contexto para usuarios nuevos;
- mejor separacion entre documentacion publica e interna.

## 1. Lo que falta en la documentacion publica

### README

Falta una pasada final para dejarlo completamente publico y profesional.

Puntos concretos:

- instalar / configurar;
- requisitos minimos;
- uso real con ejemplos;
- flujo completo de principio a fin;
- limites conocidos;
- FAQ mas completa;
- versionado y actualizacion;
- enlace claro a la documentacion auxiliar;
- capturas mas utiles;
- menos repeticiones;
- menos frases de proceso interno.

### Guar de tono

Hay que evitar lenguaje que suene a conversacion entre el autor y la IA.

Ejemplos de tono a evitar:

- "lo siguiente que queremos";
- "pendiente";
- "vamos a";
- "para luego";
- "demo por grabar";
- "esto falta";
- "para cerrar".

La documentacion publica debe sonar a producto final, no a trabajo en curso.

## 2. Huecos de contenido en el README

### Instalacion

Todavia falta una seccion clara con:

- como clonar el repo;
- como instalar dependencias;
- como compilar;
- como abrir la extension;
- que hacer si falla el arranque.

### Requisitos

Falta explicar:

- version minima de VS Code;
- Git;
- GitHub CLI si se usa GitHub;
- diferencias entre Windows, macOS y Linux;
- que pasa si falta una dependencia.

### Uso real

Falta un flujo completo y corto con pasos reales:

1. crear proyecto;
2. abrir proyecto;
3. asignar estado;
4. definir nextAction;
5. congelar o reanudar;
6. cerrar proyecto.

### Estados

Falta explicar mejor:

- `idea`;
- `active`;
- `paused`;
- `finished`;
- reglas entre estados;
- efecto de tener un solo `Active`.

### Configuracion

Falta una tabla o bloque mas util con:

- nombre del ajuste;
- valor por defecto;
- para que sirve;
- ejemplo de uso;
- impacto real.

### Problemas frecuentes

Falta un troubleshooting mas completo:

- errores de compilacion;
- fallo de `gh`;
- problema con `VSCE_PAT`;
- paths invalidos;
- storage corrupto;
- carpeta existente;
- extension no arranca.

### FAQ

Falta ampliar preguntas como:

- si necesita GitHub;
- si necesita `STATUS.md`;
- si puede trabajar solo local;
- si puede tener varios proyectos activos;
- si funciona sin Internet;
- si funciona sin GitHub CLI.

## 3. Huecos de documentacion tecnica

### Arquitectura

Falta una doc corta y clara con:

- entrada de la extension;
- servicios;
- providers;
- modelos;
- utilidades;
- localizacion;
- bootstrap.

### Modelo de datos

Falta una referencia de:

- metadata de proyecto;
- estado;
- timestamps;
- `nextAction`;
- favorito;
- pausas;
- checklist MVP;
- `STATUS.md`;
- `projects.json`.

### Persistencia

Falta explicar:

- donde se guarda todo;
- como funciona el backup;
- como se recupera;
- que ocurre si el JSON esta roto;
- que partes son locales;
- que parte depende de VS Code.

### Creacion de proyectos

Falta documentar bien:

- pasos del flujo;
- templates disponibles;
- como se evita colision de carpeta;
- que ocurre si falla Git;
- que ocurre si falla GitHub;
- que queda creado si el proceso se corta a mitad.

### Sistema de salud

Falta explicar:

- como se calcula;
- que significa healthy/warning/bad;
- que señales usa;
- que no intenta hacer;
- como interpretar alertas.

### Localizacion

Falta una guia para:

- agregar claves;
- traducir textos;
- evitar textos rotos;
- mantener coherencia entre idiomas;
- revisar placeholders.

### Seguridad y privacidad

Falta una nota publica mas visible sobre:

- datos locales;
- storage de VS Code;
- Git opcional;
- GitHub opcional;
- secretos que nunca deben subirse.

## 4. Huecos de release y publicacion

### Release publico

Falta documentar mejor:

- beta;
- estable;
- flujo de publish;
- secreto `VSCE_PAT`;
- checklist antes de publicar;
- que revisar antes de subir una version.

### Marketplace

Falta un bloque claro con:

- imagen principal;
- banner;
- logo;
- preview;
- descripcion corta;
- keywords;
- limitaciones visibles.

### Changelog

Falta mantenerlo mas vivo y mas util para usuarios.

Idealmente deberia decir:

- que cambio;
- por que importa;
- si rompe algo;
- si requiere accion del usuario.

## 5. Huecos visuales

### Capturas

Faltan capturas mas utiles:

- vista con proyecto activo;
- vista con varios estados;
- vista con warning;
- vista con focus mode;
- vista con pause;
- vista con nextAction visible.

### GIF demo

Si se mantiene, debe existir de verdad.

Si no existe aun, mejor no prometerlo en docs publicas.

### Branding

Falta una guia mas clara para:

- uso del logo;
- uso del banner;
- uso de capturas;
- estilo visual;
- coherencia entre README y marketplace.

## 6. Huecos de contribucion

### CONTRIBUTING

Falta ampliar:

- como crear una rama;
- como correr tests;
- como validar lint;
- como reportar bugs;
- como preparar un PR;
- que no tocar;
- como mantener cambios pequenos.

### Seguridad de contribuciones

Falta dejar muy visible:

- no subir secretos;
- no subir `.env`;
- no cambiar dependencias sin permiso;
- no hacer cambios grandes sin avisar.

## 7. Huecos de estructura documental

### Mapa de docs

Falta una pagina indice que enlace:

- README;
- CONTRIBUTING;
- SECURITY;
- CHANGELOG;
- roadmap;
- auditoria;
- branding;
- walkthrough.

### Separacion publico / interno

Falta separar mejor:

- documentacion de usuario;
- documentacion tecnica;
- notas internas;
- roadmap interno;
- auditorias.

### Limpieza general

Falta revisar y cerrar:

- caracteres rotos;
- repeticiones;
- secciones duplicadas;
- referencias internas que no deben salir al publico.

## 8. Lista priorizada de trabajo

### Prioridad 1

1. Limpiar README final.
2. Añadir instalacion y requisitos.
3. Añadir uso real y FAQ mas completa.
4. Crear lista de limitaciones conocidas.
5. Añadir troubleshooting serio.

### Prioridad 2

1. Escribir doc corta de arquitectura.
2. Escribir doc corta de modelo de datos.
3. Escribir doc corta de persistencia.
4. Escribir doc corta de creacion de proyectos.
5. Escribir doc corta de release.

### Prioridad 3

1. Mejorar capturas.
2. Grabar GIF real o quitarlo.
3. Mejorar branding notes.
4. Mejorar CONTRIBUTING.
5. Añadir indice global de documentacion.

## 9. Criterio de acabado

La documentacion esta realmente lista cuando:

- un usuario nuevo entiende ShipOne en 1 minuto;
- sabe como instalarlo sin preguntar;
- sabe que hace y que no hace;
- sabe como usarlo con un flujo real;
- sabe que hacer si algo falla;
- no hay tono interno ni referencias a trabajo pendiente;
- no hay contradicciones entre docs;
- no hay texto roto;
- no faltan piezas importantes para publicar.

## 10. Resumen corto

Lo que falta no es una sola cosa.

Faltan principalmente:

- pulido de tono;
- instalacion;
- requisitos;
- uso real;
- FAQ;
- limitaciones conocidas;
- arquitectura;
- modelo de datos;
- persistencia;
- release;
- capturas;
- branding;
- mapa de documentacion.

Si eso queda cerrado, ShipOne deja de parecer un proyecto en construccion y pasa a parecer un producto bien presentado.
