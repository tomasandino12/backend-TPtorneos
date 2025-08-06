Casi todo fue modificado luego de consulta del 6/8, los archivos dentro de src tienen que ser .ts y los del dist pueden tener .js o .js.map.  y ahora toda la parte de configuracion esta dentro de la carpeta Backend q guarda todo el proyecto

CONSEJOS Y DATOS:
Si algo no funciona puede ser buena idea borrar la carpeta dist, solo con pnpm start:dev se vuelve a lanzar y por ahi arregla algun archivo viejo q daba errores

Tambien podemos borrar node_modules y lo volvemos a generar con pnpm install

Si tienen docker desktop tocando los 3 puntos del contenedor y copiando la docker run y pegandola en algun lado tiene data de el usuario la contraseña, el nombre de la pase de datos y si pone -p 3307:3306 significa que para la conexion usa el puerto fisico 3307 de tu compu pero usa el puerto 3306 virtual de docker

No seguir haciendo la crud con los videos de SQL pasar directo a MicroORM, los videos eran para entender la logica por debajo de las consultas que MicroORM hace, este creara las tablas y hara las consultas para dejar esa crud con persistencia como pedian en la entrega

Le cambie el nombre a cancha.entity que hizo Gero a cancha.entity.mem porque el profe me dijo que cuando arranquemos con MicroORM vamos a decirle que arme las tablas diciendole donde encontrar los archivos que describan la entidad y que lo va a confundir tener 2 archivos que terminen en entity.ts por lo cual cambie el de Gero para poder probar eso luego cuando vea los videos.
Igualmente no entendi como haria luego MicroORM para tener varias entidades y manejarlas en simultaneo. 
CUALQUIER DUDA SACAR CONSULTA VIRTUAL EN VEZ DE HACERSE LIO, LITERALMENTE EN 20 MINUTOS LO RESUELVEN CON EL PROFE
