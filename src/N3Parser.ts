import * as N3 from 'n3';
import * as fs from 'fs';
import * as hash from 'object-hash';
import { getLogger, Logger } from "log4js";

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

export type IPSO = {
    type: 'PSO',
    subject: ITerm ,
    predicate: ITerm ,
    object: ITerm ,
};

export type ITerm = INamedNode | IBlankNode | ILiteral | IVariable | IGraph | IList;

export type INamedNode = {
    type: 'NamedNode';
    value: string;
    datatype: null;
};

export type IBlankNode = {
    type: 'BlankNode';
    value: string;
    datatype: null;
};

export type ILiteral = {
    type: 'Literal';
    value: string;
    datatype: string;
};

export type IVariable = {
    type: 'Variable';
    value: string;
    datatype: null;
};

export type IList = {
    type: 'List';
    value: ITerm[]
    datatype: null;
};

export type IGraph = {
    type: 'Graph';
    value: IPSO[];
    datatype: null;
};

export class N3Parser {
    private dynamics = true;
    private logger : Logger;
    private store: N3.Store;

    // quadOrder is a object list that keeps the parsing order of the quads
    private quadOrder: {
        [id: string] : number 
    };

    constructor(options: any) {
        this.store = new N3.Store();
        this.quadOrder = {};
        this.logger = getLogger();
        if (options?.dynamics === false) {
            this.dynamics = false;
        }
    }

    public async parse(input: string) : Promise<IGraph> {
        return new Promise<IGraph>(async (resolve,reject) => {
            try {
                if (fs.existsSync(input)) {
                    await this.parseN3File(input);
                }
                else {
                    await this.parseN3(input);
                }

                resolve(this.makeGraph());
            }
            catch (e) {
                reject(e);
            }
        });
    }

    public asN3S(graph: IGraph, except: string[] = []) : string {
        const dynamics = this.writeDynamic(graph, except);
        const n3s = this.writeGraph(graph);

        if (this.dynamics && dynamics.length) {
            return `${dynamics}\n${n3s}`;
        }
        else {
            return n3s;
        }
    }

    private parseN3File(file: string) : Promise<void> {
        this.logger.debug(`parsing: ${file}`);
        const n3 = fs.readFileSync(file, { encoding: "utf8"});
        return this.parseN3(n3);
    }

    private parseN3(n3: string) : Promise<void> {
        this.logger.debug(`parsing: ${n3}`);
        return new Promise<void>( (resolve,reject) => {
            let quadPosition = -1;

            const parser = new N3.Parser({ format: 'text/n3' });
    
            parser.parse(n3,
                (error, quad, _prefixes) => {
                    if (error) {
                        reject(error.message);
                    }
    
                    if (quad) {
                        this.logger.trace('parsing quad:',quad);
                        this.store.add(quad);
                        quadPosition++;
                        this.logger.trace('quad position:', quadPosition);
                        this.quadOrder[hash.sha1(quad)] = quadPosition;
                    }
                    else {
                        resolve();
                    }
                }
            );
        });
    }

    private pref(type: string, value: string) : string {
        return type + value;
    }

    private writeDynamic(graph: IGraph, except: string[] = []) : string {
        const dynamicTerms = new Set<string>();
    
        graph.value.forEach( (pso) => {
            this.scanDynamicTerm(pso,dynamicTerms);
        });
    
        return Array.from(dynamicTerms)
                     .filter( (dyn) => {
                        let result = true ;
                        except.forEach( (ex) => {
                            if (dyn.match(ex)) {
                                result = false;
                            }
                        });
                        return result;
                     })
                     .map( (dyn) => {
                            return `:- dynamic('<${dyn}>'/2).`;
                     }).join("\n");
    }

    private scanDynamicTerm(pso: IPSO, container: Set<string>) : void {
        if (pso.predicate.type === 'NamedNode') {
            container.add(pso.predicate.value);
        }
    
        if (pso.subject.type === 'Graph') {
            pso.subject.value.forEach( (pso_i) => {
                this.scanDynamicTerm(pso_i, container);
            });    
        }
        if (pso.predicate.type === 'Graph') {
            pso.predicate.value.forEach( (pso_i) => {
                this.scanDynamicTerm(pso_i, container);
            });    
        }
        if (pso.object.type === 'Graph') {
            pso.object.value.forEach( (pso_i) => {
                this.scanDynamicTerm(pso_i, container);
            });    
        }
    }

    private writeGraph(graph: IGraph) : string {
        const result : string[] = [];
    
        graph.value.forEach( (pso) => {
            const value = this.writePSO(pso);
            result.push(value);
        });
    
        return result.join("\n");
    }

    private writePSO(pso: IPSO) : string {
        const subject   = this.writeTerm(pso.subject);
        const predicate = this.writeTerm(pso.predicate);
        const object    = this.writeTerm(pso.object);
    
        return `${predicate}(${subject},${object}).`;
    }

    private string_escape(str:string) : string {
        return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
    }

    private writeTerm(term: ITerm) : string {
        if (term.type === 'NamedNode') {
            return `'<${term.value}>'`;
        }
        else if (term.type === 'Literal') {
            if (term.datatype === this.pref(XSD,'string')) {
                return `"${this.string_escape(term.value)}"`;
            }
            else if (term.datatype === this.pref(XSD,'integer')) {
                return term.value;
            }
            else if (term.datatype === this.pref(XSD,'boolean')) {
                return term.value;
            }
            else {
                return `literal('${term.value}','${term.datatype}')`;
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
                result.push(this.writeTerm(li));
            });
            return '[' + result.join(",") + ']';
        }
        else if (term.type === 'Graph') {
            const result : string[] = [];
            term.value.forEach( (gi) => {
                const value = this.writePSO(gi);
                result.push(value.replace(/\.$/,''));
            });
    
            return '(' + result.join(",") + ')';
        }
    
