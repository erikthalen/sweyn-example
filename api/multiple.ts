import { createRequestHandler } from './../sweyn/helpers.ts'

export const first = await createRequestHandler((req, res) => {
  throw { status: 500, message: 'this is an error' }
})

export const second = await createRequestHandler((req, res) => {
  return { data: 'response from api/multiple/second' }
})
