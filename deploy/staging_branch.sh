#!/bin/bash
GIT_CURRENT_BRANCH=$(git branch --show-current | sed "s/\//-/g")
SSH_HOST=$PAYBUTTON_SSH_HOST


function prepare_branch_version_files {
    echo "[DEPLOY] Compressing $GIT_CURRENT_BRANCH source files."
    cd ..
    tar -czf "$GIT_CURRENT_BRANCH".tar.gz paybutton-server;

    echo "[DEPLOY] Sending compressed files to staging server."
    scp "$GIT_CURRENT_BRANCH".tar.gz $SSH_HOST:~

    echo "[DEPLOY] Creating directory for branch $GIT_CURRENT_BRANCH.";
    ssh $SSH_HOST "mkdir -p ~/staging/$GIT_CURRENT_BRANCH"

    echo "[DEPLOY] Extracting compressed files into $GIT_CURRENT_BRANCH directory."
    ssh $SSH_HOST "tar -zxf ~/$GIT_CURRENT_BRANCH.tar.gz -C ~/staging/$GIT_CURRENT_BRANCH"
}


function clean_up_branch_version {
    echo "[DEPLOY] Cleaning up possible existing branch versions."
    ssh $SSH_HOST <<EOF
        kill -9 \$(ps aux | grep -v grep | grep $GIT_CURRENT_BRANCH | awk '{print \$2}')
	sed -i '/^$GIT_CURRENT_BRANCH/d' ~/staging/SERVER_LIST
EOF
}


function deploy_branch_version_on_staging {
    echo "[DEPLOY] Running remote deployment on $SSH_HOST"
    ssh $SSH_HOST <<EOI
    echo "[DEPLOY] Installing remote dependencies.";
    cd ~/staging/$GIT_CURRENT_BRANCH/paybutton-server;
    nvm use;
    npm install -g yarn portastic;

    echo "[DEPLOY] Setting environment variables.";
    export PAYBUTTON_BASE_PATH="/$GIT_CURRENT_BRANCH";

    export PAYBUTTON_ENV=staging
    export PORT=\$(portastic find 3100 3300 | rev | cut -d ' ' -f 1 | rev);
    echo "PAYBUTTON_BASE_PATH=\$PAYBUTTON_BASE_PATH >> .env"
    echo "API_DOMAIN=\$API_DOMAIN" >> .env
    echo "WEBSITE_DOMAIN=\$WEBSITE_DOMAIN" >> .env

    echo "[DEPLOY] Building branch version.";
    yarn;
    yarn build;

    echo "[DEPLOY] Saving $GIT_CURRENT_BRANCH information.";
    echo "$GIT_CURRENT_BRANCH,\$PORT" >> ~/staging/SERVER_LIST;

    echo "[DEPLOY] Starting branch version.";
    nohup yarn start -p \$PORT 1>/dev/null 2>/dev/null &

    echo "[DEPLOY] Restarting proxy.";
    pm2 restart all;

    echo "[DEPLOY] Deployment successful on /$GIT_CURRENT_BRANCH";
EOI
}



prepare_branch_version_files;
clean_up_branch_version;
deploy_branch_version_on_staging;
