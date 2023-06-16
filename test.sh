#!/bin/bash

for f in data/*.n3; do
    echo "[$f]"
    node js/index.js $f | tee ${f}-result
    echo "---"
done
