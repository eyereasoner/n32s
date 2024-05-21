import { getLogger, Logger } from "log4js";

export const XSD  = 'http://www.w3.org/2001/XMLSchema#';

export const xsd =  {
    decimal: `${XSD}decimal`,
    boolean: `${XSD}boolean`,
    double:  `${XSD}double`,
    integer: `${XSD}integer`,
    string:  `${XSD}string`,
  };

export type IN3SToken = {
    type: string;
    value: string;
    prefix: string;
    line: number;
    start: number;
    end: number;
};

export class N3SLexer {
    private input : string;
    private endOfFile : RegExp;
    private simpleApostropheString: RegExp;
    private unescapedIri : RegExp;
    private blank : RegExp;
    private boolean : RegExp;
    private literal : RegExp;
    private number : RegExp;
    private newline : RegExp;
    private comment : RegExp;
    private whitespace : RegExp;
    private directive: RegExp;
    private line : number;
    private comments : boolean;
    private logger : Logger;

    constructor(options?: any) {
        this.logger = getLogger();
        this.input = "";
        this.line = 0;
        this.simpleApostropheString = /^'([^']+)'/;
        this.unescapedIri = /^'<([^\x00-\x20<>\\"\{\}\|\^\`]*)>'/;
        this.blank = /^'_:((?:[0-9A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?:[ \t]+|(?=\.?[,;:\s#()\[\]\{\}"'<>]))'/;
        this.literal = /^literal\(([']?[^',]+[']?),'([^']+)'\)/;
        this.number = /^[\-+]?(?:(\d+\.\d*|\.?\d+)[eE][\-+]?|\d*(\.)?)\d+/;
        this.endOfFile = /^(?:%[^\n\r]*)?$/;
        this.boolean = /^(?:true|false)/;
        this.newline = /^[ \t]*(?:%[^\n\r]*)?(?:\r\n|\n|\r)[ \t]*/;
        this.comment = /^%([^\n\r]*)/;
        this.directive = /^:-[ \t]*([^\n\r]*)/;
        this.whitespace = /^[ \t]+/;
        this.comments = false;

        if (options?.comments) {
            this.comments = true;
        }
    }

    public tokenize(input:string, callback?: (e: Error|null, token: IN3SToken)=>void) {
        this.input = this.readStartingBom(input);
        const tokens : IN3SToken[] = [];

        if (callback) {
            this.tokenizeToEnd(callback);
            return null;
        }
        else {
            let error;
            this.tokenizeToEnd((e: Error|null, t:IN3SToken) => {
                return e ? (error = e) : tokens.push(t);
            });
            if (error) throw error;
            return tokens;
        }
    }

    private readStartingBom(input: string) : string {
        return input.startsWith('\ufeff') ? input.substr(1) : input;
    }

    private tokenizeToEnd(callback: (e:Error|null,t:IN3SToken)=>void) : void {
        let input = this.input;
        let currentLineLength = input.length;

        while (true) {
            // Count and skip whitespace lines
            let whiteSpaceMatch, comment;

            while (whiteSpaceMatch = this.newline.exec(input)) {
                // Try to find a comment
                if (this.comments && (comment = this.comment.exec(whiteSpaceMatch[0]))) {
                  emitToken('comment', comment[1], '', this.line, whiteSpaceMatch[0].length);
                }
                // Advance the input
                input = input.substr(whiteSpaceMatch[0].length, input.length);
                currentLineLength = input.length;
                this.line++;
            }

            // Skip whitespace on current line
            if (!whiteSpaceMatch && (whiteSpaceMatch = this.whitespace.exec(input))) {
                input = input.substr(whiteSpaceMatch[0].length, input.length);
            }

            const line = this.line, firstChar = input[0];

            let type = '', value = '', prefix = '',
                match = null, matchLength = 0;

            if (this.endOfFile.test(input)) {
                emitToken('eof', '', '', this.line, 0);
                return;
            }

            switch(firstChar) {
                case ':':
                    if (match = this.directive.exec(input)) {
                        type = 'directive', value = match[1];
                    }
                    break;
                case '\'':
                    if (match = this.unescapedIri.exec(input)) {
                        type = 'IRI', value = match[1];
                    }
                    else if (match = this.blank.exec(input)) {
                        type = 'blank', prefix = '_', value = match[1];
                    }
                    else if (match = this.simpleApostropheString.exec(input)) {
                        type = 'literal' , value = match[1] , prefix = xsd.string;
                    }
                    break;
                case 'l':
                    if (match = this.literal.exec(input)) {
                        type = 'literal', value = match[1], prefix = match[2];
                    }
                    break;
                case 'f':
                case 't':
                    if (match = this.boolean.exec(input)) {
                        type = 'literal', value = match[0], prefix = xsd.boolean;
                    }
                    break;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                case '+':
                case '-':
                    // Try to find a number. Since it can contain (but not end with) a dot,
                    // we always need a non-dot character before deciding it is a number.
                    // Therefore, try inserting a space if we're at the end of the input.
                    if (match = this.number.exec(input)) {
                        type = 'literal', value = match[0];
                        prefix = (typeof match[1] === 'string' ? xsd.double :
                        (typeof match[2] === 'string' ? xsd.decimal : xsd.integer));
                    }
                    break;
                case '(':
                case ')':
                case '.':
                case ',':
                case '[':
                case ']':
                    matchLength = 1;
                    type = firstChar;
                    break;
                default:
                    matchLength = 1;
                    break;
            }

            if (!type) {
                return reportSyntaxError(this);
            }

            const length = matchLength || (match != null ? match[0].length : 0);

            this.logger.debug(
                `emitToken: type=%s ; value=%s ; prefix=%s ; line=%s ; length=%s`
                   , type
                   , value
                   , prefix
                   , line
                   , length
            );

            emitToken(type,value,prefix,line,length);

            // Advance to next part to tokenize
            input = input.substr(length, input.length);
        }

        function emitToken(type: string, value: string, prefix: string, line: number, length: number) {
            const start = input ? currentLineLength - input.length : currentLineLength;
            const end = start + length;
            const token = { type, value, prefix, line, start, end } as IN3SToken;
            callback(null, token);
        }

        function reportSyntaxError(self: N3SLexer) { 
            let match = /^\S*/.exec(input);
            callback(self.syntaxError(match ? match[0] : ''),{} as IN3SToken); 
        }
    }

    // ### `syntaxError` creates a syntax error for the given issue
    private syntaxError(issue: string) {
        this.input = '';
        const err = new Error(`Unexpected "${issue}" on line ${this.line}.`);
        return err;
    }
}