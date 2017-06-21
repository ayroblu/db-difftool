const fs = require('fs')
const config = require('./config')

const knex = require('knex')(config)
const _ = require('lodash')

const pgSystemSchemas = ['pg_catalog', 'information_schema']

class Schema {
  async getSchema(){
    const schema = await knex.select().from('information_schema.columns').whereNotIn('table_schema', pgSystemSchemas)
    const groupedSchema = groupSchema(schema)
    // first, group by table_catalog, then table_schema, table_name, column_name, (maybe order by ordinal position)
    // Params are, column_default, is_nullable, data_type
    // NOTE: udt_name seems more appropriate?
    const roles = await knex.select().from('information_schema.role_table_grants').whereNotIn('table_schema', pgSystemSchemas)
    const groupedRoles = groupRoles(roles)

    return {schema: groupedSchema, roles: groupedRoles}
  }
  groupAsObject(arr, keys, getFinal){
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
  groupSchema(schema){
    let groupedSchema = groupAsObject(schema, ['table_catalog', 'table_schema', 'table_name', 'column_name'], row=>_.pick(row, ['column_default', 'is_nullable', 'data_type', 'udt_name']))
    return groupedSchema
  }
  groupRoles(schema){
    let groupedSchema = groupAsObject(schema, ['grantee', 'table_catalog', 'table_schema', 'table_name'], row=>_.pick(row, ['privilege_type', 'grantor']))
    return groupedSchema
  }
}
async function run(){
  const schema = new Schema()
  const db = await schema.getSchema()
  const dbString = JSON.stringify(db, null, 2)
  fs.writeFileSync('db-lock.json', dbString)
  console.log(`Done, num schema: ${schema.length}, num roles: ${roles.length}`)
  process.exit()
}
run().catch(err=>{
  console.error('Error running', err)
})
