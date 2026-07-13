# Glosario

Estos son los conceptos técnicos que aparecen en el código del backend y que no son necesariamente obvios si nunca trabajaste con ellos antes. Cada uno tiene la explicación en criollo primero, y después el ejemplo real de este proyecto — no una definición de manual.

## MikroORM (y qué resuelve un ORM en general)

**La idea en criollo**: un ORM ("Object-Relational Mapper") es una librería que te deja escribir código en tu lenguaje normal (clases, objetos, `if`s) en vez de SQL crudo, y ella se encarga de traducir eso a `SELECT`/`INSERT`/`UPDATE`/`DELETE` reales contra la base. En vez de escribir `"SELECT * FROM jugador WHERE equipo_id = ?"` a mano y despues parsear las filas que vuelven en objetos, hacés `em.find(Jugador, { equipo: id })` y el ORM te devuelve instancias reales de la clase `Jugador`, con sus relaciones ya resueltas si se lo pedís.

**Por qué importa acá**: sin ORM, cada controlador de este proyecto tendría que escribir el SQL de cada consulta a mano, mapear manualmente cada columna a cada campo, y encargarse de escapar valores para evitar inyección SQL. Con MikroORM, la mayoría de las consultas del proyecto son una línea:

```ts
// jugador.controler.ts — buscar un jugador con su equipo cargado
const jugador = await em.findOne(Jugador, { id }, { populate: ['equipo'] });
```

Sin ORM, esto sería (aproximadamente) un `JOIN` escrito a mano, más el trabajo de armar el objeto `Jugador` con su `Equipo` anidado desde el resultado plano que devuelve el driver de MySQL.

**El `EntityManager` (`em`)**: es el objeto central de MikroORM — la "puerta de entrada" para leer y escribir. Cada controlador de este proyecto hace `const em = orm.em;` al principio del archivo y lo usa para todo: `em.find`, `em.findOne`, `em.create`, `em.persistAndFlush`, `em.flush`, `em.transactional`. No hay una capa de "repositorio" separada en archivos propios — el `EntityManager` ya cumple ese rol (ver `README.md`, sección de arquitectura).

## `populate` (cargar relaciones a demanda)

**La idea en criollo**: por default, cuando pedís un `Jugador`, MikroORM no trae automáticamente su `Equipo` completo — trae una referencia liviana (básicamente solo el id). Si tratás de leer un campo del equipo sin haber pedido esa relación, en el mejor de los casos te da `undefined` y en otros casos un error. `populate` es la forma de decirle a MikroORM "esta vez sí, cargá esta relación completa, con todos sus campos".

**Por qué importa acá**: casi todos los `em.find`/`em.findOne` del proyecto le pasan un `populate` explícito con las relaciones que esa función puntual necesita — ni una más ni una menos, porque cada relación de más que pedís es una consulta (o un `JOIN`) extra a la base:

```ts
// formacion.controler.ts
const formacion = await em.findOne(
  Formacion,
  { equipo: jugador.equipo.id },
  { populate: ['titulares', 'titulares.jugador'] }
);
```

Acá `'titulares.jugador'` es un `populate` "anidado": no solo trae la colección de `FormacionTitular`, sino que para cada uno trae también su `Jugador` completo (nombre, apellido, etc.), no solo el id.

## `syncSchema()` y por qué no hay migraciones manuales

**La idea en criollo**: una "migración" es un archivo con instrucciones explícitas de cómo cambiar la estructura de la base (`ALTER TABLE jugador ADD COLUMN...`), que se escribe a mano y se corre en orden, una vez, para llevar la base de un estado al siguiente. Es el enfoque más común en proyectos grandes porque da control total y un historial versionado de cada cambio de esquema. Este proyecto no lo usa — en cambio, deja que MikroORM **compare las entidades del código contra las tablas reales de MySQL en cada arranque**, y aplique automáticamente lo que falte.

**El ejemplo real** — `src/shared/db/orm.ts`:

```ts
export const syncSchema = async () => {
  const generator = orm.getSchemaGenerator();
  await generator.updateSchema();
};
```

Y en `src/app.ts`, se llama una vez al arrancar, después de montar las rutas:

```ts
await syncSchema();
```

**El trade-off**: es mucho más rápido para un proyecto chico/académico — agregás un campo a una entidad, reiniciás el server, y la columna ya está. No hay que escribir ni versionar archivos de migración a mano. La contra es que no hay historial de "qué cambió y cuándo" más allá del propio historial de git de los archivos `*.entity.ts`, y sobre todo: **si te olvidás de especificar un tipo en un campo, MikroORM elige un default silenciosamente**, sin avisar. Eso fue exactamente lo que pasó con `Formacion.notas`: se declaró como `@Property({ nullable: true }) notas?: string;` sin `type`, y MikroORM creó la columna como `varchar(255)` — funcionó bien en las pruebas cortas, pero al guardar una nota de estrategia real (~400 caracteres) tiró `Data too long for column 'notas'`. La corrección fue declarar el tipo explícitamente:

