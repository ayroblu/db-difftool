const fs = require('fs')
const config = require('./config')

const knex = require('knex')(config)
const _ = require('lodash')

const pgSystemSchemas = ['pg_catalog', 'information_schema']
let count = 0

async function getSchema(){
  const schema = await knex.select().from('information_schema.columns').whereNotIn('table_schema', pgSystemSchemas)
  console.log('schema len:', schema.length)
  const groupedSchema = groupSchema(schema)
  console.log('groupedSchema', JSON.stringify(groupedSchema, null, 2))
  // first, group by table_catalog, then table_schema, table_name, column_name, (maybe order by ordinal position)
  // Params are, column_default, is_nullable, data_type
  // NOTE: udt_name seems more appropriate?
  const permissions = await knex.select().from('information_schema.role_table_grants').whereNotIn('table_schema', pgSystemSchemas)
  console.log('permissions len:', permissions.length)
  const groupedPermissions = groupRoles(permissions)
  console.log('groupedPermissions', JSON.stringify(groupedPermissions, null, 2))
  process.exit()
}
function groupAsObject(arr, keys, getFinal){
  const key = keys.slice(0, 1)
  const newKeys = keys.slice(1)
  return arr.reduce((a,n)=>{
    if (newKeys.length){
      if (!a[n[key]]){
        const newArr = arr.filter(r=>r[key] === n[key])
        a[n[key]] = groupAsObject(newArr, newKeys, getFinal)
      }
    } else {
      a[n[key]] = getFinal(n)
    }
    return a
  }, {})
}
function groupSchema(schema){
  let groupedSchema = groupAsObject(schema, ['table_catalog', 'table_schema', 'table_name', 'column_name'], row=>_.pick(row, ['column_default', 'is_nullable', 'data_type', 'udt_name']))
  return groupedSchema
}
function groupRoles(schema){
  let groupedSchema = groupAsObject(schema, ['grantee', 'table_catalog', 'table_schema', 'table_name'], row=>_.pick(row, ['privilege_type', 'grantor']))
  return groupedSchema
}
async function genLock(){
  const schema = await knex.select().from('information_schema.columns').whereNotIn('table_schema', pgSystemSchemas)
    .orderBy('table_catalog').orderBy('table_schema').orderBy('table_name').orderBy('column_name')
  const roles = await knex.select().from('information_schema.role_table_grants').whereNotIn('table_schema', pgSystemSchemas)
    .orderBy('grantee').orderBy('table_catalog').orderBy('table_schema').orderBy('table_name').orderBy('privilege_type')

  const slimSchema = schema.map(s=>_.pick(s, ['table_catalog', 'table_schema', 'table_name', 'column_name', 'column_default', 'is_nullable', 'data_type', 'udt_name']))
    //.map(s=>JSON.stringify(s))
  const slimRoles = roles.map(r=>_.pick(r, ['grantee', 'table_catalog', 'table_schema', 'table_name', 'privilege_type', 'grantor']))
    //.map(s=>JSON.stringify(s))
  const db = {schema: slimSchema, roles: slimRoles}
  const dbString = JSON.stringify(db, null, 2)
  fs.writeFileSync('db-lock.json', dbString)

  //console.log(JSON.stringify(db, null, 2))
  process.exit()
}
//getSchema()
genLock()

