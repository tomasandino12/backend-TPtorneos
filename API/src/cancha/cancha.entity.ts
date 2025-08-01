import crypto from 'node:crypto'

export class Jugador{
    constructor(
        public nombre: string,
        public direccion: string,
        public tipoSuperficie: string,
        public capacidad: number,
        public idCancha = crypto.randomUUID()
    ) {}
}