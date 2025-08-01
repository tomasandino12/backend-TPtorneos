import crypto from 'node:crypto';
export class Jugador {
    constructor(nombre, direccion, tipoSuperficie, capacidad, idCancha = crypto.randomUUID()) {
        this.nombre = nombre;
        this.direccion = direccion;
        this.tipoSuperficie = tipoSuperficie;
        this.capacidad = capacidad;
        this.idCancha = idCancha;
    }
}
//# sourceMappingURL=cancha.entity.js.map