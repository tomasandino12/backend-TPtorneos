import { Repository } from "../shared/repository.js";
import { Jugador } from "./jugador.entity.js";
import { pool } from "../shared/db/conn.mysql.js";

export class JugadorRepository implements Repository<Jugador>{

    public async findAll(): Promise<Jugador[] | undefined> {
        const [jugadores] = await pool.query('select * from jugadores')
        return jugadores as Jugador[]
    }

    public async findOne(item: { id: string; }): Promise<Jugador | undefined> {
        throw new Error('not implemented')
    }

    public async add(item: Jugador): Promise<Jugador | undefined> {
        throw new Error('not implemented')
    }

    public async update(item: Jugador): Promise<Jugador | undefined> {
        throw new Error('not implemented')
    }

    public async delete(item: { id: string; }): Promise<Jugador | undefined> {
        throw new Error('not implemented')
    }


}