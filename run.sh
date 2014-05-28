#!/bin/bash

TIMESTAMP=$(date +%m%d%y%H%M%S) 
node app.js
git checkout gh-pages
git add .
git commit -a -m ${TIMESTAMP}
git push origin gh-pages