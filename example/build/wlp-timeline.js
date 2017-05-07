(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3')) :
    typeof define === 'function' && define.amd ? define(['exports', 'd3'], factory) :
    (factory((global.wlp_timeline = global.wlp_timeline || {}),global.d3));
}(this, (function (exports,d3) { 'use strict';

function makeTimeline() {

    // Using mbostock's block as a starting point for migrating timeline to v4:
    // https://bl.ocks.org/mbostock/34f08d5e11952a80609169b7917d4172

    const timelineMargin = {top: 20, right: 20, bottom: 30, left: 20};
    const timelineSize = {
        height: 70 - timelineMargin.top - timelineMargin.bottom,
        width: 900 - timelineMargin.top - timelineMargin.bottom
    };

    const svg = d3.select("svg");

    const parseDate = d3.timeParse("%b %Y");

    const x = d3.scaleTime().range([0, timelineSize.width]),
        x0 = d3.scaleTime().range([0, timelineSize.width]);

    const xAxis = d3.axisBottom(x)
        .tickSize(-timelineSize.height)
        .tickPadding(6);

    const zoom$$1 = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [timelineSize.width, timelineSize.height]])
        .extent([[0, 0], [timelineSize.width, timelineSize.height]])
        .on("zoom", zoomed);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height);

    const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top + ")");

    d3.csv("sp500.csv", type, function (error, data) {
        if (error) throw error;

        x.domain(d3.extent(data, function (d) {
            return d.date;
        }));
        x0.domain(x.domain());

        focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + timelineSize.height + ")")
            .call(xAxis);

        svg.append("rect")
            .attr("class", "zoom")
            .attr("width", timelineSize.width)
            .attr("height", timelineSize.height)
            .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top + ")")
            .call(zoom$$1);
    });

    function zoomed() {
        const t = d3.event.transform;
        x.domain(t.rescaleX(x0).domain());
        focus.select(".axis--x").call(xAxis);
    }

    function type(d) {
        d.date = parseDate(d.date);
        d.price = +d.price;
        return d;
    }

}

exports.makeTimeline = makeTimeline;

Object.defineProperty(exports, '__esModule', { value: true });

})));
