const help = `
  Usage: db-difftool [command] [options]


  Commands:
    
    gen [options] generates a lock file
    read [options] compares database with lock file

  Options:

    -h, --help               output usage information
    -v, --version            output the version

  Connection options:

    -H, --host               database server host or socket directory (default: "/var/run/postgresql")
    -p, --port               database server port (default: "5432")
    -U, --user               database user name
    -P, --password           database password
    -d, --database           database name

  Example:

    $ db-difftool gen -H localhost -p 5432 -U username -P password -d dbname
    $ db-difftool read -H localhost -p 5432 -U username -P password -d dbname
`
const tooMany = `
  Sorry you've provided too many commands
`


module.exports = {
  help
, tooMany
}
