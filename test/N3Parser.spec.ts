import { parseN3, makeGraph, writeGraph } from '../src/N3Parser';

import {expect} from 'expect';

describe('N3Parser', () => {
    it('should parse the empty string',
        shouldParse('','')
    );

    it('should parse <s> <p> <o>',
        shouldParse(
            '<s> <p> <o>.',
            '\'<p>\'(\'<s>\',\'<o>\').')
    );

    it('should parse <s> <p> true',
        shouldParse(
            '<s> <p> true.',
            '\'<p>\'(\'<s>\',true).')
    );

    it('should parse <s> <p> false',
        shouldParse(
            '<s> <p> false.',
            '\'<p>\'(\'<s>\',false).')
    );

    it('should parse <s> <p> "blue ball"',
        shouldParse(
            '<s> <p> "blue ball".',
            '\'<p>\'(\'<s>\',\'blue ball\').')
    );

    it('should parse <s> <p> 123',
        shouldParse(
            '<s> <p> 123.',
            '\'<p>\'(\'<s>\',123).')
    );

    it('should parse <s> <p> "3.14"^^<http://www.w3.org/2001/XMLSchema#float>',
        shouldParse(
            '<s> <p> "3.14"^^<http://www.w3.org/2001/XMLSchema#float>.',
            '\'<p>\'(\'<s>\',literal(\'3.14\',\'http://www.w3.org/2001/XMLSchema#float\')).')
    );

    it('should parse <s> <p> _:x',
        shouldParse(
            '<s> <p> _:x.',
            '\'<p>\'(\'<s>\',\'_:x\').')
    );

    it('should parse <s> <p> ()',
        shouldParse(
            '<s> <p> ().',
            '\'<p>\'(\'<s>\',[]).')
    );

    it('should parse <s> <p> (())',
        shouldParse(
            '<s> <p> (()).',
            '\'<p>\'(\'<s>\',[[]]).')
    );

    it('should parse <s> <p> (() ())',
        shouldParse(
            '<s> <p> (() ()).',
            '\'<p>\'(\'<s>\',[[],[]]).')
    );

    it('should parse <s> <p> (() "#" <x> (<y>))',
        shouldParse(
            '<s> <p> (() "#" <x> (<y>)).',
            '\'<p>\'(\'<s>\',[[],\'#\',\'<x>\',[\'<y>\']]).')
    );

    it('should parse <s> <p> { <a> <b> <c> }',
        shouldParse(
            '<s> <p> { <a> <b> <c> }.',
            '\'<p>\'(\'<s>\',(\'<b>\'(\'<a>\',\'<c>\'))).')
    );
});

function shouldParse(input:string,expected:string) {
    return async function() {
        const result = await makeN3S(input);
        expect(result).toEqual(expected);
    };
}
async function makeN3S(input: string) : Promise<string> {
    const store = await parseN3(input);
    const graph = makeGraph(store);
    const n3s = writeGraph(graph);
    return n3s;
}