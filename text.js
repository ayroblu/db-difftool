const help = `
  Usage: db-difftool [command] [options]


  Commands:
    
    gen [options] generates a lock file

  Options:

    -h, --help               output usage information
    -v, --version            output the version

  Connection options:

    -H, --host               database server host or socket directory (default: "/var/run/postgresql")
    -p, --port               database server port (default: "5432")
    -U, --username           database user name
    -P, --password           database password
`
const tooMany = `
  Sorry you've provided too many commands
`


module.exports = {
  help
, tooMany
}
