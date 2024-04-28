"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("@babel/parser");
var traverse_1 = __importDefault(require("@babel/traverse"));
var types_1 = require("@babel/types");
var get_all_comments_from_nodes_1 = require("../get-all-comments-from-nodes");
var get_sorted_nodes_1 = require("../get-sorted-nodes");
var getSortedImportNodes = function (code, options) {
    var importNodes = [];
    var ast = parser_1.parse(code, __assign(__assign({}, options), { sourceType: 'module' }));
    traverse_1.default(ast, {
        ImportDeclaration: function (path) {
            var tsModuleParent = path.findParent(function (p) {
                return types_1.isTSModuleDeclaration(p);
            });
            if (!tsModuleParent) {
                importNodes.push(path.node);
            }
        },
    });
    return get_sorted_nodes_1.getSortedNodes(importNodes, [], false);
};
var getComments = function (commentNodes) {
    return commentNodes.map(function (node) { return node.value; });
};
test('it returns empty array when there is no comment', function () {
    var result = getSortedImportNodes("import z from 'z';\n    ");
    var commentNodes = get_all_comments_from_nodes_1.getAllCommentsFromNodes(result);
    var comments = getComments(commentNodes);
    expect(comments).toEqual([]);
});
test('it returns single comment of a node', function () {
    var result = getSortedImportNodes("// first comment\nimport z from 'z';\n");
    var commentNodes = get_all_comments_from_nodes_1.getAllCommentsFromNodes(result);
    var comments = getComments(commentNodes);
    expect(comments).toEqual([' first comment']);
});
test('it returns all comments for a node', function () {
    var result = getSortedImportNodes("// first comment\n// second comment\nimport z from 'z';\n");
    var commentNodes = get_all_comments_from_nodes_1.getAllCommentsFromNodes(result);
    var comments = getComments(commentNodes);
    expect(comments).toEqual([' first comment', ' second comment']);
});
test('it returns comment block for a node', function () {
    var result = getSortedImportNodes("\n/**\n * some block\n */\nimport z from 'z';\n");
    var commentNodes = get_all_comments_from_nodes_1.getAllCommentsFromNodes(result);
    var comments = getComments(commentNodes);
    expect(comments).toEqual(['*\n * some block\n ']);
});
