#!/usr/bin/env node

import { N3Parser } from './N3Parser';
export { N3Parser } from './N3Parser';

if (process.argv.length != 3) {
    console.log(`usage: ${process.argv[1]} n3-file`);
    process.exit(1);
}

const input = process.argv[2];

const knownPredicates = [
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'http://www.w3.org/2000/10/swap/.*',
];

main(input);

async function main(path: string) : Promise<void> {
    const parser = new N3Parser({});
    parser.parse(path)
          .then(graph => {
            const n3s = parser.asN3S(graph, knownPredicates);
            console.log(n3s);
          })
          .catch(e => {
            console.error(e);
            process.exit(2);
          });
}