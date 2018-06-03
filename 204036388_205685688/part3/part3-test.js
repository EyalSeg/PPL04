"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const part3_1 = require("./part3");
const assert = require("assert");
//---------------------------------------------------------------------------------
//flatten
let f = [[1], [8, 6, 3, 4], [[2]]];
let f1 = [[], [1, 5, 6, 7], [], [1, 3], []];
let f2 = [[[2], 'ppl'], [true, { vlaue: 'bye' }], [[[[[[5]]]]]]];
assert.deepEqual([...part3_1.flatten([1, [2, [3]], 4, [[5, 6], 7, [[[8]]]]])], [1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual([...part3_1.flatten(f)], [1, 8, 6, 3, 4, 2]);
assert.deepEqual([...part3_1.flatten(f1)], [1, 5, 6, 7, 1, 3]);
assert.deepEqual([...part3_1.flatten(f2)], [2, 'ppl', true, { vlaue: 'bye' }, 5]);
assert.deepEqual(part3_1.take(part3_1.flatten(f), 2), [1, 8]);
assert.deepEqual(part3_1.take(part3_1.flatten(f1), 5), [1, 5, 6, 7, 1]);
assert.deepEqual(part3_1.take(part3_1.flatten(f2), 2), [2, 'ppl']);
//---------------------------------------------------------------------------------
//interleave....
function* evens() {
    var i = 0;
    while (true) {
        yield i;
        i = i + 2;
    }
}
function* odds() {
    var i = 1;
    while (true) {
        yield i;
        i = i + 2;
    }
}
function* evens1() {
    var i = 0;
    yield i;
    yield i + 2;
}
function* odds1() {
    var i = 1;
    yield i;
    yield i + 2;
}
function* evens2() {
    var i = 0;
    yield i;
}
function* odds2() {
    var i = 1;
    while (true) {
        yield i;
        i = i + 2;
    }
}
assert.deepEqual(part3_1.take(part3_1.interleave(evens(), odds()), 8), [0, 1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(part3_1.take(part3_1.interleave(evens1(), odds1()), 8), [0, 1, 2, 3]);
assert.deepEqual(part3_1.take(part3_1.interleave(evens2(), odds2()), 8), [0, 1, 3, 5, 7, 9, 11, 13]);
//-------------------------------------------------------------------------------------
//cyclic
assert.deepEqual((part3_1.take(part3_1.cycle([1, 2, 3]), 8)), [1, 2, 3, 1, 2, 3, 1, 2]);
assert.deepEqual((part3_1.take(part3_1.cycle([1]), 5)), [1, 1, 1, 1, 1]);
assert.deepEqual((part3_1.take(part3_1.cycle([[1], 2, 3, 4, 5, 6]), 4)), [[1], 2, 3, 4]);
//------------------------------------------------------------------------------------
//chian tests...
let c1 = [[{ ofir: 100, adi: 100 }, true, 'its funny'], [13, 17, true, false, 'black', 'white'], [[1, 2, 3], ['a', 'b', 'c'],
        [{ test: 'looks OK', amothertest: 'still ok' }, true]]];
assert.deepEqual([...part3_1.chain(c1)], [{ ofir: 100, adi: 100 },
    true,
    'its funny',
    13,
    17,
    true,
    false,
    'black',
    'white',
    [1, 2, 3],
    ['a', 'b', 'c'],
    [{ test: 'looks OK', amothertest: 'still ok' }, true]]);
let c2 = [['a', 'b'], ['c', 'd']];
assert.deepEqual([...part3_1.chain(c2)], ['a', 'b', 'c', 'd']);
let c3 = [[], ['a', ['b']], [], ['c', 'd'], []];
assert.deepEqual([...part3_1.chain(c3)], ['a', ['b'], 'c', 'd']);
assert.deepEqual(part3_1.take(part3_1.chain(c1), 1), [{ ofir: 100, adi: 100 }]);
assert.deepEqual(part3_1.take(part3_1.chain(c2), 2), ['a', 'b']);
assert.deepEqual(part3_1.take(part3_1.chain(c3), 2), ['a', ['b']]);
console.log('done');
//# sourceMappingURL=part3-test.js.map