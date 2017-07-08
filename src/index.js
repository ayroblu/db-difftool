const fs = require('fs')
const Schema = require('./Schema')
const Differ = require('./Differ')
const CommandGenerator = require('./CommandGenerator')

async function run(config){
  const schema = new Schema(config)
  const db = await schema.getSchema()

  const dbString = JSON.stringify(db, null, 2)
  fs.writeFileSync('db-lock.json', dbString)

  const generator = new CommandGenerator()
  generator.generateCreateTables(db.schema)
}
async function runRead(config){
  const schema = new Schema(config)
  const db = await schema.getSchema()

  const savedDb = require('./db-lock.json')
  const differ = new Differ()
  differ.diff(db, savedDb)
}

module.exports = {
  genDb: run
, diffDb: runRead
}
