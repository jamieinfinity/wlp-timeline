/*global d3*/

//import {d3} from "d3";


export default function timeline(domElement, jsonData) {


var margin = {top: 50, right: 50, bottom: 100, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
    
var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var svg = d3.select(domElement).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

x.domain(d3.extent(jsonData, function(d) { return d[0]; })).nice();
y.domain(d3.extent(jsonData, function(d) { return d[1]; })).nice();

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.svg.axis().scale(x).orient("bottom"));

svg.append("g")
    .attr("class", "y axis")
    .call(d3.svg.axis().scale(y).orient("left"));

svg.selectAll(".point")
    .data(jsonData)
    .enter().append("path")
    .attr("class", "point")
    .attr("d", d3.svg.symbol().type("triangle-up"))
    .attr("transform", function(d) { return "translate(" + x(d[0]) + "," + y(d[1]) + ")"; });

}
