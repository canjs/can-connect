var connect = require("can-connect/connect");
var base = require("can-connect/base/base");
var ns = require("can-util/namespace");

connect.base = base;

module.exports = ns.connect = connect;
