import express, { NextFunction, Request, Response } from 'express'
import { Character } from './character/character.entity.js'
import { CharacterRepository } from './character/character.repository.js'
const app = express()
app.use(express.json())  //middleware de express para usar (solo parchea json)

//user-> request -> express -> middleware (forma req.body)-> app.post (no le llega toda la info del req.body necesita un middleware)-> responese -> user
//2 formas middle; en la ruta del post o si quiero que sea para todos y poner el app.use
// get(obtengo info del servidor sobre recursos)  si uso get a una url agarro todos, si pongo /:id al final agarro uno particular
// post(crear nuevos recursos)
// delete(borrar recursos) debo indicar cual borrar
// put & patch (modificar recursos) debo indicar cual modificar

// accedo a recursos mediante url /api/version(puede no estar)/recursos/

const repository = new CharacterRepository()

const characters= [
    new Character(
        'Darth Vader',
        10,
        100,
        ['Lightsaber', 'Death Star'],
        'a02b91bc-3769-4221-beb1-d7a3aeba7dad'
    ),
]

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

app.get('/api/characters', (req, res) =>{
    res.json({data : repository.findAll()})   //me sirve saber que todos devuelven lo mismo asi se q tengo q buscar en propiedad data  (más consistente)
})

app.get('/api/characters/:id', (req,res) =>{
    const character = repository.findOne({id : req.params.id})
    if(!character) {
        res.status(404).send({message: 'Character not found'})
        return
    }
    res.json({data : character})   //en caso de encontrarlo (el de arriba es si no encuentra)
})

app.post('/api/characters',sanitizeCharacterInput, (req, res) => {                                         // no necesito middleware en la ruta pq esta global
    const input = req.body.sanitizedInput                                    //obtengo la data basado ne los elementos
    
    const characterInput = new Character( input.name, input.level, input.attack, input.items )

    const character = repository.add(characterInput)
    res.status(201).send({message: 'Character created', data: character})
})

app.put('/api/characters/:id',sanitizeCharacterInput, (req, res)=> {
    req.body.sanitizedInput.id = req.params.id
    const character = repository.update(req.body.sanitizedInput)
    
    if(!character){
        res.status(404).send({message: 'Character not found' })
        return
    }

    res.status(200).send({message: 'Character updated successfully', data: character})
})


app.patch('/api/characters/:id',sanitizeCharacterInput, (req, res)=> {
    req.body.sanitizedInput.id = req.params.id
    const character = repository.update(req.body.sanitizedInput)
    
    if(!character){
        res.status(404).send({message: 'Character not found' })
        return
    }

    res.status(200).send({message: 'Character updated successfully', data: character})
})

app.delete('/api/characters/:id', (req, res)=>{
    const id = req.params.id
    const character = repository.delete({id})


    if(!character){
        res.status(404).send({message: 'Character not found'})
    }else{
        res.status(200).send({message:'Character deleted successfully'})
    }
})

app.use((_,res)=>{
    res.status(404).send({message: 'Resource not found'})
})

app.listen(3000, ()=>{
    console.log("Server running on http://localhost:3000/")
})