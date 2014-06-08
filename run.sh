#!/bin/bash

TIMESTAMP=$(date +%m%d%y%H%M%S) 
node app.js
git checkout gh-pages
git add .
git reset -- etags.json
git commit -am ${TIMESTAMP}
git push origin gh-pages
git checkout etags
git reset etags
git commit etags.json -m ${TIMESTAMP} 
git push origin etags
git checkout gh-pages