```ts
@Property({ type: 'text', nullable: true })
notas?: string;
```

y reiniciar el server (el próximo `syncSchema()` aplicó el `ALTER TABLE` solo). Ver `decisiones.md` para la bitácora completa de ese bug, incluyendo por qué `Equipo.descripcion`/`Jugador.descripcion` **no** son un buen precedente a copiar (tienen el mismo problema, sin corregir — ver `pendientes.md`).

## Arquitectura por capas (rutas / controladores / entidades)

**La idea en criollo**: en vez de que un solo archivo reciba el request HTTP, valide todo, hable con la base, y arme la respuesta, se separa el trabajo en capas con una responsabilidad bien acotada cada una — así un cambio en una capa (por ejemplo, agregar una ruta nueva) no obliga a tocar las otras.

**Las tres capas de este proyecto** (ver diagrama completo en `README.md`):

- **`*.routes.ts`**: solo mapea `método HTTP + URL` → función del controlador. Ejemplo, `src/formacion/formacion.routes.ts` completo:
  ```ts
  formacionRouter.get('/', misFormacion);
  formacionRouter.put('/', guardar);
  ```
- **`*.controler.ts`**: acá vive toda la lógica — leer `req.body`/`req.params`/`req.user`, validar, aplicar las reglas de negocio, hablar con MikroORM, devolver `res.status(...).json(...)`.
- **`*.entity.ts`**: clases con decoradores que describen la tabla — sin lógica de negocio, solo estructura.

**Por qué separarlas**: si mañana hay que agregar una ruta nueva sobre `Formacion` (por ejemplo, "borrar la formación"), se toca `formacion.routes.ts` (una línea) y se agrega una función en `formacion.controler.ts` — no hace falta tocar la entidad. Si hay que agregar un campo nuevo a `Formacion`, se toca solo `formacion.entity.ts` y el próximo `syncSchema()` lo aplica — no hace falta tocar rutas ni controlador a menos que ese campo nuevo también participe de alguna validación.

## JWT (JSON Web Token) y el middleware de autenticación

**La idea en criollo**: un JWT es un texto (no un número de sesión guardado en el servidor) que contiene datos ("payload", por ejemplo `{ id: 5, nombre: "Juan" }`) más una firma criptográfica hecha con una clave secreta que solo el servidor conoce. El cliente lo recibe una vez al hacer login y lo manda de vuelta en cada request siguiente (header `Authorization: Bearer <token>`). El servidor no necesita guardar nada de la sesión: le alcanza con volver a verificar la firma del token con la misma clave secreta — si coincide, sabe que ese payload no fue alterado desde que él mismo lo firmó.

**El ejemplo real** — login de un jugador, `jugador.controler.ts`:

```ts
const token = jwt.sign(
  { id: jugador.id, nombre: jugador.nombre, email: jugador.email },
  process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024',
  { expiresIn: '2h' }
);
```

Y del otro lado, el middleware que corre en **todas** las rutas de `/api` excepto las públicas (`src/middleware/auth.middleware.ts`):

```ts
const token = authHeader.split(' ')[1];
const payload = jwt.verify(token, process.env.JWT_SECRET || 'clave-segura-del-gestor-torneos-2024');
req.user = payload;
next();
```

Si `jwt.verify` no tira excepción, `req.user` queda disponible en el resto del ciclo de ese request con exactamente el payload que se firmó en el login — cualquier controlador puede leer `req.user.id` para saber "quién está haciendo este pedido", sin haber tenido que consultar ninguna sesión guardada en el servidor.

**Dos tipos de token distintos conviven en el proyecto**: el de `Jugador` (payload `{ id, nombre, email }`) y el de `AdminTorneo` (payload `{ id, nombre, email, rol: 'admin' }`, ver `adminTorneo.controler.ts`). El middleware no distingue entre ambos — verifica la firma nomás. Es cada controlador el que, si le importa, mira `req.user?.rol` para diferenciar (ejemplo real: `equipo.controler.ts`, función `update`, hace `if (req.user?.rol !== 'admin') { ...chequear que sea el capitán... }`).

## Identificar al actor por JWT, nunca por un parámetro de URL

