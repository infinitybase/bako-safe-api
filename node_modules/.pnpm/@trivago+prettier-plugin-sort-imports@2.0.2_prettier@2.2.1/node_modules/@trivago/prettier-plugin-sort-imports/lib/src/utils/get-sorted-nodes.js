"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSortedNodes = void 0;
// we do not have types for javascript-natural-sort
//@ts-ignore
var javascript_natural_sort_1 = __importDefault(require("javascript-natural-sort"));
var lodash_1 = require("lodash");
var types_1 = require("@babel/types");
var is_similar_text_in_array_1 = require("./is-similar-text-in-array");
var constants_1 = require("../constants");
/**
 * This function returns all the nodes which are in the importOrder array.
 * The plugin considered these import nodes as local import declarations.
 * @param nodes all import nodes
 * @param order import order
 * @param importOrderSeparation boolean indicating if newline should be inserted after each import order
 */
var getSortedNodes = function (nodes, order, importOrderSeparation) {
    var originalNodes = nodes.map(lodash_1.clone);
    var newLine = importOrderSeparation && nodes.length > 1 ? constants_1.newLineNode : null;
    var sortedNodesByImportOrder = order.reduce(function (res, val) {
        var x = originalNodes.filter(function (node) { return node.source.value.match(new RegExp(val)) !== null; });
        // remove "found" imports from the list of nodes
        lodash_1.pull.apply(void 0, __spreadArray([originalNodes], x));
        if (x.length > 0) {
            x.sort(function (a, b) { return javascript_natural_sort_1.default(a.source.value, b.source.value); });
            if (res.length > 0) {
                return lodash_1.compact(__spreadArray(__spreadArray(__spreadArray([], res), [newLine]), x));
            }
            return x;
        }
        return res;
    }, []);
    var sortedNodesNotInImportOrder = originalNodes.filter(function (node) { return !is_similar_text_in_array_1.isSimilarTextExistInArray(order, node.source.value); });
    sortedNodesNotInImportOrder.sort(function (a, b) {
        return javascript_natural_sort_1.default(a.source.value, b.source.value);
    });
    var shouldAddNewLineInBetween = sortedNodesNotInImportOrder.length > 0 && importOrderSeparation;
    var allSortedNodes = lodash_1.compact(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], sortedNodesNotInImportOrder), [
        shouldAddNewLineInBetween ? constants_1.newLineNode : null
    ]), sortedNodesByImportOrder), [
        constants_1.newLineNode, // insert a newline after all sorted imports
    ]));
    // maintain a copy of the nodes to extract comments from
    var sortedNodesClone = allSortedNodes.map(lodash_1.clone);
    var firstNodesComments = nodes[0].leadingComments;
    // Remove all comments from sorted nodes
    allSortedNodes.forEach(types_1.removeComments);
    // insert comments other than the first comments
    allSortedNodes.forEach(function (node, index) {
        if (!lodash_1.isEqual(nodes[0].loc, node.loc)) {
            types_1.addComments(node, 'leading', sortedNodesClone[index].leadingComments || []);
        }
    });
    if (firstNodesComments) {
        types_1.addComments(allSortedNodes[0], 'leading', firstNodesComments);
    }
    return allSortedNodes;
};
exports.getSortedNodes = getSortedNodes;
