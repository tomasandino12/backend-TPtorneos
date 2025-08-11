// src/partido/partido.controller.ts
import { Request, Response, NextFunction } from 'express'
import { orm } from '../shared/db/orm.js'
import { Partido } from './partido.entity.js'
import { Cancha } from '../cancha/cancha.entity.js'

const em = orm.em

function sanitizePartidoInput(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  req.body.sanitizedInput = {
    fecha_partido: req.body.fecha_partido,
    hora_partido: req.body.hora_partido,
    estado_partido: req.body.estado_partido,
    goles_local: req.body.goles_local,
    goles_visitante: req.body.goles_visitante,
    canchaId: req.body.canchaId, // opcional (PK de Cancha)
  }

  Object.keys(req.body.sanitizedInput).forEach((k) => {
    if (req.body.sanitizedInput[k] === undefined) delete req.body.sanitizedInput[k]
  })
  next()
}

async function findAll(_req: Request, res: Response) {
  try {
    const partidos = await em.find(Partido, {}, { populate: ['cancha'] })
    res.status(200).json({ message: 'found all partidos', data: partidos })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id)
    const partido = await em.findOne(Partido, { id }, { populate: ['cancha'] })
    if (!partido) return res.status(404).json({ message: 'partido not found' })
    res.status(200).json({ message: 'found partido', data: partido })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

async function add(req: Request, res: Response) {
  try {
    const data = { ...req.body.sanitizedInput }

    if (data.canchaId !== undefined) {
      data.cancha = em.getReference(Cancha, Number(data.canchaId))
      delete data.canchaId
    }

    const partido = em.create(Partido, data)
    await em.persistAndFlush(partido)
    res.status(201).json({ message: 'partido created', data: partido })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id)
    const partidoToUpdate = await em.findOne(Partido, { id })
    if (!partidoToUpdate) return res.status(404).json({ message: 'partido not found' })

    const data = { ...req.body.sanitizedInput }
    if (data.canchaId !== undefined) {
      data.cancha = em.getReference(Cancha, Number(data.canchaId))
      delete data.canchaId
    }

    em.assign(partidoToUpdate, data)
    await em.flush()
    res.status(200).json({ message: 'partido updated', data: partidoToUpdate })
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id)
    const partido = await em.findOne(Partido, { id })
    if (!partido) return res.status(404).json({ message: 'partido not found' })
    await em.removeAndFlush(partido)
    res.status(204).end()
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

export { sanitizePartidoInput, findAll, findOne, add, update, remove }
