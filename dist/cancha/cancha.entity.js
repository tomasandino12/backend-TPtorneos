var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, Property, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/db/baseEntity.entity.js';
import { Partido } from '../partido/partido.entity.js';
export let Cancha = class Cancha extends BaseEntity {
    constructor() {
        super(...arguments);
        this.partidos = new Collection(this);
    }
};
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Cancha.prototype, "nombre", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Cancha.prototype, "direccion", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", String)
], Cancha.prototype, "tipoSuperficie", void 0);
__decorate([
    Property({ nullable: false }),
    __metadata("design:type", Number)
], Cancha.prototype, "capacidad", void 0);
__decorate([
    OneToMany(() => Partido, p => p.cancha),
    __metadata("design:type", Object)
], Cancha.prototype, "partidos", void 0);
Cancha = __decorate([
    Entity()
], Cancha);
//# sourceMappingURL=cancha.entity.js.map