import { N3SLexer , IN3SToken }  from '../src/N3SLexer';
import * as should from 'should';
import {expect} from 'expect';

describe('N3SLexer', () => {
  describe('The N3SLexer export', () => {
    it('should be an N3SLexer constructor', () => {
      const lexer = new N3SLexer();
      expect(lexer).not.toBeNull();
    });
  });

  describe('A N3SLexer instance', () => {
    function createLexer() { return new N3SLexer({comments: true}); }
    it('should tokenize the empty string',
      shouldTokenize(createLexer(),
                    '',
                    [{ type: 'eof', line: 0 }]));

    it('should tokenize an IRI',
      shouldTokenize(createLexer(),
                    '\'<urn:foo>\'',
                    [ { type: 'IRI', value: 'urn:foo', line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a blank node',
      shouldTokenize(createLexer(),
                    '\'_:X\'',
                    [ { type: 'blank', value: 'X', prefix: '_' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize the boolean true',
      shouldTokenize(createLexer(),
                    'true',
                    [ { type: 'literal', value: 'true', prefix: 'http://www.w3.org/2001/XMLSchema#boolean' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize the boolean false',
      shouldTokenize(createLexer(),
                    'false',
                    [ { type: 'literal', value: 'false', prefix: 'http://www.w3.org/2001/XMLSchema#boolean' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a string value',
      shouldTokenize(createLexer(),
                    '\'a string\'',
                    [ { type: 'literal', value: 'a string', prefix: 'http://www.w3.org/2001/XMLSchema#string' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize an integer value',
      shouldTokenize(createLexer(),
                    '42',
                    [ { type: 'literal', value: '42', prefix: 'http://www.w3.org/2001/XMLSchema#integer' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a negative integer value',
      shouldTokenize(createLexer(),
                    '-42',
                    [ { type: 'literal', value: '-42', prefix: 'http://www.w3.org/2001/XMLSchema#integer' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a decimal value',
      shouldTokenize(createLexer(),
                    '42.1',
                    [ { type: 'literal', value: '42.1', prefix: 'http://www.w3.org/2001/XMLSchema#decimal' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a literal value',
      shouldTokenize(createLexer(),
                    'literal(42,\'http://www.w3.org/2001/XMLSchema#integer\')',
                    [ { type: 'literal', value: '42', prefix: 'http://www.w3.org/2001/XMLSchema#integer' , line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a list value',
      shouldTokenize(createLexer(),
                    '[\'_:x\',\'_:y\']',
                    [ { type: '[', line: 0 } ,
                      { type: 'blank', value: 'x', prefix: '_' , line: 0 } ,
                      { type: ',', line: 0 } ,
                      { type: 'blank', value: 'y', prefix: '_' , line: 0 } ,
                      { type: ']', line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a conjunction value',
      shouldTokenize(createLexer(),
                    '(\'_:x\',\'_:y\')',
                    [ { type: '(', line: 0 } ,
                      { type: 'blank', value: 'x', prefix: '_' , line: 0 } ,
                      { type: ',', line: 0 } ,
                      { type: 'blank', value: 'y', prefix: '_' , line: 0 } ,
                      { type: ')', line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a directive',
      shouldTokenize(createLexer(),
                    ':- dynamic(\'<urn:example.org:value>\'/2).',
                    [ { type: 'directive', line: 0 , value: 'dynamic(\'<urn:example.org:value>\'/2).'} ,
                      { type: 'eof', line: 0 }
                    ]));

    it('should tokenize a comment',
      shouldTokenize(createLexer(),
                    "% a comment\n",
                    [ { type: 'comment', line: 0 , value: ' a comment'} ,
                      { type: 'eof', line: 1 }
                    ]));

    it('should tokenize the end of term',
      shouldTokenize(createLexer(),
                    '.',
                    [ { type: '.', line: 0 } ,
                      { type: 'eof', line: 0 }
                    ]));
  });
});

function shouldTokenize(lexer: N3SLexer, input: string, expected: any) {
  const ignoredAttributes : any = { start: true, end: true };

  return function (done: any) {
    const result : any[] = [];
    lexer.tokenize(input, tokenCallback);

    function tokenCallback(error: Error | null, token: any) {
      expect(error).toBeNull();
      expect(token).not.toBeNull();
      const expectedItem = expected[result.length];
      if (expectedItem) {
        for (const attribute in token) {
          if (typeof expectedItem[attribute] === 'undefined' &&
              (token[attribute] === '' || (ignoredAttributes[attribute]))) {
            delete token[attribute];
          }
        }
      }
      result.push(token);
      if (token.type === 'eof') {
        expect(result).toEqual(expected);
        done(null, result);
      }
    }
  };
}