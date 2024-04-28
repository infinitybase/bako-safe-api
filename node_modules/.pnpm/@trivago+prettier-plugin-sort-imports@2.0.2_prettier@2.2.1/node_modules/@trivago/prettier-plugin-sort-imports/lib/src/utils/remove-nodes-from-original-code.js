"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeNodesFromOriginalCode = void 0;
/**
 * Removes imports from original file
 * @param code the whole file as text
 * @param nodes to be removed
 */
var removeNodesFromOriginalCode = function (code, nodes) {
    var text = code;
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var node = nodes_1[_i];
        var start = Number(node.start);
        var end = Number(node.end);
        if (Number.isSafeInteger(start) && Number.isSafeInteger(end)) {
            text = text.replace(code.substring(start, end), '');
        }
    }
    return text;
};
exports.removeNodesFromOriginalCode = removeNodesFromOriginalCode;
