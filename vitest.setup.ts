import { config } from 'dotenv';

// Carga .env.test ANTES que cualquier test importe el resto de la app —
// así, cuando `app.ts`/`orm.ts` hagan su propio `import 'dotenv/config'`
// (que carga .env), dotenv no pisa las variables que ya están seteadas acá
// (comportamiento por defecto: no sobreescribe variables ya presentes en
// process.env). Resultado: los tests siempre usan gestordetorneos_test,
// nunca la base de desarrollo real.
config({ path: '.env.test' });
