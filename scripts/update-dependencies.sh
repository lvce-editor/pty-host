#!/bin/bash

cd $(dirname "$0")
cd ..

command_exists(){
  command -v "$1" &> /dev/null
}

if ! command_exists "ncu"; then
    echo "npm-check-updates is not installed"
    npm i -g npm-check-updates
else
    echo "ncu is installed"
fi

function updateDependencies {
  echo "updating dependencies..."
  ncu -u -x @types/node -x @babel/preset-typescript -x node-pty -x typescript
}

                                                       updateDependencies             &&
cd packages/build                                   && updateDependencies && cd ../.. &&
cd packages/e2e                                     && updateDependencies && cd ../.. &&
cd packages/pty-host                                && updateDependencies && cd ../.. &&
cd packages/pty-integration                         && updateDependencies && cd ../.. &&
cd packages/memory                                  && updateDependencies && cd ../.. &&
cd packages/server                                  && updateDependencies && cd ../.. &&
cd packages/test-integration                        && updateDependencies && cd ../.. &&
cd packages/test-integration-util                   && updateDependencies && cd ../..

npm install

echo "Great Success!"

sleep 2
