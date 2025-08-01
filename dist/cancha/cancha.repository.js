import { pool } from "../shared/db/conn.mysql.js";
export class CanchaRepository {
    async findAll() {
        const [canchas] = await pool.query('SELECT * FROM canchas');
        return canchas;
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
//# sourceMappingURL=cancha.repository.js.map