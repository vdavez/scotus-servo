#!/bin/bash

TIMESTAMP=$(date +%m%d%y%H%M%S) 
node app.js
git checkout gh-pages
git add .
git commit -am ${TIMESTAMP}
git push origin gh-pages