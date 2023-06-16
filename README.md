# n32s

The n32s code is a precompiler from Notation3 to a N3S format that is used by Prolog reasoners such as [eye](https://github.com/eyereasoner/eye), [retina](https://github.com/eyereasoner/retina) and [Latar](https://github.com/MellonScholarlyCommunication/Latar).

## Installation

```
yarn install
```

## Usage

```
node js/index.js <n3-file>
```

## Example

```
$ cat demo.n3
@prefix : <urn:example.org:> .
@prefix log: <http://www.w3.org/2000/10/swap/log#> .

:Alice a :Person .

(_:X) log:onNegativeSurface {
    _:X a :Person .
    () log:onNegativeSurface {
        _:X a :Human .
    } .
} .

$ node js/index.js demo.n3
'<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'('<urn:example.org:Alice>','<urn:example.org:Person>').
'<http://www.w3.org/2000/10/swap/log#onNegativeSurface>'(['_:X'],('<http://www.w3.org/2000/10/swap/log#onNegativeSurface>'([],('<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'('_:X','<urn:example.org:Human>'))),'<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'('_:X','<urn:example.org:Person>'))).
```