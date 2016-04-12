/*global d3*/

//import {d3} from "d3";


export {drawTimeline};

var timelineMargin = {top: 20, right: 20, bottom: 20, left: 20},
    timelineHeight = 70 - timelineMargin.top - timelineMargin.bottom;
var timelineWidth;

var svgRootTimeline;
var svgInnerTimeline;
var svgOuterTimeline;
var svgAxesTimeline;

var timelineXAxisBottomMinor;
var timelineXAxisBottomMajor;
var timelineXAxisDays;

var sharedTimeScale;
var zoom;


function setUpCommonTimeAxis(minDate, maxDate) {

    sharedTimeScale = d3.time.scale().domain([minDate, maxDate]).range([0, timelineWidth]);

    // Two formats are used so they can be styled differently (i.e. one bold, the other not)
    var customTimeFormatMinor = d3.time.format.multi([
        [".%L", function(d) { return d.getMilliseconds(); }],
        [":%S", function(d) { return d.getSeconds(); }],
        ["%_I:%M", function(d) { return d.getMinutes(); }],
        ["%_I %p", function(d) { return d.getHours(); }],
        [" ", function(d) { return d.getDay() && d.getDate() != 1; }],
        [" ", function(d) { return d.getDate() != 1; }],
        [" ", function(d) { return d.getMonth(); }],
        [" ", function() { return true; }]
    ]);
    var customTimeFormatMajor = d3.time.format.multi([
        [" ", function(d) { return d.getMilliseconds(); }],
        [" ", function(d) { return d.getSeconds(); }],
        [" ", function(d) { return d.getMinutes(); }],
        [" ", function(d) { return d.getHours(); }],
        ["%-m/%-d/%y", function(d) { return d.getDay() && d.getDate() != 1; }],
        ["%-m/%-d/%y", function(d) { return d.getDate() != 1; }],
        ["%b", function(d) { return d.getMonth(); }],
        ["%Y", function() { return true; }]
    ]);

    timelineXAxisBottomMinor = d3.svg.axis()
        .scale(sharedTimeScale)
        .orient("bottom")
        .tickFormat(customTimeFormatMinor)
        .tickSize(-timelineHeight)
        .tickPadding(6);

    timelineXAxisBottomMajor = d3.svg.axis()
        .scale(sharedTimeScale)
        .orient("bottom")
        .tickFormat(customTimeFormatMajor)
        .tickSize(-timelineHeight)
        .tickPadding(6);

    timelineXAxisDays = d3.svg.axis()
        .scale(sharedTimeScale)
        .orient("bottom")
        .tickSize(-timelineHeight)
        .ticks(d3.time.days, 1)
        .tickFormat("");
}

function timelineSpanInDays() {
    var minDate = sharedTimeScale.invert(0);
    var maxDate = sharedTimeScale.invert(timelineWidth);
    return (maxDate.getTime() - minDate.getTime())/1000/3600/24;
}



function updateTimeline() {
    svgAxesTimeline.select(".x.axisBottomMinor").call(timelineXAxisBottomMinor);
    svgAxesTimeline.select(".x.axisBottomMajor").call(timelineXAxisBottomMajor);
    svgAxesTimeline.select(".x.axis-days").call(timelineXAxisDays);

    svgAxesTimeline.selectAll("path").style("fill", "none");
    svgAxesTimeline.selectAll("line").style("stroke", "#eee");

    svgAxesTimeline.select(".x.axisBottomMinor").selectAll("line").style("stroke-width", 1);
    svgAxesTimeline.select(".x.axisBottomMajor").selectAll("line").style("stroke-width", 1);
    svgAxesTimeline.select(".x.axis-days").selectAll("line")
        .style("stroke", "#ccc")
        .style("stroke-width", 1)
        .style("visibility", function() {
            if(timelineSpanInDays() > 60) {
                return "hidden";
            }
            return "visible";
        });
}



function drawTimeline(domElement, width) {

    timelineWidth = width - timelineMargin.left - timelineMargin.right;;

    var minDate = new Date('January 1, 2016');
    var maxDate = new Date('January 1, 2017');
    setUpCommonTimeAxis(minDate, maxDate);

    zoom = d3.behavior.zoom()
        .x(sharedTimeScale)
        .scaleExtent([-2000, 2000])
        .on("zoom", function() {
            updateTimeline();
        });

    var rootmargin = 20;
    d3.select(domElement)
        .style("font-family", "Avenir")
        .style("font-size", "10px")
        //.style("background-color", "white")
        .style("top", rootmargin+"px")
        .style("bottom", rootmargin+"px")
        .style("left", rootmargin+"px")
        .style("right", rootmargin+"px")
        .style("position", "absolute");

    svgRootTimeline = d3.select(domElement).append("svg")
        .attr("width", timelineWidth + timelineMargin.left + timelineMargin.right)
        .attr("height", timelineHeight + timelineMargin.top/2 + timelineMargin.bottom);

    svgAxesTimeline = svgRootTimeline.append("g")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top/2 + ")");

    svgAxesTimeline.append("g")
        .attr("fill", "#aaa") // text color
        .attr("class", "x axisBottomMinor")
        .attr("transform", "translate(0," + timelineHeight + ")");

    svgAxesTimeline.append("g")
        .attr("fill", "#666") // text color
        .attr("class", "x axisBottomMajor")
        .attr("transform", "translate(0," + timelineHeight + ")");

    svgAxesTimeline.append("g")
        .attr("class", "x axis-days")
        .attr("transform", "translate(0," + timelineHeight + ")")
        .attr("stroke-dasharray", "2,2");

    updateTimeline();

    svgInnerTimeline = svgRootTimeline.append("svg")
        .attr("vector-effect", "non-scaling-stroke")
        .attr("width",  timelineWidth)
        .attr("height", timelineHeight)
        .attr("x", timelineMargin.left)
        .attr("y", timelineMargin.top/2)
        .attr("viewBox", "0 0 " + timelineWidth + " " + timelineHeight)
        .call(zoom);
        // .call(tip);

    svgInnerTimeline.append("rect")
        .attr("fill", "white")
        .attr("fill-opacity", 0)
        .attr("width", timelineWidth)
        .attr("height", timelineHeight)
        .attr("class", "innertimelinebackground");

    svgOuterTimeline = svgRootTimeline.append("g")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top/2 + ")");

    svgOuterTimeline.append("rect")
        .attr("fill", "white")
        .attr("fill-opacity", 0.0)
        .attr("width", timelineWidth)
        .attr("height", timelineHeight)
        .attr("stroke", "#eee")
        .attr("stroke-width", 3)
        .attr("class", "outertimelinebackground");

}
