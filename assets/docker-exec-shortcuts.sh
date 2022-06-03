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
    "prismagenerate" | "pg")
        eval "$base_command_node" yarn prisma generate
        ;;
    "migrate" | "mig")
        eval "$base_command_node" yarn prisma migrate dev
        ;;
    "migrationadd" | "ma")
        eval "$base_command_node" yarn prisma migrate dev --name "$@"
        ;;
    "migrateto" | "mt")
        eval "$base_command_node" sequelize-cli db:migrate --to "$@"
        ;;
    "showmigrations" | "sm")
        eval "$base_command_node" sequelize-cli db:migrate:status
        ;;
    "undolast" | "ul")
        eval "$base_command_node" sequelize-cli db:migrate:undo
        ;;
    "undoto" | "ut")
        eval "$base_command_node" sequelize-cli db:migrate:undo:all --to "$@"
        ;;
    "undoall" | "ua")
        eval "$base_command_node" sequelize-cli db:migrate:undo:all
        ;;
    *)
        echo Avaiable commands:
        echo "  shortcut, command           [container_name]    command description"
        echo " --- "
        echo "  db, database                [$db_container_name]      enter the mariadb command-line using the main db"
        echo "  dbr, databaseroot           [$db_container_name]      enter the mariadb command-line as root"
        echo "  dbs, databaseshell          [$db_container_name]      enter the shell of the mariadb container"
        echo "  dbt, databasetest           [$db_container_name]      enter the mariadb command-line using the test db"
        echo "  t, test                     [$node_container_name]     run tests"
        echo "  tw, testwatch               [$node_container_name]     run tests watching it"
        echo "  tc, testcoverage            [$node_container_name]     test coverage"
        echo "  n, node                     [$node_container_name]     enter the node container"
        echo "  nr, noderoot                [$node_container_name]     enter the node container as root"
        echo "  y, yarn                     [$node_container_name]     run \`yarn\` on the node container"
        echo "  ya, yarnadd                 [$node_container_name]     run \`yarn add ARGS\` on the node container"
        echo "  yad, yarnadddev             [$node_container_name]     run \`yarn add -D ARGS\` on the node container"
        echo "  yr, yarnremove              [$node_container_name]     run \`yarn remove ARGS\` on the node container"
        echo "  pg, prismagenerate          [$node_container_name]     update prisma client from scheme.prisma"
        echo "  mig, migrate                [$node_container_name]     run migrations"
        echo "  ma, migrationadd            [$node_container_name]     create migration file with name ARGS"
        echo "  mt, migrateto               [$node_container_name]     run migrations until ARGS"
        echo "  sm, showmigrations          [$node_container_name]     show migrations"
        echo "  ul, undolast                [$node_container_name]     undo last migration"
        echo "  ut, undoto                  [$node_container_name]     undo to migration ARGS"
        echo "  ua, undoall                 [$node_container_name]     undo all migrations"
        ;;
esac

