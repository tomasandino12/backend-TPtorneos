import { Repository } from "../shared/repository.js";
import { Jugador } from "./jugador.entity.js";

const jugadores= [
    new Jugador(
        'Charly Cocoliso',
        'Gonzales',
        '46446643',
        'cocoliso@gmail.com',
        '10/02/98',
        'centro delantero',
        'a02b91bc-3769-4221-beb1-d7a3aeba7dad'
    ),
]

export class JugadorRepository implements Repository<Jugador>{

    public findAll(): Jugador[] | undefined {
        return jugadores
    }

    public findOne(item: { id: string; }): Jugador | undefined {
        return jugadores.find((jugador)=> jugador.idJugador === item.id)
    }

    public add(item: Jugador): Jugador | undefined {
        jugadores.push(item)
        return item
    }

    public update(item: Jugador): Jugador | undefined {
        const jugadorIdx = jugadores.findIndex((jugador) => jugador.idJugador === item.idJugador)   //findIndex devuelve indice del arreglo donde esta ese character, si lo hiciera sin index crearía otro character en memoria 

        if(jugadorIdx !== -1){
            jugadores[jugadorIdx] = {...jugadores[jugadorIdx], ...item } 
        }
        return jugadores[jugadorIdx]
    }

    public delete(item: { id: string; }): Jugador | undefined {

        const jugadorIdx = jugadores.findIndex((jugador) => jugador.idJugador === item.id)  //a veces le jode item.id y le cambio a item.idJugador pero no se pq a veces no marca ese error
        if(jugadorIdx !== -1){
            const deletedJugadores = jugadores[jugadorIdx]
            jugadores.splice(jugadorIdx,1)        
            return deletedJugadores
        } 
    }


}