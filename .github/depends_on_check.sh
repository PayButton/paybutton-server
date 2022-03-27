#!/bin/sh
echo $branch_name
if [ ! -z "$branch_name" ]
    then
        depends_on_branch=$(echo $branch_name | tr -d '[:space:]')
        echo Depends on $depends_on_branch
        is_merged=$(/usr/bin/git log --format=%B -n 1 remotes/origin/master..remotes/origin/$depends_on_branch)
        echo $is_merged
    if [ -z "$is_merged" ]
        then
            exit 0
    fi
        error_message="$branch_name needs to be merged into master before this branch can be merged."
        exit 1
    else
        exit 0
fi
