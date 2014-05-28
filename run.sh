#!/bin/bash

node app.js
git checkout gh-pages
git add .
git commit -a -m 'update'
git push origin gh-pages