        return 'x';
    }

    private makeGraph(graph: N3.Term = N3.DataFactory.defaultGraph()) : IGraph {
        const result : IGraph = {
            type: 'Graph',
            value: [] as IPSO[],
            datatype: null
        };
   
        // Gather all pso values (we will sort them later)
        const psoValues : any[] = [];

        // First process the will behaved nodes (not the junk list-like stuff)...
        this.store.forEach((quad) => {
            const termType = '' + quad.subject.termType;
    
            if (termType === 'Variable') {
                console.error(quad);
                throw new Error(`Variables are not supported in N3S!`);
            }
    
            if ((termType === 'NamedNode' || 
                 termType === 'Literal' ||
                 termType === 'BlankNode') 
                    && !this.isListLike(quad) 
                    && !this.isGraphLike(quad,graph)) {
                let subject   = this.parseTerm(quad.subject);
                let predicate = this.parseTerm(quad.predicate);
                let object    = this.parseTerm(quad.object);
                psoValues.push({
                    quad: quad,
                    subject: subject,
                    predicate: predicate,
                    object: object
                });
            }
        }, null, null, null, graph);
    
        // Next process all the rest ...
        this.store.forEach((quad) => {
            const termType = '' + quad.subject.termType;
            if (termType === 'BlankNode' 
                    && this.isListLike(quad) 
                    && !this.isGraphLike(quad,graph)) {
                let subject   = this.parseTerm(quad.subject);
                let predicate = this.parseTerm(quad.predicate);
                let object    = this.parseTerm(quad.object);
                psoValues.push({
                    quad: quad,
                    subject: subject,
                    predicate: predicate,
                    object: object
                });
            }
        }, null, null, null, graph);
  
        // Order the results and add them to the graph
        psoValues.sort( (n1,n2) => {
            let n1Order = this.quadOrder[hash.sha1(n1.quad)];
            let n2Order = this.quadOrder[hash.sha1(n2.quad)];
            if (n1Order > n2Order) {
                return 1;
            }
            if (n1Order < n2Order) {
                return -1;
            }
            return 0;
        }).forEach( pso => {
            result.value.push({
                type: 'PSO',
                subject: pso.subject,
                predicate: pso.predicate,
                object: pso.object
            } as IPSO);
        });
        
        return result;
    }

    private parseTerm(term: N3.Term) : ITerm {
        if (term.termType === 'NamedNode') {
            if (term.value === this.pref(RDF,'nil')) {
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
            if (this.isList(term)) {
                return this.makeList(term);
            }
            else if (this.isGraph(term)) {
                return this.makeGraph(term);
            }
            else {
                const genid = this.makeGenId(term);
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

    private makeGenId(term: N3.Term) : string {
        const value = term.value.replace(/^.*(_|\.)/,'') ;
        return `_:${value}`;   
    }

    private isGraphLike(quad: N3.Quad, graph: N3.Term) : boolean {
        if (quad.graph.id === graph.id) {
            return false;
        }
        else {
            return true;
        }
    }

    private isListLike(quad: N3.Quad) : boolean {
        if (quad.predicate.value === this.pref(RDF,'first') ||
            quad.predicate.value === this.pref(RDF,'rest')) {
            return true;
        }
        else {
            return false;
        }
    } 

    private isList(term: N3.Term) : boolean {
        let searchTerm = term;
        let brake = false;
        do {
            const first = this.store.getQuads(searchTerm, this.pref(RDF,'first'),null,null);
            const rest = this.store.getQuads(searchTerm, this.pref(RDF,'rest'),null,null);
    
            if (first.length == 1 && rest.length == 1) {
                // we are ok
            }
            else {
                return false;
            }
    
            if (rest[0].object.value === this.pref(RDF,'nil')) {
                brake = true;
            }
            else {
                searchTerm = rest[0].object;
            }
        } while (!brake);
    
        return true;
    }

    private isGraph(term: N3.Term) : boolean {
        const graph = this.store.getQuads(null, null, null, term);
    
        if (graph.length == 0) {
            return false;
        }
        else {
            return true;
        }
    }

    private makeList(term: N3.Term) : IList {
        let termList : ITerm[] = [];
        let searchTerm = term;
        let brake = false;
    
        do {
            const first = this.store.getQuads(searchTerm,this.pref(RDF,'first'),null,null);
            const rest  = this.store.getQuads(searchTerm,this.pref(RDF,'rest'),null,null);
    
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
            else if (first[0].object.value === this.pref(RDF,'nil')) {
                const termValue = { type: 'List', value: [] as ITerm[]} as IList;
    
                termList.push(termValue);
    
                if (rest[0].object.value === this.pref(RDF,'nil')) {
                    brake = true;
                }
                else {
                    searchTerm = rest[0].object;
                }
            }
            else {
                const termValue = this.parseTerm(first[0].object);
    
                termList.push(termValue);
    
                if (rest[0].object.value === this.pref(RDF,'nil')) {
                    brake = true;
                }
                else {
                    searchTerm = rest[0].object;
                }
            }
    
            first.forEach( (quad) => { this.store.removeQuad(quad) });
            rest.forEach( (quad) => { this.store.removeQuad(quad) });
        } while (!brake);
        
        return { type: 'List', value: termList } as IList;
    }
}