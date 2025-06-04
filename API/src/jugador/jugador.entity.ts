import crypto from 'node:crypto'

export class Jugador{
    constructor(
        public nombre: string,
        public apellido: string,
        public dni: string,
        public email: string,
        public fechaNacimiento: string,
        public posicion: string,
        public idJugador = crypto.randomUUID()
    ) {}
}