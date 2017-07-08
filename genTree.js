const fs = require('fs')
const config = require('./config')

const knex = require('knex')(config)
const _ = require('lodash')

const pgSystemSchemas = ['pg_catalog', 'information_schema']

class Schema {
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
const kn = require('knex')({client: 'pg'})
class CommandGenerator {
  generateCreateTables(db){
    Object.keys(db).forEach(table_catalog=>{
      const database = db[table_catalog]
      Object.keys(database).forEach(table_schema=>{
        const schema = database[table_schema]
        Object.keys(schema).forEach(table_name=>{
          const table = schema[table_name]
          const self = this
          const ct = kn.schema.withSchema(table_schema).createTable(table_name, function (tb) {
            table.forEach(col=>{
              let tableCol = self._makeColumn(col, tb, table_name)
              tableCol = self._makeColumnNull(col, tableCol, table_name)
              tableCol = self._makeColumnDefault(col, tableCol, table_name)
            })
          }).toString()
          console.log(ct)
        })
      })
    })
  }
  _makeColumnDefault(col, tableCol, tableName){
    if (col.column_default){
      tableCol.defaultTo(col.column_default)
    }
    return tableCol
  }
  _makeColumnNull(col, tableCol, tableName){
    if (col.constraints && col.constraints.find(c=>c.constraint_type==='PRIMARY KEY')){
      return tableCol
    }
    if (col.is_nullable === 'NO'){
      return tableCol.notNullable()
    }
    return tableCol
  }
  _makeColumn(col, tb, tableName){
    const colName = col.column_name
    switch(col.udt_name){
      case 'citext':
        return tb.specificType(colName, 'citext')
      case 'int4':
        //if (col.column_default) console.log('col', `nextval('${tableName}_${colName}_seq'::regclass)`, 'def', col.column_default)
        if (col.column_default && `nextval('${tableName}_${colName}_seq'::regclass)` === col.column_default){
          if (col.constraints && col.constraints.find(c=>c.constraint_type==='PRIMARY KEY')){
            return tb.increments(colName)
          } else {
            return tb.specificType(colName, 'serial')
          }
        }
        return tb.integer(colName)
      case 'bool':
        return tb.boolean(colName)
      case 'uuid':
        return tb.uuid(colName)
      case 'bytea':
        return tb.specificType(colName, 'bytea')
        return //tb.bytea(colName)
      case 'timestamp':
        return tb.timestamp(colName, true)
      case 'timestamptz':
        return tb.timestamp(colName)
      case 'text':
        return tb.text(colName)
    }
  }
}
class Differ {
  diff(db0, db1){
    this._diffSchema(db0.schema, db1.schema)
  }
  _diffSchema(db0, db1){
    // what's in db0 that isn't in db1
    const extraDB = _.difference(Object.keys(db0), Object.keys(db1))
    // what's in db1 that isn't in db0
    const missingDB = _.difference(Object.keys(db1), Object.keys(db0))
    if (extraDB.length){
      console.log('Extra DBs', extraDB)
    }
    if (missingDB.length){
      console.log('Missing DBs', missingDB)
    }
    const dbs = _.intersection(Object.keys(db0), Object.keys(db1))
    dbs.forEach(d=>{
      const d0 = db0[d]
      const d1 = db1[d]
      const extraSchema = _.difference(Object.keys(d0), Object.keys(d1))
      const missingSchema = _.difference(Object.keys(d1), Object.keys(d0))
      if (extraSchema.length){
        console.log('Extra schema', extraSchema)
      }
      if (missingSchema.length){
        console.log('Missing schema', missingSchema)
      }
      const schemas = _.intersection(Object.keys(d0), Object.keys(d1))
      schemas.forEach(s=>{
        const schema0 = d0[s]
        const schema1 = d1[s]
        const extraTable = _.difference(Object.keys(schema0), Object.keys(schema1))
        const missingTable = _.difference(Object.keys(schema1), Object.keys(schema0))
        if (extraTable.length){
          console.log('Extra schema', extraTable)
        }
        if (missingTable.length){
          console.log('Missing schema', missingTable)
        }
        const tables = _.intersection(Object.keys(schema0), Object.keys(schema1))
        tables.forEach(t=>{
          const table0 = schema0[t]
          const table1 = schema1[t]
          const extraColumn = _.differenceBy(table0, table1, 'column_name')
          const missingColumn = _.differenceBy(table1, table0, 'column_name')
          if (extraColumn.length){
            console.log('Extra schema', extraColumn)
          }
          if (missingColumn.length){
            console.log('Missing schema', missingColumn)
          }
          const columns = _.intersectionBy(table0, table1, 'column_name').map(t=>t.column_name)
          columns.forEach((c,i)=>{
            const column0 = table0.find(t=>t.column_name===c)
            const column1 = table1.find(t=>t.column_name===c)
            if (!_.isEqual(column0, column1)){
              console.log('Not equal', column0, column1)
            }
          })
          //const extraColumn = _.differenceBy(table0, table1, 'column_name')
          //const missingColumn = _.differenceBy(table1, table0, 'column_name')
        })
      })
    })
  }
}
async function run(){
  const schema = new Schema()
  const db = await schema.getSchema()

  const dbString = JSON.stringify(db, null, 2)
  fs.writeFileSync('db-lock.json', dbString)

  const generator = new CommandGenerator()
  generator.generateCreateTables(db.schema)

  process.exit()
}
async function runRead(){
  const schema = new Schema()
  const db = await schema.getSchema()

  const savedDb = require('./db-lock.json')
  const differ = new Differ()
  differ.diff(db, savedDb)

  process.exit()
}
run().catch(err=>{
  console.error('Error running', err)
})
//runRead().catch(err=>{
//  console.error('Error running', err)
//})
