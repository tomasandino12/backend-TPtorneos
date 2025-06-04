import express from 'express'
import { jugadorRouter } from './jugador/jugador.routes.js'
const app = express()
app.use(express.json())  //middleware de express para usar (solo parchea json)

app.use('/api/jugadores', jugadorRouter)    //que use ese router para todas las peticiones a esa url     uso router como unico elemento importado

app.use((_,res)=>{
    res.status(404).send({message: 'Resource not found'})            // manejador de errores y recursos (se podria incluir en el router)
})

app.listen(3000, ()=>{
    console.log("Server running on http://localhost:3000/")          //inicializamos el servidor
})


//user-> request -> express -> middleware (forma req.body)-> app.post (no le llega toda la info del req.body necesita un middleware)-> responese -> user
//2 formas middle; en la ruta del post o si quiero que sea para todos y poner el app.use
// inicializacion de nuestras app, necesito solo una linea para agregar un nuevo crud

// el routes llama las funciones enviando parametros y middleware si necesita, el controler tiene la logica de negocio
// algo externo o ind al personaje creo nuevo directorio y puedo empezar a utilizarlo