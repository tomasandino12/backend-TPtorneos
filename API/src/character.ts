import crypto from 'node:crypto'

export class Character{
    constructor(
        public name: string,
        public level: number,
        public attack: number,
        public items: string[],
        public id = crypto.randomUUID()
    ) {}
}