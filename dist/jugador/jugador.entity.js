var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity';
import { Equipo } from '../equipo/equipo.entity.js';
export let Jugador = class Jugador extends BaseEntity {
};
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Jugador.prototype, "nombre", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Jugador.prototype, "apellido", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Jugador.prototype, "dni", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Jugador.prototype, "email", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Jugador.prototype, "fechaNacimiento", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Jugador.prototype, "contrase\u00F1a", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Jugador.prototype, "posicion", void 0);
__decorate([
    ManyToOne(() => Equipo),
    __metadata("design:type", Equipo)
], Jugador.prototype, "equipo", void 0);
Jugador = __decorate([
    Entity()
], Jugador);
//# sourceMappingURL=jugador.entity.js.map