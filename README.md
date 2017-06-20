DB Difftool
===========
This is something for me to try out to make database management a little easier
As of this date, it just generates a lock file - thinking of the yarn lock file that's generated with npm modules - then you can check differences with git

Goals:
------
1. Difference between my database definition and my current database
2. Include both permissions and table definitions (what about views, stored procs etc...)
3. Generate ALTER TABLE's or similar to make current database match definition

