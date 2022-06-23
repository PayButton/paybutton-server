# docker container exec shortcuts

node_container_name="paybutton-dev"
db_container_name="paybutton-db"
base_command_node="docker exec -it $node_container_name"
base_command_node_root="docker exec  -it -u 0 $node_container_name"
base_command_db="docker exec -it $db_container_name"
command="$1"

shift
case "$command" in
    "database" | "db")
        eval "$base_command_db" mariadb -u paybutton -ppaybutton -D paybutton "$@"
        ;;
    "databaseroot" | "dbr")
        eval "$base_command_db" mariadb -u root -proot "$@"
        ;;
    "databaseshell" | "dbs")
        eval "$base_command_db" bash -l "$@"
        ;;
    "databasetest" | "dbt")
        eval "$base_command_db" mariadb -u paybutton-test -ppaybutton-test -D paybutton-test "$@"
        ;;
    "databaseuser" | "dbu")
        eval "$base_command_db" mariadb -u supertokens -psupertokens -D supertokens "$@"
        ;;
    "test" | "t")
        eval "$base_command_node" yarn test "$@"
        ;;
    "testwatch" | "tw")
        eval "$base_command_node" yarn test --watch "$@"
        ;;
    "testcoverage" | "tc")
        eval "$base_command_node" yarn test --coverage --verbose  "$@"
        ;;
    "nodeshell" | "ns")
        eval "$base_command_node" ash -l
        ;;
    "noderootshell" | "nrs")
        eval "$base_command_node_root" ash -l
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
    *)
        echo Avaiable commands:
        echo "  shortcut, command name      [container_name]    command description"
        echo " --- "
        echo "  db, database                [$db_container_name]      enter the mariadb command-line using the main db"
        echo "  dbr, databaseroot           [$db_container_name]      enter the mariadb command-line as root"
        echo "  dbs, databaseshell          [$db_container_name]      enter the shell of the mariadb container"
        echo "  dbt, databasetest           [$db_container_name]      enter the mariadb command-line using the test db"
        echo "  dbu, databaseuser           [$db_container_name]      enter the mariadb command-line using the users db"
        echo "  t, test                     [$node_container_name]     run tests"
        echo "  tw, testwatch               [$node_container_name]     run tests watching it"
        echo "  tc, testcoverage            [$node_container_name]     test coverage"
        echo "  ns, node                    [$node_container_name]     enter the node container"
        echo "  nr, noderoot                [$node_container_name]     enter the node container as root"
        echo "  y, yarn                     [$node_container_name]     run \`yarn\` on the node container"
        echo "  ya, yarnadd                 [$node_container_name]     run \`yarn add ARGS\` on the node container"
        echo "  yad, yarnadddev             [$node_container_name]     run \`yarn add -D ARGS\` on the node container"
        echo "  yr, yarnremove              [$node_container_name]     run \`yarn remove ARGS\` on the node container"
        echo "  m, migrate                  [$node_container_name]     run migrations"
        echo "  mm, makemigration           [$node_container_name]     create a migration with name ARGS"
        echo "  mr, migratereset            [$node_container_name]     recreate the database"
        echo "  pd, prismadb                [$node_container_name]     run \`prisma db ARGS\`"
        echo "  pg, prismagenerate          [$node_container_name]     run \`prisma generate\` to generate client from scheme"
        ;;
esac

