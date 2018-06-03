import {race,take,interleave, cycle, chain,flatten } from './part3'
import * as assert from 'assert'

// Checking race
const createPromise1 = () => new Promise(function(resolve, reject) {
    setTimeout(resolve, 500, 'one');
});
 
const createPromise2 = () => new Promise(function(resolve, reject) {
    setTimeout(resolve, 300, 'two');
});
 
const createPromise3 = () => new Promise(function(resolve, reject) {
    setTimeout(resolve, 200, 'three');
});

const createPromise4 = () => new Promise(function(resolve, reject) {
    setTimeout(reject, 100, 'four');
});

const createPromise5 = () => new Promise(function(resolve, reject) {
    setTimeout(resolve, 50, 'five');
});

const createPromise6 = () => new Promise(function(resolve, reject) {
    setTimeout(reject, 30, 'six');
});

const createPromise7 = () => new Promise(function(resolve, reject) {
    setTimeout(reject, 10, 'seven');
});

const createPromiseAssert = () => new Promise(function(resolve, reject) {
    setTimeout(resolve, 2000, 'five');
});



let count = 0;

race([createPromise1(), createPromise2()]).then(function(value) {
    assert.deepEqual(value,"two");
    count++;
})

race([createPromise1(), createPromise2(),createPromise3()]).then(function(value) {
    assert.deepEqual(value,"three");
    count++;
})

race([createPromise1(), createPromise2(),createPromise3()]).then(function(value) {
    assert.deepEqual(value,"three");
    count++;
})

race([createPromise1(), createPromise2(),createPromise3(),createPromise4()]).catch(function(value) {
    assert.deepEqual(value,"four");
    count++;
})

race([createPromise1(), createPromise2(),createPromise3(),createPromise4(),createPromise5()]).then(function(value) {
    assert.deepEqual(value,"five");
    count++;
})

race([createPromise1(), createPromise2(),createPromise3(),createPromise4(),createPromise5(),createPromise6()]).catch(function(value) {
    assert.deepEqual(value,"six");
    count++;
})

race([createPromise1(), createPromise2(),createPromise3(),createPromise4(),createPromise5(),createPromise6(),createPromise7()]).catch(function(value) {
    assert.deepEqual(value,"seven");
    count++;
})

createPromiseAssert().then(function(value) {
    assert.deepEqual(count,7,`Error reason: should have entered 7 .then or .catch but entered only ${count} !!!`);
})


// Checking flatten
assert.deepEqual([...flatten([1, [2, [3]], 4, [[5, 6], 7, [[[8]]]]])],[1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual([...flatten([1, 2, 3, 4, [[5, 6], 7, [[[8]]]]])],[1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual([...flatten([[1], 2, 3, 4, [[5, 6], 7, [[[8]]]]])],[1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual([...flatten([[1], 2, 3, 4, [[5, 6], [[[8]]]]])],[1, 2, 3, 4, 5, 6, 8]);
assert.deepEqual([...flatten([[[10]], 2, 3, 4, [[5, 6], [[[8]]]]])],[10, 2, 3, 4, 5, 6, 8]);
assert.deepEqual([...flatten([[[10]], [2, [11,3]], 4, [[5, 6], [[[8]]]]])],[10, 2, 11, 3, 4, 5, 6, 8]);

// Checking interleave
function* naturalNumbers() {
    for (let n=0;; n++) {
        yield n;
    }

}function* filterGen(generator, filterFunc) {
    for (let x of generator) {
        if (filterFunc(x)) {
            yield x;
        }
    }
}

function* untill10() {
    for (let x = 0; x < 10; x++) {
        yield x;
    }
}

function* untill10Even() {
    for (let x = 0; x < 10; x++) {
        if((x % 2) === 0){
            yield x;
        }
    }
}

function* untill10Odd() {
    for (let x = 0; x < 10; x++) {
        if((x % 2) === 1){
            yield x;
        }
    }
}

let evens = filterGen(naturalNumbers(),(x) => (x % 2) === 0);
let odds = filterGen(naturalNumbers(),(x) => (x % 2) === 1);
assert.deepEqual(take(interleave(evens, odds),8),[0, 1, 2, 3, 4, 5, 6, 7]);

evens = filterGen(naturalNumbers(),(x) => (x % 2) === 0);
odds = filterGen(naturalNumbers(),(x) => (x % 2) === 1);
assert.deepEqual(take(interleave(odds,evens),8),[1,0,3,2,5,4,7,6]);

let threes = filterGen(naturalNumbers(),(x) => (x % 3) === 0);
let sixes = filterGen(naturalNumbers(),(x) => (x % 6) === 0);
assert.deepEqual(take(interleave(threes,sixes),8),[0,0,3,6,6,12,9,18]);

threes = filterGen(naturalNumbers(),(x) => (x % 3) === 0);
sixes = filterGen(naturalNumbers(),(x) => (x % 6) === 0);
assert.deepEqual(take(interleave(threes,sixes),10),[0,0,3,6,6,12,9,18,12,24]);

assert.deepEqual(take(interleave(untill10(),untill10Even()),15),[0, 0, 1, 2, 2, 4, 3, 6, 4, 8, 5, 6, 7, 8, 9]);
assert.deepEqual(take(interleave(untill10(),untill10Even()),14),[0, 0, 1, 2, 2, 4, 3, 6, 4, 8, 5, 6, 7, 8]);
assert.deepEqual(take(interleave(untill10(),untill10Even()),16),[0, 0, 1, 2, 2, 4, 3, 6, 4, 8, 5, 6, 7, 8, 9]);
assert.deepEqual(take(interleave(untill10Odd(),untill10()),15),[1, 0, 3, 1, 5, 2, 7, 3, 9, 4, 5, 6, 7, 8, 9]);

// chcking cycle
assert.deepEqual(take(cycle([1, 2, 3]), 8),[1, 2, 3, 1, 2, 3, 1, 2]);
assert.deepEqual(take(cycle([]), 8),[]);
assert.deepEqual(take(cycle([1]), 8),[1, 1, 1, 1, 1, 1, 1, 1,]);
assert.deepEqual(take(cycle([2]), 2),[2, 2]);
assert.deepEqual(take(cycle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 5),[1, 2, 3, 4, 5]);
assert.deepEqual(take(cycle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 10),[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

// checking chain
assert.deepEqual([...chain([['A', 'B'], ['C', 'D']])],['A', 'B', 'C', 'D']);
assert.deepEqual([...chain([[1, 2], [3, 4]])],[1, 2, 3, 4]);
assert.deepEqual([...chain([['A', 'B'], ['C', 'D'],[1, 2, 3, 4]])],['A', 'B', 'C', 'D',1, 2, 3, 4]);
assert.deepEqual([...chain([['A', 'B']])],['A', 'B']);
assert.deepEqual([...chain([])],[]);
assert.deepEqual([...chain([[],[]])],[]);
assert.deepEqual([...chain([[],['A']])],['A']);
console.log('done!')