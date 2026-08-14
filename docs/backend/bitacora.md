# Bitácora informal de desarrollo

Notas que se fueron dejando en el `README.md` de la raíz del repo durante los primeros días de desarrollo (antes de que existiera esta carpeta `docs/`), mientras el equipo aprendía MikroORM. Se movieron acá tal cual, sin reescribir, porque documentan decisiones y confusiones reales del proceso — justo lo que pide la cátedra como registro de avance — y el README raíz necesitaba dejar de ser un diario para convertirse en instrucciones de instalación.

---

Casi todo fue modificado luego de consulta del 6/8, los archivos dentro de src tienen que ser .ts y los del dist pueden tener .js o .js.map. Y ahora toda la parte de configuración está dentro de la carpeta Backend que guarda todo el proyecto.

**Consejos y datos:**

Si algo no funciona puede ser buena idea borrar la carpeta `dist`, solo con `pnpm start:dev` se vuelve a lanzar y por ahí arregla algún archivo viejo que daba errores.

También podemos borrar `node_modules` y lo volvemos a generar con `pnpm install`.

Si tienen Docker Desktop, tocando los 3 puntos del contenedor y copiando el `docker run` y pegándola en algún lado, tiene la data del usuario, la contraseña, el nombre de la base de datos, y si pone `-p 3307:3306` significa que para la conexión usa el puerto físico 3307 de tu compu pero usa el puerto 3306 virtual de Docker.

No seguir haciendo el CRUD con los videos de SQL, pasar directo a MikroORM — los videos eran para entender la lógica por debajo de las consultas que MikroORM hace; este creará las tablas y hará las consultas para dejar ese CRUD con persistencia como pedían en la entrega.

Le cambié el nombre a `cancha.entity` que hizo Gero a `cancha.entity.mem` porque el profe dijo que cuando arranquemos con MikroORM vamos a decirle que arme las tablas diciéndole dónde encontrar los archivos que describan la entidad, y que lo va a confundir tener 2 archivos que terminen en `entity.ts`, por lo cual cambié el de Gero para poder probar eso luego cuando vea los videos. Igualmente no entendí cómo haría luego MikroORM para tener varias entidades y manejarlas en simultáneo.

Cualquier duda, sacar consulta virtual en vez de hacerse lío — literalmente en 20 minutos lo resuelven con el profe.

**11/8** — Luego de ver los primeros videos de MikroORM hice la actualización de controler, entity y routes de canchas. También creé el CRUD de partidos para poder probar las relaciones de MikroORM y cómo funcionan (en este caso probé la relación de cancha y partidos, que es de 1..n).
