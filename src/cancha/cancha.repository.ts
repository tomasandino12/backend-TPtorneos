import { Repository } from "../shared/repository.js"
import { Cancha } from "./cancha.entity.mem.js"
import { pool } from "../shared/db/conn.mysql.js"

export class CanchaRepository implements Repository<Cancha> {

    public async findAll(): Promise<Cancha[] | undefined> {
        const [canchas] = await pool.query('SELECT * FROM canchas')
        return canchas as Cancha[]
    }

    public async findOne(item: { id: string }): Promise<Cancha | undefined> {
        throw new Error('not implemented')
    }

    public async add(item: Cancha): Promise<Cancha | undefined> {
        throw new Error('not implemented')
    }

    public async update(item: Cancha): Promise<Cancha | undefined> {
        throw new Error('not implemented')
    }

    public async delete(item: { id: string }): Promise<Cancha | undefined> {
        throw new Error('not implemented')
    }
}
