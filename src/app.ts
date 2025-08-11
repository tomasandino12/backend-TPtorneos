import 'reflect-metadata'
import { RequestContext } from '@mikro-orm/core';
import express from 'express'
import { jugadorRouter } from './jugador/jugador.routes.js'
import { canchaRouter } from './cancha/cancha.routes.js' 
import {orm, syncSchema} from './shared/db/orm.js'

const app = express()
app.use(express.json())  //middleware de express para usar (solo parchea json)

//luego de los middlewares base 
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
})
//antes de las rutas y middlewares del negocio 

app.use('/api/jugadores', jugadorRouter)    //que use ese router para todas las peticiones a esa url
app.use('/api/canchas', canchaRouter)       // 👈 nuevo uso del router

app.use((_, res) => {
    res.status(404).send({ message: 'Resource not found' }) // manejador de errores
})


await syncSchema() //never in production. Solo vamos a utilizarlo en desarrollo

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000/")  //inicializamos el servidor
})



//esta la posibilidad de hacer un routes.ts, de la misma jerarquia que app.ts, para simplificar aun mas el codigo