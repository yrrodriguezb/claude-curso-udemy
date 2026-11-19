Lectura: Escribir instrucciones efectivas en CLAUDE.md
Todo lo que escribas en CLAUDE.md consume tokens de la ventana de contexto de Claude. Cada línea compite por atención con tu conversación real y con el código que Claude está leyendo.

Un CLAUDE.md inflado no solo desperdicia tokens: reduce la calidad de las respuestas porque Claude tiene más instrucciones que seguir y las sigue de forma menos consistente.

La regla es simple: incluye solo lo que causaría errores si faltara. Todo lo demás es ruido.

Tamaño recomendado
Apunta a un máximo de 200 líneas por archivo CLAUDE.md. Si tus instrucciones crecen más allá de eso, es señal de que necesitas dividirlas usando importaciones @ o archivos en .claude/rules/ (lo veremos en la siguiente clase).

Qué incluir
Incluye instrucciones que Claude no podría descubrir solo leyendo tu código, o que si las descubriera por su cuenta, llevaría demasiado tiempo:

Comandos exactos de build, test y lint — Claude los ejecutará literalmente

Decisiones de arquitectura que afectan cómo se escribe el código

Convenciones de código específicas de tu proyecto

Variables de entorno necesarias y servicios requeridos

Trampas comunes o patrones que Claude debe evitar

Estructura de monorepo y qué paquete es responsable de qué

Qué NO incluir
Cosas que Claude ya sabe (sintaxis estándar de TypeScript, APIs comunes)

Recordatorios obvios ("escribe código limpio", "añade comentarios")

Guías de estilo extensas que un linter puede enforcar automáticamente

Documentación completa de APIs externas (mejor referenciar con @)

Consejo avanzado: "Nunca envíes a un LLM a hacer el trabajo de un linter." Los LLMs son comparativamente caros y lentos frente a herramientas deterministas como ESLint o Prettier. Si tu código sigue ciertas guías de estilo, Claude tenderá a seguir los patrones existentes gracias al aprendizaje en contexto, sin que se lo digas explícitamente. Considera usar un Hook de Claude Code que ejecute tu formatter/linter automáticamente (lo veremos más adelante en el curso)

Cómo escribir las instrucciones
Usa imperativos, no sugerencias:

# ❌ Mal
- Preferimos usar ESM en vez de CommonJS
- Sería bueno que los tests tengan nombres descriptivos
​
# ✅ Bien
- Usa ESM (import/export), nunca CommonJS (require)
- Nombra tests: "should [comportamiento] when [condición]"


Sé específico y verificable:

# ❌ Vago (no se puede verificar)
- Formatea el código correctamente
- Mantén los archivos organizados
​
# ✅ Específico (se puede verificar)
- Indentación: 2 espacios
- Los handlers de API van en src/api/handlers/, un archivo por grupo de rutas


Usa IMPORTANT o YOU MUST con moderación para reglas críticas:

- IMPORTANT: Nunca modificar el directorio src/db/migrations/ directamente.
  Siempre crear una nueva migración.
- YOU MUST ejecutar `npm run typecheck` antes de considerar un cambio completo
Si todo está marcado como IMPORTANT, nada lo es. Reserva el énfasis para 2-3 reglas que, si se ignoran, causan problemas graves.

Estructura con Markdown
Usa headers y bullets para organizar. Claude escanea la estructura igual que un lector humano: secciones organizadas son más fáciles de seguir que párrafos densos.

# Nombre del Proyecto
​
## Comandos
- Build: `comando exacto`
- Test: `comando exacto`
​
## Arquitectura
- (decisiones clave)
​
## Reglas de código
- (convenciones)