#!/bin/bash

TIMESTAMP=$(date +%m%d%y%H%M%S) 
node app.js 13
git commit -am ${TIMESTAMP}
source ~/.keychain/$HOSTNAME-sh
git push origin gh-pages
