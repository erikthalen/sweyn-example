export default (_, res) => {
  res.end(JSON.stringify({ data: 'response from api/hello-world.ts' }))
}
