import * as fs from 'fs';
import * as N3 from 'n3';
import { IN3SToken, N3SLexer } from "./N3SLexer";
import { IBlankNode, ILiteral, INamedNode, IList, ITerm } from "./N3Parser";
import { getLogger, Logger } from "log4js";

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const { DataFactory } = N3;
const { namedNode, literal, blankNode } = DataFactory;

const termType = {
    Subject: 0,
    Predicate: 1 ,
    Object : 2 ,
    LeftParen: 3 ,
    RightParen: 4 ,
    Dot: 5
};

type ICallBack = (token: IN3SToken) => ICallBack ;

export class N3SParser {
    private subject : ITerm;
    private predicate : ITerm;
    private object : ITerm;
    private nextTerm : number;
    private listStack : ITerm[];
    private lexer : N3SLexer;
    private inList : boolean;
    private readCallback : ICallBack;
    private writer : N3.Writer;
    private logger : Logger;

    constructor() {
        this.lexer = new N3SLexer();
        this.subject = {} as ITerm;
        this.predicate = {} as ITerm;
        this.object = {} as ITerm;
        this.nextTerm = termType.Predicate;
        this.listStack = [] as ITerm[];
        this.inList = false;
        this.writer = new N3.Writer();
        this.readCallback = this.readInTopContext;
        this.logger = getLogger();
    }

    private readInTopContext(token: IN3SToken) : ICallBack {
        switch(token.type) {
            case 'directive':
                // Ignore directives...
                return this.readTerm;
            default:
                return this.readTerm(token);
        }
    }

    private readTerm(token: IN3SToken) : ICallBack {
        this.logger.debug(`readTerm %s`, token);

        let entity : ITerm | undefined = undefined;

        switch (this.nextTerm) {
            case termType.Dot:
                if ( token.type === '.') {
                    this.gatherResults();
                    this.nextTerm = termType.Predicate;
                    return this.readTerm;
                }
                else {
                    this.logger.error(`expecting '.' but got %s`,token);
                    this.error(`Expecting '.'`,token); 
                } 
                break;
            case termType.RightParen:
                if ( token.type === ')') {
                    this.nextTerm = termType.Dot;
                    return this.readTerm;
                }
                else {
                    this.logger.error(`expecting ')' but got %s`,token);
                    this.error(`Expecting ')'`,token); 
                }
                break;
            case termType.LeftParen: 
                if ( token.type === '(') {
                    this.nextTerm = termType.Subject;
                    return this.readTerm;
                }
                else {
                    this.logger.error(`expecting '(' but got %s`,token);
                    this.error(`Expecting '('`,token); 
                }
                break;
            case termType.Predicate:
                if ( token.type === "IRI" || token.type === "blank"  || token.type === 'eof') {
                    // we are ok
                }
                else {
                    this.logger.error(`expecting IRI or blank but got %s`,token);
                    this.error(`Expecting IRI or blank`,token);
                }
                break;
        }

        switch (token.type) {
            case "IRI":
                entity = this.readEntity(token);
                break;
            case "literal":
                entity = this.readEntity(token);
                break;
            case "blank":
                entity = this.readEntity(token);
                break;
            case "[" :
                this.listStack = [];
                this.inList = true;
                break;
            case "]":
                entity = {
                    type: 'List',
                    value: this.listStack,
                    datatype: null 
                } as IList;
                this.listStack = [];
                this.inList = false;
                break;
        };

        if (entity !== undefined && ! this.inList) {
            switch (this.nextTerm) { 
                case termType.Subject:
                    this.subject = entity;
                    this.nextTerm = termType.Object;
                    break;
                case termType.Predicate:
                    this.predicate = entity;
                    this.nextTerm = termType.LeftParen;
                    break;
                case termType.Object:
                    this.object = entity;
                    this.nextTerm = termType.RightParen;
                    break;
            };
        }

        return this.readTerm;
    }

    private gatherResults() : void {
        this.logger.debug(`subject: %s`,this.subject);
        this.logger.debug(`predicate: %s`,this.predicate);
        this.logger.debug(`object: %s`,this.object);
    
        this.writeSPO(this.subject, this.predicate, this.object);
    }

