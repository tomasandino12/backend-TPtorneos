"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var app = (0, express_1.default)();
app.use('/', function (req, res) {
    res.send('Hola mundo');
});
app.listen(3000, function () {
    console.log("Server running on http://localhost:3000/");
});
