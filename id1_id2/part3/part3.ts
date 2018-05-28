/*
 * From Mozilla Developer Network:
 * The Promise.race(promises) method returns a promise that resolves or rejects
 * as soon as one of the promises in the array resolves or rejects,
 * with the value or reason from that promise.
 */
function race<T>(promises : Promise<T>[]) {
   return new Promise((resolve, reject) => {
       promises.forEach(element => {
           element.then((val) => resolve(val),
                        (err) => reject(err))
       });
   })
    // TODO
}

/*
 * Write a function that takes an arbitrarily
 * nested array and generates the sequence
 * of values from the array.
 * Example: [...flatten([1, [2, [3]], 4, [[5, 6], 7, [[[8]]]]])] => [1, 2, 3, 4, 5, 6, 7, 8]
 */
function* flatten<T>(array : Array<T>) {
    if (array === undefined || array == null || array.length == 0)
        return 
    
    let head = array[0]
    if (Array.isArray(head))
        yield* flatten(head)
    else
        yield head

    yield* flatten(array.slice(1))
}

console.log(take(flatten([1, [2, [3]], 4, [[5, 6], 7, [[[8]]]]]), 8))
/*
 * Given two generators, write a function
 * that generates the interleaved sequence
 * of elements of both generators.
 * Example: given generators for even and odd
 * numbers, take(interleave(evens(), odds()), 8) => [0, 1, 2, 3, 4, 5, 6, 7]
 */
function* interleave(g1, g2) {
    if (isNullOrUndefinedOrEmpty(g1) && isNullOrUndefinedOrEmpty(g2))
    return

    if (isNullOrUndefinedOrEmpty(g1))
    {
        yield* g2
        return
    }

    if (isNullOrUndefinedOrEmpty(g2))
    {
        yield* g1  
        return        
    }

    yield g1[0]
    yield g2[0]

    yield* interleave(g1.slice(1), g2.slice(1))
}

/*
 * Write a function that continuously generates
 * elements of a given array in a cyclic manner.
 * Example: take(cycle([1, 2, 3]), 8) => [1, 2, 3, 1, 2, 3, 1, 2]
 */
function* cycle(array) {
    while (true)
        yield* array
}

/*
 * Write a function that returns
 * all elements from the first array,
 * then all elements from the next array, etc.
 * This function lets us to treat an array of arrays
 * as a single collection.
 * Example: [...chain([['A', 'B'], ['C', 'D']])] => ['A', 'B', 'C', 'D']
 */
function* chain(arrays) {
    if (isNullOrUndefinedOrEmpty(arrays))
        return

    yield* arrays[0]
    chain(arrays.split(1))
}

/*
 * In order to make testing your generators easier,
 * the function take takes a generator g and a natural number n
 * and returns an array of the first n elements of g.
 * If g is exhausted before reaching n elements,
 * less than n elements are returned. 
 */
function take(g, n) {
    const result = [];
    for (let i = 0; i < n; i++) {
        const { value, done } = g.next();
        if (done) {
            break;
        }
        result.push(value);
    }
    return result;
}

function isNullOrUndefinedOrEmpty(x) {
    return (x == "undefined" || x == "null" || x.length == 0)
}