    private writeSPO(subject : ITerm , predicate: ITerm , object: ITerm) : void {
        let s : N3.NamedNode | N3.BlankNode ;
        let p : N3.NamedNode ;
        let o : N3.NamedNode | N3.Literal | N3.BlankNode;

        if (subject.type === 'NamedNode') {
            s = namedNode(subject.value);
        }
        else if (subject.type === 'BlankNode') {
            s = blankNode(subject.value);
        }
        else if (subject.type === 'List') {
            s = blankNode();
        }
        else {
            throw Error(`Wrong subject type ${subject.type}`);
        }

        if (predicate.type === 'NamedNode') {
            p = namedNode(predicate.value);
        }
        else {
            throw Error(`Wrong predicate type ${predicate.type}`);
        }

        if (object.type === 'NamedNode') {
            o = namedNode(object.value);
        }
        else if (object.type === 'BlankNode') {
            o = blankNode(object.value);
        }
        else if (object.type === 'Literal') {
            o = literal(object.value, object.datatype);
        }
        else if (object.type === 'List') {
            o = blankNode();
        }
        else {
            throw Error(`Wrong object type ${object.type}`);
        } 

        this.writer.addQuad(s,p,o);

        if (subject.type === 'List') {
            this.writeList(s,subject);
        }

        if (object.type === 'List') {
            this.writeList(o,object);
        }
    }

    private writeList(subject: N3.NamedNode | N3.BlankNode | N3.Literal , term: IList) {
        let prev = subject;
        for (let i = 0 ; i < term.value.length ; i++) {
            let next = blankNode();
            this.writeSPO({
                    type: 'BlankNode',
                    value: prev.value,
                    datatype: null
                } as IBlankNode,
                {
                    type: 'NamedNode',
                    value: `${RDF}:first`,
                    datatype: null
                } as INamedNode,
                term.value[i]
            );
            this.writeSPO({
                type: 'BlankNode',
                value: prev.value,
                datatype: null
            } as IBlankNode,
            {
                type: 'NamedNode',
                value: `${RDF}next`,
                datatype: null
            } as INamedNode,
            i == term.value.length - 1 ?
                {
                    type: 'NamedNode',
                    value: `${RDF}nil`,
                    datatype: null
                } as INamedNode:
                {
                    type: 'BlankNode',
                    value: next.value,
                    datatype: null
                } as IBlankNode 
            ); 
            prev = next;
        }
    }

    private readEntity(token: IN3SToken) : ITerm | undefined {
        this.logger.debug(`readEntity %s`, token);
 
        let value = undefined;

        switch (token.type) {
            case 'IRI':
                value = {
                    type: 'NamedNode',
                    value: token.value,
                    datatype: null
                } as INamedNode;
                break;
            case 'literal':
                value = {
                    type: 'Literal',
                    value: token.value,
                    datatype: token.prefix
                } as ILiteral;
                break;
            case 'blank':
                value = {
                    type: 'BlankNode',
                    value: token.value,
                    datatype: null
                } as IBlankNode;
                break;
            default:
                this.error(`Expected entity but got ${token.type}`, token);
                value = undefined;
        };

        if (value !== undefined && this.inList) {
            this.logger.debug(`pushing value to listStack pos=%d`,this.listStack.length + 1);
            this.listStack.push(value);
        }

        this.logger.debug(`value=%s`,value);

        return value;
    }

    public async parse(path: string) {
        return new Promise<string>( (resolve,reject) => {
            const input = fs.readFileSync(path, { encoding: 'utf-8'});
            this.lexer.tokenize(input)?.every( (token: IN3SToken) => {
                return this.readCallback = this.readCallback(token);
            });
            this.writer.end( (error,result) => {
                if (error) {
                    reject(error);
                }
                resolve(result);
            });
            return 
        });
    }

    private error(message: string, token: IN3SToken) {
        throw new Error(`${message} on line ${token.line}.`);
    }
}