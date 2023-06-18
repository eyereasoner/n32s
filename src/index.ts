#!/usr/bin/env node

import { parseN3File, makeGraph, writeGraph, writeDynamic } from './N3Parser';
export { parseN3File, makeGraph, writeGraph, writeDynamic } from './N3Parser';

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
    let store;
    try {
        store = await parseN3File(path);
    } 
    catch (e) {
        console.error(e);
        process.exit(2);
    }

    try {
        const graph = makeGraph(store);
        const dynamic = writeDynamic(graph, knownPredicates);
        const n3s = writeGraph(graph);
        if (dynamic.length) {
            console.log(dynamic);
        }
        console.log(n3s);
    }
    catch (e) {
        console.error((e as Error).message);
        process.exit(3);
    }
}