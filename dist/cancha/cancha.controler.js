import { CanchaRepository } from "./cancha.repository.js";
import { Cancha } from "./cancha.entity.mem.js";
const repository = new CanchaRepository();
function sanitizeCanchaInput(req, res, next) {
    req.body.sanitizedInput = {
        nombre: req.body.nombre,
        direccion: req.body.direccion,
        tipoSuperficie: req.body.tipoSuperficie,
        capacidad: req.body.capacidad
    };
    Object.keys(req.body.sanitizedInput).forEach((key) => {
        if (req.body.sanitizedInput[key] === undefined) {
            delete req.body.sanitizedInput[key];
        }
    });
    next();
}
function findAll(req, res) {
    res.json({ data: repository.findAll() });
}
function findOne(req, res) {
    const cancha = repository.findOne({ id: req.params.id });
    if (!cancha) {
        res.status(404).send({ message: 'Cancha not found' });
        return;
    }
    res.json({ data: cancha });
}
function add(req, res) {
    const input = req.body.sanitizedInput;
    const canchaInput = new Cancha(input.nombre, input.direccion, input.tipoSuperficie, input.capacidad);
    const cancha = repository.add(canchaInput);
    res.status(201).send({ message: 'Cancha created', data: cancha });
}
function update(req, res) {
    req.body.sanitizedInput.idCancha = req.params.id;
    const cancha = repository.update(req.body.sanitizedInput);
    if (!cancha) {
        res.status(404).send({ message: 'Cancha not found' });
        return;
    }
    res.status(200).send({ message: 'Cancha updated successfully', data: cancha });
}
function remove(req, res) {
    const id = req.params.id;
    const cancha = repository.delete({ id });
    if (!cancha) {
        res.status(404).send({ message: 'Cancha not found' });
    }
    else {
        res.status(200).send({ message: 'Cancha deleted successfully' });
    }
}
export { sanitizeCanchaInput, findAll, findOne, add, update, remove };
//# sourceMappingURL=cancha.controler.js.map