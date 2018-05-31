"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ramda_1 = require("ramda");
var L5_ast_1 = require("./L5-ast");
var TExp_1 = require("./TExp");
var error_1 = require("./error");
var list_1 = require("./list");
;
exports.isSub = function (x) { return x.tag === "Sub"; };
// Constructors:
// Signature: makeSub(vars, tes)
// Purpose: Create a substitution in which the i-th element of 'variables'
//          is mapped to the i-th element of 'tes'.
// Example: makeSub(
//             map(parseTE, ["x", "y", "z"]),
//             map(parseTE, ["number", "boolean", "(number -> number)"])
//          => {tag: "Sub", vars: [x y z], [numTexp, boolTexp, ProcTexp([NumTexp, NumTexp])]}
//          makeSub(map(parseTE, ["x", "y", "z"]),
//                  map(parseTE, ["number", "boolean", "(z -> number)"]))
//          => error makeSub: circular substitution
// Pre-condition: (length variables) = (length tes)
//                variables has no repetitions (set)
exports.makeSub = function (vars, tes) {
    // console.log(`makeSub ${map(prop('var'), vars)} with ${map(unparseTExp, tes)}`);
    var noOccurrences = ramda_1.zipWith(exports.checkNoOccurrence, vars, tes);
    if (error_1.hasNoError(noOccurrences))
        return { tag: "Sub", vars: vars, tes: tes };
    else
        return Error(error_1.getErrorMessages(noOccurrences));
};
exports.makeEmptySub = function () { return ({ tag: "Sub", vars: [], tes: [] }); };
// Purpose: when attempting to bind tvar to te in a sub - check whether tvar occurs in te.
// Return error if a circular reference is found.
exports.checkNoOccurrence = function (tvar, te) {
    // Your codebase is bad and you should feel bad!!!
    var check = function (e) {
        return TExp_1.isTVar(e) ? ((e.var === tvar.var) ? Error("Occur check error - circular sub " + tvar.var + " in " + TExp_1.unparseTExp(te)) : true) :
            TExp_1.isAtomicTExp(e) ? true :
                TExp_1.isProcTExp(e) ? (error_1.hasNoError(ramda_1.map(check, e.paramTEs)) ?
                    check(e.returnTE) :
                    Error(error_1.getErrorMessages(ramda_1.map(check, e.paramTEs)))) :
                    TExp_1.isPairTExp(e) ?
                        (error_1.hasNoError([check(e.TLeft), check(e.TRight)])) ?
                            true :
                            Error(error_1.getErrorMessages([check(e.TLeft), check(e.TRight)])) :
                        Error("Bad type expression " + e + " in " + te);
    };
    // console.log(`checkNoOcc ${tvar.var} in ${unparseTExp(te)}`);
    return check(te);
};
exports.isEmptySub = function (sub) { return exports.isSub(sub) && L5_ast_1.isEmpty(sub.vars) && L5_ast_1.isEmpty(sub.tes); };
// Purpose: If v is in sub.vars - return corresponding te, else v unchanged.
exports.subGet = function (sub, v) {
    var lookup = function (vars, tes) {
        return L5_ast_1.isEmpty(vars) ? v :
            TExp_1.eqTVar(list_1.first(vars), v) ? list_1.first(tes) :
                lookup(list_1.rest(vars), list_1.rest(tes));
    };
    return lookup(sub.vars, sub.tes);
};
// ============================================================
// Purpose: apply a sub to a TExp
// Example:
// unparseTexp(applySub(makeSub(map(parseTE, ["T1", "T2"]), map(parseTE, ["number", "boolean"])),
//                      parseTE("(T1 * T2 -> T1)")) =>
// "(number * boolean -> number)"
exports.applySub = function (sub, te) {
    return exports.isEmptySub(sub) ? te :
        TExp_1.isAtomicTExp(te) ? te :
            TExp_1.isTVar(te) ? exports.subGet(sub, te) :
                TExp_1.isProcTExp(te) ? TExp_1.makeProcTExp(ramda_1.map(ramda_1.curry(exports.applySub)(sub), te.paramTEs), exports.applySub(sub, te.returnTE)) :
                    TExp_1.isPairTExp(te) ? TExp_1.makePairTExp(exports.applySub(sub, te.TLeft), exports.applySub(sub, te.TRight)) :
                        te;
};
// ============================================================
// Purpose: Returns the composition of substitutions s.t.:
//  applySub(result, te) === applySub(sub2, applySub(sub1, te))
exports.combineSub = function (sub1, sub2) {
    return exports.isEmptySub(sub1) ? sub2 :
        exports.isEmptySub(sub2) ? sub1 :
            combine(sub1, sub2.vars, sub2.tes);
};
var combine = function (sub, vars, tes) {
    return L5_ast_1.isEmpty(vars) ? sub :
        error_1.isError(sub) ? sub :
            combine(exports.extendSub(sub, list_1.first(vars), list_1.first(tes)), list_1.rest(vars), list_1.rest(tes));
};
// Purpose: extend a substitution with one pair (tv, te)
// Calls to makeSub to do the occur-check
exports.extendSub = function (sub, v, te) {
    var sub2 = exports.makeSub([v], [te]);
    if (error_1.isError(sub2))
        return sub2;
    if (exports.isEmptySub(sub))
        return sub2;
    var updatedTes = ramda_1.map(ramda_1.curry(exports.applySub)(sub2), sub.tes);
    if (ramda_1.map(ramda_1.prop('var'), sub.vars).includes(v.var))
        return exports.makeSub(sub.vars, updatedTes);
    else
        return exports.makeSub([v].concat(sub.vars), [te].concat(updatedTes));
};
//# sourceMappingURL=L5-substitution-adt.js.map