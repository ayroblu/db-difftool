const knexConfig = require('knex')
const _ = require('lodash')

const pgSystemSchemas = ['pg_catalog', 'information_schema']
let knex = null

class Schema {
  constructor(config){
    knex = knexConfig(config)
  }
  async getSchema(){
    const schema = await knex.select().from('information_schema.columns').whereNotIn('table_schema', pgSystemSchemas)
      .orderBy('table_catalog').orderBy('table_schema').orderBy('table_name').orderBy('ordinal_position')
    const groupedSchema = this._groupSchema(schema)
    // first, group by table_catalog, then table_schema, table_name, column_name, (maybe order by ordinal position)
    // Params are, column_default, is_nullable, data_type
    // NOTE: udt_name seems more appropriate?

    const roles = await knex.select().from('information_schema.role_table_grants').whereNotIn('table_schema', pgSystemSchemas)
      .orderBy('grantee').orderBy('table_catalog').orderBy('table_schema').orderBy('table_name').orderBy('privilege_type')
    const groupedRoles = this._groupRoles(roles)

    const constraints = await knex.select('c.*', 't.constraint_type').from('information_schema.constraint_column_usage as c')
      .join('information_schema.table_constraints as t', {
        'c.table_catalog': 't.table_catalog', 'c.table_schema': 't.table_schema'
      , 'c.table_name':'t.table_name', 'c.constraint_name': 't.constraint_name'
      })
      .whereNotIn('t.table_schema', pgSystemSchemas)
      .whereNot('t.constraint_type', 'CHECK')

    this._mergeConstraints(groupedSchema, constraints)

    const sequences = await knex.select().from('information_schema.sequences').whereNotIn('sequence_schema', pgSystemSchemas)
    const groupedSequences = this._groupSequences(sequences)

    return {schema: groupedSchema, roles: groupedRoles, sequences: groupedSequences}
  }
  _groupAsObject(arr, keys, getFinal){
    const key = keys.slice(0, 1)
    const newKeys = keys.slice(1)
    return arr.reduce((a,n)=>{
      if (newKeys.length){
        if (!a[n[key]]){
          const newArr = arr.filter(r=>r[key] === n[key])
          a[n[key]] = this._groupAsObject(newArr, newKeys, getFinal)
        }
      } else {
        const newArr = arr.filter(r=>r[key] === n[key])
        a[n[key]] = getFinal(n, newArr)
      }
      return a
    }, {})
  }
  _groupSchema(schema){
    let groupedSchema = this._groupAsObject(schema, ['table_catalog', 'table_schema', 'table_name']
    //, row=>_.pick(row, ['column_default', 'is_nullable', 'data_type', 'udt_name']))
    , (row, arr)=>arr.map(a=>_.pick(a, ['column_name', 'column_default', 'is_nullable', 'data_type', 'udt_name'])))
    return groupedSchema
  }
  _groupRoles(schema){
    let groupedSchema = this._groupAsObject(schema, ['grantee', 'table_catalog', 'table_schema', 'table_name']
    //, (row, arr)=>arr.map(a=>_.pick(a, ['privilege_type', 'grantor'])))
    , (row, arr)=>arr.map(a=>a.privilege_type))
    return groupedSchema
  }
  _groupSequences(sequences){
    let groupedSequences = this._groupAsObject(sequences, ['sequence_catalog', 'sequence_schema', 'sequence_name']
    , (row, arr)=>arr.map(a=>_.pick(a, [
        'data_type', 'numeric_precision', 'numeric_precision_radix', 'numeric_scale'
      , 'start_value', 'minimum_value', 'maximum_value', 'increment', 'cycle_option'
      ])))
    return groupedSequences
  }
  _mergeConstraints(db, constraints){
    constraints.forEach(c=>{
      const {table_catalog, table_schema, table_name, column_name, constraint_name, constraint_type} = c
      const columns = db[table_catalog][table_schema][table_name]
      const column = columns.find(c=>c.column_name===column_name)
      if (!column.constraints){
        column.constraints = []
      }
      column.constraints.push({constraint_name, constraint_type})
    })
    //let groupedSchema = this._groupAsObject(schema, ['table_catalog', 'table_schema', 'table_name', 'column_name']
    //, (row, arr)=>arr.map(a=>_.pick(a, ['constraint_name', 'constraint_type'])))
  }
}

module.exports = Schema