**La idea en criollo**: cuando el backend necesita saber "¿quién está haciendo este pedido?" (para permisos, para saber de qué equipo es capitán, etc.), hay dos formas de averiguarlo. La insegura: confiar en un dato que manda el propio cliente en la URL o el body (`?capitanId=5`, un campo `equipoId` en el JSON). La segura: leerlo del `req.user` que puso el middleware de JWT — ese dato no lo puede falsificar el cliente sin conocer la clave secreta del servidor. Si el backend confiara en un parámetro para decidir "quién sos", cualquiera podría mandar ese request a mano (con curl, con Postman) cambiando un número y hacerse pasar por otra persona.

**El ejemplo real más claro** — `PATCH /jugadores/:id/expulsar` (`jugador.controler.ts`): el `:id` de la URL es el jugador **objetivo** (a quién echar), pero quién tiene permiso para hacerlo se resuelve leyendo `req.user?.id`, nunca un parámetro:

```ts
const capitan = await txEm.findOne(Jugador, { id: req.user?.id }, { populate: ['equipo'] });
if (!capitan || !capitan.esCapitan || !capitan.equipo) {
  throw Object.assign(new Error('Solo el capitán de un equipo puede expulsar jugadores'), { status: 403 });
}
// ...
if (jugadorObjetivo.equipo?.id !== capitan.equipo.id) {
  throw Object.assign(new Error('No sos capitán del equipo de este jugador'), { status: 403 });
}
```

**Un caso más fuerte todavía** — `GET`/`PUT /formaciones` (`formacion.controler.ts`): acá directamente **no existe** un parámetro `equipoId` en la ruta. Ni en la URL ni en el body. El equipo siempre se resuelve así:

```ts
const capitan = await txEm.findOne(Jugador, { id: req.user?.id }, { populate: ['equipo'] });
```

La diferencia con `expulsar` es sutil pero importante: en `expulsar` sí hay un dato "externo" en la URL (el jugador objetivo), y el código lo cruza contra el equipo del capitán. En `/formaciones` no hay ningún dato externo que cruzar — la pregunta "¿de qué equipo estamos hablando?" tiene una sola respuesta posible ("el del que llama"), así que no hace falta ni recibir un id para después validarlo: la ruta de ataque directamente no existe, no es que esté bloqueada en tiempo de ejecución.

**Un contraejemplo que existió y se corrigió** — `PATCH /jugadores/:id/transferir-capitania` no aplicaba este patrón originalmente: el código confiaba en que `:id` (el capitán saliente) ya era la persona correcta, sin compararlo contra `req.user?.id` — cualquier jugador autenticado podía, en teoría, llamar a este endpoint y, si el `:id` que puso en la URL resultaba ser capitán de algún equipo, transferirle la capitanía a un tercero sin su consentimiento. La corrección (ver `decisiones.md`) fue agregar exactamente el mismo tipo de chequeo que ya tenía `expulsar`, antes de cualquier otra validación:

```ts
const saliente = await txEm.findOneOrFail(Jugador, { id }, { populate: ['equipo'] });

if (saliente.id !== req.user?.id) {
  throw Object.assign(new Error('Solo el propio capitán puede transferir su capitanía'), { status: 403 });
}
if (!saliente.esCapitan || !saliente.equipo) {
  throw Object.assign(new Error('Solo el capitán de un equipo puede transferir la capitanía'), { status: 403 });
}
```

Fue, en su momento, la inconsistencia más concreta de todo el proyecto respecto de este patrón — quedó como ejemplo en esta documentación porque es un buen caso real de "encontrado leyendo el código, no asumido", aunque ya esté corregido.

## Transacciones (`em.transactional`)

**La idea en criollo**: una transacción agrupa varias operaciones de escritura en la base como "todo o nada" — si cualquier paso falla a mitad de camino, todo lo anterior de esa misma transacción se deshace (rollback), en vez de dejar la base en un estado a medio hacer. Sirve para operaciones que necesitan varios pasos relacionados entre sí donde un resultado parcial sería peor que no hacer nada.

**El ejemplo real** — `PUT /formaciones` (`formacion.controler.ts`) necesita, en una sola operación lógica: validar que el capitán tiene autoridad, contar el plantel, validar cupos por categoría, borrar los `FormacionTitular` viejos, crear los nuevos, actualizar la `Formacion`, y crear una `Notificacion` por cada jugador del plantel. Si algo fallara después de borrar los titulares viejos pero antes de crear los nuevos, sin transacción el equipo se quedaría sin ningún titular guardado. Con `em.transactional`, todo ese bloque se confirma junto o no se confirma nada:

```ts
const result = await em.transactional(async (txEm) => {
  // ... todas las validaciones y escrituras usan txEm, no em
  return { formacion, equipo: capitan.equipo };
});
```

