const _ = require('lodash')

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

module.exports = Differ
