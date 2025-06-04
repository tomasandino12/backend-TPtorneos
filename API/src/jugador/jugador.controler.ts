import { Request, Response, NextFunction } from "express"
import { JugadorRepository } from "./jugador.repository.js"
import { Jugador } from "./jugador.entity.js"

const repository = new JugadorRepository()

function sanitizeJugadorInput(req: Request, res: Response, next: NextFunction){
    req.body.sanitizedInput = {
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        dni: req.body.dni,
        email: req.body.email,
        fechaNacimiento: req.body.fechaNacimiento,
        posicion: req.body.posicion,
    }
    //aca deberia haber mas validaciones (tipos de datos, datos maliciosos,etc)
    Object.keys(req.body.sanitizedInput).forEach((key) =>{
        if(req.body.sanitizedInput[key] === undefined){
            delete req.body.sanitizedInput[key]
        }
    })
    next()
}

function findAll(req:Request, res:Response) {
    res.json({data : repository.findAll()})   
}

function findOne(req:Request, res:Response) {
const jugador = repository.findOne({id : req.params.id})  //no se si es req.params.id o idJugador pq no se si usa el nombre del id o es id del parametro
if(!jugador) {
    res.status(404).send({message: 'Jugador not found'})
    return
}
res.json({data : jugador})  
}



function add(req:Request, res:Response)  {                                         
    const input = req.body.sanitizedInput                     
    
    const jugadorInput = new Jugador( input.nombre, input.apellido, input.dni, input.email, input.fechaNacimiento, input.posicion ) //creo q es pq no tengo el jugador repository pero ahora miro eso

    const jugador = repository.add(jugadorInput)
    res.status(201).send({message: 'Jugador created', data: jugador})
}

function update(req:Request, res:Response) {
    req.body.sanitizedInput.idJugador = req.params.id
    const jugador = repository.update(req.body.sanitizedInput)
    
    if(!jugador){
        res.status(404).send({message: 'Jugador not found' })
        return
    }

    res.status(200).send({message: 'Jugador updated successfully', data: jugador})
}

function remove(req:Request, res:Response){
    const id = req.params.id
    const jugador = repository.delete({id})


    if(!jugador){
        res.status(404).send({message: 'Jugador not found'})
    }else{
        res.status(200).send({message:'Jugador deleted successfully'})
    }
}




export {sanitizeJugadorInput, findAll, findOne, add, update, remove}