const fs = require('fs')
const config = require('./config')

const knex = require('knex')(config)
const _ = require('lodash')

const pgSystemSchemas = ['pg_catalog', 'information_schema']

async function genLock(){
  const schema = await knex.select().from('information_schema.columns').whereNotIn('table_schema', pgSystemSchemas)
    .orderBy('table_catalog').orderBy('table_schema').orderBy('table_name').orderBy('column_name')
  const roles = await knex.select().from('information_schema.role_table_grants').whereNotIn('table_schema', pgSystemSchemas)
    .orderBy('grantee').orderBy('table_catalog').orderBy('table_schema').orderBy('table_name').orderBy('privilege_type')

  const slimSchema = schema.map(s=>_.pick(s, ['table_catalog', 'table_schema', 'table_name', 'column_name', 'column_default', 'is_nullable', 'data_type', 'udt_name']))
  const slimRoles = roles.map(r=>_.pick(r, ['grantee', 'table_catalog', 'table_schema', 'table_name', 'privilege_type', 'grantor']))

  const db = {schema: slimSchema, roles: slimRoles}
  const dbString = JSON.stringify(db, null, 2)
  fs.writeFileSync('db-lock.json', dbString)

  process.exit()
}
genLock()
