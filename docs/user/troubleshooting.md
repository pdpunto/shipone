# Troubleshooting

## ShipOne no abre

- Comprueba que el workspace sea este repo.
- Comprueba que no haya errores de compilacion.
- Ejecuta de nuevo `npm.cmd run compile`.
- Revisa que la extension este activada.
- Abre Developer Tools si necesitas ver el error exacto.

## No aparecen proyectos

- Revisa `shipone.projectsRoot`.
- Comprueba que exista metadata local.
- Verifica que el storage de VS Code no este corrupto.
- Confirma que el proyecto se haya creado dentro de la carpeta correcta.
- Revisa si el proyecto fue ocultado por el filtro de estado.

## Git falla

- Asegurate de tener Git instalado.
- Comprueba que la terminal vea `git`.
- Revisa permisos y rutas.
- Comprueba que la ruta no tenga caracteres raros o permisos limitados.
- Verifica que el repositorio local no este en un estado roto.

## GitHub no conecta

- Comprueba `gh auth status`.
- Verifica que GitHub CLI este instalado.
- Revisa `VSCE_PAT` si vas a publicar.
- Si quieres crear repos remotos, confirma que Git local ya exista.
- Revisa que la cuenta autenticada tenga permisos suficientes.

## La carpeta ya existe

ShipOne intenta evitar colisiones usando un nombre alternativo.

- Si querias usar una carpeta exacta, revisa el nombre final creado.
- Si hay varias versiones del mismo nombre, confirma cual es la correcta.

## Storage roto

- Revisa si existe backup.
- Intenta recuperar desde la copia de seguridad.
- Si el problema sigue, crea un issue con pasos claros.
- No borres archivos de storage sin antes guardar una copia.

## Fallo al crear proyecto

- Revisa si el proyecto quedo a medio crear.
- Comprueba si el template elegido existe.
- Verifica que el paquete de herramientas este bien instalado.
- Si el fallo fue en GitHub, intenta crear solo el proyecto local primero.

## Como reportar el fallo

- Que paso.
- Que esperabas.
- Pasos para reproducir.
- VS Code y sistema operativo.
- Si usaste Git o GitHub.
- Captura o log si aplica.