Dentro del callback, las validaciones que fallan se señalan lanzando un error con un `status` HTTP adjunto (no un `return res.status(...)`, porque adentro de la transacción no hay acceso directo al `res` de forma prolija):

```ts
throw Object.assign(new Error('El plantel tiene menos de 11 jugadores...'), { status: 400 });
```

y el `catch` de la función que envuelve a `em.transactional` lo atrapa y arma la respuesta HTTP real:

```ts
} catch (e: any) {
  res.status(e.status ?? 500).json({ message: e.message });
}
```

Este mismo patrón (`em.transactional` + `throw Object.assign(new Error(...), { status })`) se repite en `transferirCapitania`, `expulsar`, `responder` (invitaciones), y `guardar` (formaciones) — es la forma establecida de este proyecto para "varios pasos con validaciones intercaladas, todo o nada".

## El sistema de notificaciones (y la historia de que existía pero estaba roto)

**La idea en criollo**: en vez de que cada acción (expulsión, suspensión, formación actualizada) le avise al jugador de una forma distinta, hay una única entidad `Notificacion` (`jugador`, `tipo`, `mensaje`, `leida`, `fecha`, `torneo` opcional) que cualquier controlador puede crear cuando algo le tiene que avisar a alguien, y un único endpoint (`GET /notificaciones`) que el frontend usa para mostrarlas todas juntas (la "campanita").

**El ejemplo real de cómo se crea una notificación** — dentro de `PATCH /jugadores/:id/suspender`:

```ts
const notificacion = em.create(Notificacion, {
  jugador,
  tipo: 'suspension',
  mensaje: `Fuiste suspendido del torneo "${torneo.nombreTorneo}". Motivo: ${motivo}`,
  torneo,
  leida: false,
  fecha: new Date(),
});
```

Y dentro de `PUT /formaciones`, se crea **una por cada jugador del plantel completo** (no solo los titulares), con un mensaje distinto según a cuál de los dos grupos pertenece cada uno:

```ts
mensaje: idsTitulares.has(jugador.id!)
  ? `Se actualizó la formación de "${capitan.equipo.nombreEquipo}" (${esquema}): quedaste como titular.`
  : `Se actualizó la formación de "${capitan.equipo.nombreEquipo}" (${esquema}): quedaste como suplente.`,
```

**El bug real que existía**: `notificacion.routes.ts` definía dos rutas (`GET /jugador/:idJugador` y `PATCH /:id/leida`), pero **nadie las montaba** en `src/routes.ts` — faltaba la línea `apiRouter.use('/notificaciones', notificacionRouter)`. El archivo existía, compilaba sin errores, tenía lógica correcta adentro — y sin embargo era completamente inalcanzable por HTTP: cualquier `fetch` a `/api/notificaciones` desde el frontend hubiera devuelto el `404` genérico de "ruta no encontrada" de `app.ts`, no un error relacionado a notificaciones. Es un buen ejemplo real de que **"el código existe" no es lo mismo que "el código funciona"** — solo se detectó leyendo `routes.ts` de punta a punta buscando qué router faltaba, no ejecutando nada. Se corrigió montándolo, y de paso se generalizó el endpoint de lectura: antes filtraba por un `idJugador` que venía de la URL (sin verificar que fuera el usuario logueado) y solo devolvía no leídas; ahora usa `req.user.id` (siguiendo el patrón JWT-driven) y devuelve todas, con su estado `leida`. Ver `decisiones.md`.

## `RequestContext` y por qué `uploadEscudo` usa su propio `em`

**La idea en criollo**: MikroORM necesita saber, en cada operación (`em.find`, `em.flush`, etc.), a qué request HTTP pertenece — para no mezclar cambios de un usuario con los de otro que está pegándole al servidor al mismo tiempo. Lo resuelve con `AsyncLocalStorage` de Node (una forma de que un valor "viaje" implícitamente a través de toda una cadena de `async`/`await`, sin tener que pasarlo como parámetro a cada función). `RequestContext.create(orm.em, next)`, en `app.ts`, arranca ese contexto al principio de cada request.

**Por qué hace falta un `em` aparte en `uploadEscudo`** (`equipo.controler.ts`): el middleware de `multer` (que procesa el archivo subido) consume el stream del request de una forma que corta esa cadena de contexto implícito — el `em` global (`orm.em`) ya no "sabe" en qué request está parado, después de pasar por multer. La solución, comentada en el propio código:

