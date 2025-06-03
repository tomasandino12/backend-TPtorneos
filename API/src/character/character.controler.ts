import { Request, Response, NextFunction } from "express"
import { CharacterRepository } from "./character.repository.js"
import { Character } from "./character.entity.js"

const repository = new CharacterRepository()

function sanitizeCharacterInput(req: Request, res: Response, next: NextFunction){
    req.body.sanitizedInput = {
        name: req.body.name,
        level: req.body.level,
        attack: req.body.attack,
        items: req.body.items,
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
const character = repository.findOne({id : req.params.id})
if(!character) {
    res.status(404).send({message: 'Character not found'})
    return
}
res.json({data : character})  
}



function add(req:Request, res:Response)  {                                         
    const input = req.body.sanitizedInput                     
    
    const characterInput = new Character( input.name, input.level, input.attack, input.items )

    const character = repository.add(characterInput)
    res.status(201).send({message: 'Character created', data: character})
}

function update(req:Request, res:Response) {
    req.body.sanitizedInput.id = req.params.id
    const character = repository.update(req.body.sanitizedInput)
    
    if(!character){
        res.status(404).send({message: 'Character not found' })
        return
    }

    res.status(200).send({message: 'Character updated successfully', data: character})
}

function remove(req:Request, res:Response){
    const id = req.params.id
    const character = repository.delete({id})


    if(!character){
        res.status(404).send({message: 'Character not found'})
    }else{
        res.status(200).send({message:'Character deleted successfully'})
    }
}




export {sanitizeCharacterInput, findAll, findOne, add, update, remove}