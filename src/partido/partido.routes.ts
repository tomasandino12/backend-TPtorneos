import { Router } from 'express'
import {
  sanitizePartidoInput,
  findAll,
  findOne,
  add,
  update,
  remove,
} from './partido.controler.js'

export const partidoRouter = Router()

partidoRouter.get('/', findAll)

partidoRouter.get('/:id', findOne)

partidoRouter.post('/', sanitizePartidoInput, add)

partidoRouter.put('/:id', sanitizePartidoInput, update)

partidoRouter.patch('/:id', sanitizePartidoInput, update)

partidoRouter.delete('/:id', remove)
