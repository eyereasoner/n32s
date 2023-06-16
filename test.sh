#!/bin/bash

for f in data/*.n3; do
    echo "[$f]"
    node js/index.js $f | tee -a ${f}-result
    echo "---"
done
