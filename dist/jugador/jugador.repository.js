import { pool } from "../shared/db/conn.mysql.js";
export class JugadorRepository {
    async findAll() {
        const [jugadores] = await pool.query('select * from jugadores');
        return jugadores;
    }
    async findOne(item) {
        throw new Error('not implemented');
    }
    async add(item) {
        throw new Error('not implemented');
    }
    async update(item) {
        throw new Error('not implemented');
    }
    async delete(item) {
        throw new Error('not implemented');
    }
}
//# sourceMappingURL=jugador.repository.js.map