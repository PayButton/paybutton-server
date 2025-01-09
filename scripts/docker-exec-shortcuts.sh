#!/bin/bash

# docker container exec shortcuts

node_container_name="paybutton-dev"
db_container_name="paybutton-db"
cache_container_name="paybutton-cache"
base_command_node="docker exec -it $node_container_name"
base_command_node_root="docker exec  -it -u 0 $node_container_name"
base_command_db="docker exec -it $db_container_name"
base_command_cache="docker exec -it $cache_container_name"
command="$1"

. ./.env
. ./.env.local

# Check for missing variables
missing_vars=()
[ -z "$MAIN_DB_NAME" ] && missing_vars+=("MAIN_DB_NAME")
[ -z "$MAIN_DB_USER" ] && missing_vars+=("MAIN_DB_USER")
[ -z "$MAIN_DB_HOST" ] && missing_vars+=("MAIN_DB_HOST")
[ -z "$MAIN_DB_PORT" ] && missing_vars+=("MAIN_DB_PORT")
[ -z "$MAIN_DB_PASSWORD" ] && missing_vars+=("MAIN_DB_PASSWORD")
[ -z "$SUPERTOKENS_DB_USER" ] && missing_vars+=("SUPERTOKENS_DB_USER")
[ -z "$SUPERTOKENS_DB_PASSWORD" ] && missing_vars+=("SUPERTOKENS_DB_PASSWORD")

