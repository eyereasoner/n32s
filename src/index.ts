#!/usr/bin/env node

import * as N3 from 'n3';
import { parseN3File } from './parser';

const XSD  = 'http://www.w3.org/2001/XMLSchema#';
const RDFS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

if (process.argv.length != 3) {
    console.log(`usage: ${process.argv[1]} n3-file`);
    process.exit(1);
}

const input = process.argv[2];

main(input);

async function main(path: string) : Promise<void> {
    const store = await parseN3File(path);
    const graph = makeGraph(store, N3.DataFactory.defaultGraph());
    const n3s = writeGraph(graph);
    console.log(n3s);
}

type IPSO = {
    type: 'PSO',
    subject: ITerm ,
    predicate: ITerm ,
    object: ITerm ,
};

type ITerm = INamedNode | IBlankNode | ILiteral | IVariable | IGraph | IList;

type INamedNode = {
    type: 'NamedNode';
    value: string;
    datatype: null;
};

type IBlankNode = {
    type: 'BlankNode';
    value: string;
    datatype: null;
};

type ILiteral = {
    type: 'Literal';
    value: string;
    datatype: string;
};

type IVariable = {
    type: 'Variable';
    value: string;
    datatype: null;
};

type IList = {
    type: 'List';
    value: ITerm[]
    datatype: null;
};

type IGraph = {
    type: 'Graph';
    value: IPSO[];
    datatype: null;
};

function pref(type: string, value: string) : string {
    return type + value;
}

function writeGraph(graph: IGraph) : string {
    const result : string[] = [];

    graph.value.forEach( (pso) => {
        const value = writePSO(pso);
        result.push(value);
    });

    return result.join("\n");
};

function writePSO(pso: IPSO) : string {
    const subject   = writeTerm(pso.subject);
    const predicate = writeTerm(pso.predicate);
    const object    = writeTerm(pso.object);

    return `${predicate}(${subject},${object}).`;
}

function writeTerm(term: ITerm) : string {
    if (term.type === 'NamedNode') {
        return `'<${term.value}>'`;
    }
    else if (term.type === 'Literal') {
        if (term.datatype === pref(XSD,'string')) {
            return `'${term.value}'`;
        }
        else if (term.datatype === pref(XSD,'integer')) {
            return term.value;
        }
        else if (term.datatype === pref(XSD,'boolean')) {
            return term.value;
        }
        else {
            return `literal('${term.value},'{${term.datatype}})`;
        }
    }
    else if (term.type === 'BlankNode') {
        return `'${term.value}'`;
    }
    else if (term.type === 'Variable') {
        return `${term.value}`;
    }
    else if (term.type === 'List') {
        const result : string[] = [];
        term.value.forEach( (li) => {
            result.push(writeTerm(li));
        });
        return '[' + result.join(",") + ']';
    }
    else if (term.type === 'Graph') {
        const result : string[] = [];
        term.value.forEach( (gi) => {
            const value = writePSO(gi);
            result.push(value.replace(/\.$/,''));
        });

        return '(' + result.join(",") + ')';
    }

    return 'x';
}

function makeGraph(store: N3.Store, graph: N3.Term) : IGraph {
    const result : IGraph = {
        type: 'Graph',
        value: [] as IPSO[],
        datatype: null
    };

    // First process the named nodes...
    store.forEach((quad) => {
        if ((quad.subject.termType === 'NamedNode' ||
             quad.subject.termType === 'Variable') 
                && !isGraphLike(quad,graph)) {
            let subject   = parseTerm(quad.subject, store);
            let predicate = parseTerm(quad.predicate, store);
            let object    = parseTerm(quad.object, store);
            result.value.push({
                type: 'PSO',
                subject: subject,
                predicate: predicate,
                object: object
            } as IPSO);
        }
    }, null, null, null, graph);

    // Next process the explicit bnodes...
    store.forEach((quad) => {
        if (quad.subject.termType === 'BlankNode' 
                && !isListLike(quad) 
                && !isGraphLike(quad,graph)) {
            let subject   = parseTerm(quad.subject, store);
            let predicate = parseTerm(quad.predicate, store);
            let object    = parseTerm(quad.object, store);
            result.value.push({
                type: 'PSO', 
                subject: subject,
                predicate: predicate,
                object: object
            } as IPSO);
        }
    }, null, null, null, graph);

    return result;
}

function parseTerm(term: N3.Term, store: N3.Store) : ITerm {
    if (term.termType === 'NamedNode') {
        if (term.value === pref(RDFS,'nil')) {
            return { type: 'List' , value: [] as ITerm[] } as IList;
        }
        else {
            return { type: 'NamedNode' , value: term.value} as INamedNode;
        }
    }
    else if (term.termType === 'Literal') {
        return {
            type: 'Literal',
            value: term.value ,
            datatype: term.datatypeString
        } as ILiteral;
    }
    else if (term.termType === 'BlankNode') {
        if (isList(term,store)) {
            return makeList(term,store);
        }
        else if (isGraph(term,store)) {
            return makeGraph(store,term);
        }
        else {
            const genid = makeGenId(term);
            return {
                type: 'BlankNode',
                value: genid
            } as IBlankNode;   
        }
    }
    else if (term.termType === 'Variable') {
        return {
            type: 'Variable',
            value: term.value
        } as IVariable;
    }
    else {
        return {
            type: 'BlankNode',
            value: 'unknown'
        } as IBlankNode;
    }
}

function makeGenId(term: N3.Term) : string {
    const value = term.value.replace(/^.*(_|\.)/,'') ;
    return `_:${value}`;   
}

function isGraphLike(quad: N3.Quad, graph: N3.Term) : boolean {
    if (quad.graph.id === graph.id) {
        return false;
    }
    else {
        return true;
    }
}

function isListLike(quad: N3.Quad) : boolean {
    if (quad.predicate.value === pref(RDFS,'first') ||
        quad.predicate.value === pref(RDFS,'rest')) {
        return true;
    }
    else {
        return false;
    }
} 

function isList(term: N3.Term, store: N3.Store) : boolean {
    const first = store.getQuads(term,pref(RDFS,'first'),null,null);
    const rest = store.getQuads(term,pref(RDFS,'rest'),null,null);

    if (first.length == 1 || rest.length == 1) {
        return true;
    }
    else {
        return false;
    }
}

function isGraph(term: N3.Term, store: N3.Store) : boolean {
    const graph = store.getQuads(null, null, null, term);

    if (graph.length == 0) {
        return false;
    }
    else {
        return true;
    }
}

function makeList(term: N3.Term, store: N3.Store) : IList {
    let termList : ITerm[] = [];
    let searchTerm = term;
    let brake = false;

    do {
        const first = store.getQuads(searchTerm,pref(RDFS,'first'),null,null);
        const rest  = store.getQuads(searchTerm,pref(RDFS,'rest'),null,null);

        if (first.length == 0) {
            if (rest.length == 0 || rest.length != 1) {
                brake = true;
            }
            else {
                brake = true;
            }
        }
        else if (first.length != 1 || rest.length != 1) {
            brake = true;
        } 
        else if (first[0].object.value === pref(RDFS,'nil')) {
            brake = true;
        }
        else {
            const termValue = parseTerm(first[0].object, store);

            termList.push(termValue);

            if (rest[0].object.value === pref(RDFS,'nil')) {
                brake = true;
            }
            else {
                searchTerm = rest[0].object;
            }
        }

        first.forEach( (quad) => { store.removeQuad(quad) });
        rest.forEach( (quad) => { store.removeQuad(quad) });
    } while (!brake);
    
    return { type: 'List', value: termList } as IList;
}