```ts
// El middleware de multer procesa el stream multipart antes de esta función y
// eso rompe la propagación del RequestContext de MikroORM (AsyncLocalStorage),
// por eso acá se usa un EntityManager propio (fork) en vez del global `em`.
const em = orm.em.fork();
```

`.fork()` crea una copia independiente del `EntityManager` que no depende de ese contexto implícito — a costa de tener que declararla a mano en esa función en particular, en vez de usar el `em` de módulo que usan todas las demás funciones del archivo.

## `import type` + entidad como string en los decoradores (evitar ciclos de módulos)

**La idea en criollo**: cuando dos archivos se importan mutuamente como *valores* en tiempo de ejecución (A necesita la clase B para algo que corre de verdad, y B necesita la clase A), se arma un ciclo — y según el orden en que Node cargue los módulos, uno de los dos puede terminar viendo al otro todavía sin terminar de definirse (`undefined`), rompiendo en tiempo de ejecución. TypeScript separa dos formas de importar: `import { Equipo } from ...` (trae la clase real, para poder usarla en runtime — instanciarla, hacer `instanceof`, etc.) e `import type { Equipo } from ...` (solo el tipo, para el chequeo de TypeScript — se borra por completo al compilar a JS, nunca existe en runtime).

**El ejemplo real** — casi todas las entidades del proyecto tienen relaciones cruzadas (`Jugador` apunta a `Equipo`, `Equipo` tiene una colección de `Jugador`). Si ambos archivos importaran la clase del otro como *valor*, se arma exactamente ese ciclo. La solución, explicada en un comentario que se repite (con matices) en casi todas las entidades — acá el de `jugador.entity.ts`:

```ts
// import type + entidad como string en el decorador — ver arbitro.entity.ts
// para la explicación completa del ciclo que esto evita.
import type { Equipo } from '../equipo/equipo.entity.js';

@Entity()
export class Jugador extends BaseEntity {
  // ...
  @ManyToOne('Equipo', { nullable: true })
  equipo!: Equipo | null;
```

Notar dos cosas: `import type` (se borra al compilar, nunca ejecuta) y `'Equipo'` como **string literal** dentro de `@ManyToOne(...)`, no la clase `Equipo` importada como valor — MikroORM resuelve ese string contra el nombre de la entidad registrada en el discovery inicial (ver `orm.ts`, `entities: ['dist/**/*.entity.js']`), así que nunca necesita la clase real en el momento en que se define el decorador, solo el nombre.

## bcrypt (hashear contraseñas)

**La idea en criollo**: nunca hay que guardar una contraseña como texto plano en la base — si alguien accede a la base (por un backup filtrado, un empleado malintencionado, un bug), tendría todas las contraseñas de todos los usuarios en texto legible. bcrypt es una función que transforma la contraseña en un texto irreversible ("hash") — no hay forma de volver del hash a la contraseña original, ni siquiera para el propio sistema. Para verificar un login, no se "deshashea" nada: se hashea la contraseña que el usuario acaba de tipear y se compara ese resultado contra el hash guardado.

**El ejemplo real** — `jugador.controler.ts`, al crear un jugador:

```ts
if (data.contraseña) {
  data.contraseña = await bcrypt.hash(data.contraseña, 10);
}
```

(el `10` es el "costo" — cuántas rondas de procesamiento aplica bcrypt; más rondas, más lento de calcular a propósito, lo cual es deseable: hace que probar contraseñas por fuerza bruta sea más costoso para un atacante). Y al hacer login:

```ts
const contraseñaValida = await bcrypt.compare(contraseña, jugador.contraseña);
```

**Un caso particular en este proyecto** — `AdminTorneo.login()` detecta si la contraseña guardada todavía está en texto plano (dato viejo, de antes de que el proyecto usara bcrypt) y, si el login es correcto comparando texto plano, la hashea recién en ese momento:

```ts
if (admin.contraseña.startsWith('$2')) {
  passwordValida = await bcrypt.compare(password, admin.contraseña);
} else {
  passwordValida = password === admin.contraseña;
  if (passwordValida) {
    admin.contraseña = await bcrypt.hash(password, 10);
    await em.flush();
  }
}
```

(`$2` es el prefijo con el que siempre arranca un hash de bcrypt — `$2a$`, `$2b$`, etc. — así que sirve para distinguir "esto ya es un hash" de "esto es texto plano".) Es una migración progresiva: en vez de tener que rehashear todas las contraseñas viejas de una sola vez con un script, cada una se convierte sola la próxima vez que su dueño hace login. `GET /adminTorneo/fix-passwords` hace lo mismo pero de una sola vez, para todos los admins restantes — ver `pendientes.md` para por qué ese endpoint en particular es problemático (es un `GET` público que modifica datos).
