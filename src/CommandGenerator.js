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

module.exports = CommandGenerator