# Exit early if any variables are missing
if [ ${#missing_vars[@]} -ne 0 ]; then
    missing_vars_string=$(IFS=,; echo "${missing_vars[*]}")
    echo "Error: The following variables are missing: $missing_vars_string"
    exit 1
fi

shift
case "$command" in
    "nl" | "nextlogs")
        eval "$base_command_node" pm2 logs next
        ;;
    "nr" | "nextrestart")
        eval "$base_command_node" pm2 --time restart next
        ;;
    "database" | "db")
        eval "$base_command_db" mariadb -h "$MAIN_DB_HOST" -u "$MAIN_DB_USER" -p"$MAIN_DB_PASSWORD" -D "$MAIN_DB_NAME" "$@"
        ;;
    "databaseroot" | "dbr")
        eval "$base_command_db" mariadb -h "$MAIN_DB_HOST" -u root -p"$MAIN_DB_ROOT_PASSWORD" "$@"
        ;;
    "databasedump" | "dbd")
        eval "$base_command_db" mariadb-dump -h "$MAIN_DB_HOST" -u root -p"$MAIN_DB_ROOT_PASSWORD" "$@"
        ;;
    "databaseshell" | "dbs")
        eval "$base_command_db" bash -l "$@"
        ;;
    "databasetest" | "dbt")
        eval "$base_command_db" mariadb -h "$MAIN_DB_HOST" -u "$MAIN_DB_USER"-test -p"$MAIN_DB_PASSWORD" -D "$MAIN_DB_NAME"-test "$@"
        ;;
    "databaseuser" | "dbu")
        eval "$base_command_db" mariadb -h "$MAIN_DB_HOST" -u "$SUPERTOKENS_DB_USER" -p"$SUPERTOKENS_DB_PASSWORD" -D supertokens "$@"
        ;;
    "test" | "t")
        eval "$base_command_node" yarn test --silent --verbose=false "$@"
        ;;
    "testfull" | "tf")
        eval "$base_command_node" yarn test "$@"
        ;;
    "testwatch" | "tw")
        eval "$base_command_node" yarn test --watch "$@"
        ;;
    "testcoverage" | "tc")
        eval "$base_command_node" yarn test --coverage --verbose  "$@"
        ;;
    "nodeshell" | "ns")
        eval "$base_command_node" bash -l
        ;;
    "rootnodeshell" | "rns")
        eval "$base_command_node_root" bash -l
        ;;
    "jobslogs" | "jl")
        eval "$base_command_node" pm2 logs jobs
        ;;
    "jobsstop" | "js")
        eval "$base_command_node" pm2 stop jobs
        yarn docker cbr && echo Cleaned jobs cache.
        ;;
    "jobsrestart" | "jr")
        yarn docker js
        eval "$base_command_node" pm2 --time restart jobs
        ;;
    "serverlogs" | "sl")
        eval "$base_command_node" pm2 logs WSServer
        ;;
    "serverstop" | "ss")
        eval "$base_command_node" pm2 stop WSServer
        ;;
    "serverrestart" | "sr")
        eval "$base_command_node" pm2 --time restart WSServer
        ;;
    "yarn" | "y")
        eval "$base_command_node" yarn "$@"
        ;;
    "yarnadd" | "ya")
        eval "$base_command_node" yarn add "$@"
        ;;
    "yarnadddev" | "yad")
        eval "$base_command_node" yarn add -D "$@"
        ;;
    "yarnremove" | "yr")
        eval "$base_command_node" yarn remove "$@"
        ;;
    "migrate" | "m")
        eval "$base_command_node" yarn prisma migrate dev "$@"
        ;;
    "makemigration" | "mm")
        eval "$base_command_node" yarn prisma migrate dev --create-only --name "$@"
        ;;
    "migratereset" | "mr")
        eval "$base_command_node" yarn prisma migrate reset "$@"
        ;;
    "prisma" | "p")
        eval "$base_command_node" yarn prisma "$@"
        ;;
    "prismadb" | "pd")
        eval "$base_command_node" yarn prisma db "$@"
        ;;
    "prismagenerate" | "pg")
        eval "$base_command_node" yarn prisma generate "$@"
        ;;
    "cache" | "c")
        eval "$base_command_cache" redis-cli
        ;;
    "cachemainreset" | "cmr")
        eval "$base_command_cache" redis-cli -n 0 FLUSHDB
        ;;
    "cachebullmqreset" | "cbr")
        eval "$base_command_cache" redis-cli -n 1 FLUSHDB
        ;;
    "cachereset" | "cr")
        eval "$base_command_cache" redis-cli FLUSHALL
        ;;
    "cacheshell" | "cs")
        eval "$base_command_cache" ash -l
        ;;
    *)
        echo Available commands:
        echo "  shortcut, command name      [container_name]    command description"
        echo " --- "
        echo "  nr, nextrestart             [$node_container_name]     restart the nextJS server"
        echo "  nl, nextlogs                [$node_container_name]     see the logs for the nextJS server"
        echo "  db, database                [$db_container_name]      enter the mariadb command-line using the main db"
        echo "  dbr, databaseroot           [$db_container_name]      enter the mariadb command-line as root"
        echo "  dbd, databasedump           [$db_container_name]      dump all db tables as root"
        echo "  dbs, databaseshell          [$db_container_name]      enter the shell of the mariadb container"
        echo "  dbt, databasetest           [$db_container_name]      enter the mariadb command-line using the test db"
        echo "  dbu, databaseuser           [$db_container_name]      enter the mariadb command-line using the users db"
        echo "  t, test                     [$node_container_name]     run tests"
        echo "  tf, testfull                [$node_container_name]     run tests, show full output"
        echo "  tw, testwatch               [$node_container_name]     run tests watching it"
        echo "  tc, testcoverage            [$node_container_name]     test coverage"
        echo "  ns, nodeshell               [$node_container_name]     enter the node container"
        echo "  rns, rootnodeshell          [$node_container_name]     enter the node container as root"
        echo "  y, yarn                     [$node_container_name]     run \`yarn\` on the node container"
        echo "  ya, yarnadd                 [$node_container_name]     run \`yarn add ARGS\` on the node container"
        echo "  yad, yarnadddev             [$node_container_name]     run \`yarn add -D ARGS\` on the node container"
        echo "  yr, yarnremove              [$node_container_name]     run \`yarn remove ARGS\` on the node container"
        echo "  m, migrate                  [$node_container_name]     run migrations"
        echo "  mm, makemigration           [$node_container_name]     create a migration with name ARGS"
        echo "  mr, migratereset            [$node_container_name]     recreate the database"
        echo "  pd, prismadb                [$node_container_name]     run \`prisma db ARGS\`"
        echo "  pg, prismagenerate          [$node_container_name]     run \`prisma generate\` to generate client from scheme"
        echo "  c, cache                    [$cache_container_name]   enter the redis command-line interface"
        echo "  cs, cacheshell              [$node_container_name]     enter the redis container"
        echo "  cr, cachereset              [$node_container_name]     clear the whole redis cache"
        echo "  cmr, cachemainreset         [$node_container_name]     clear the main redis cache"
        echo "  cbr, cachebullmqreset       [$node_container_name]     clear the bullMQ redis database"
        echo "  jl, jobslogs                [$node_container_name]     watch jobs logs"
        echo "  js, jobsstop                [$node_container_name]     stop jobs"
        echo "  jr, jobsrestart             [$node_container_name]     restart jobs"
        echo "  sl, serverlogs              [$node_container_name]     watch WS server logs"
        echo "  ss, serverstop              [$node_container_name]     stop WS server"
        echo "  sr, serverrestart           [$node_container_name]     restart WS server"
        ;;
esac

