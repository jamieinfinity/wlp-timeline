import {select, event} from "d3-selection";
import {scaleTime} from "d3-scale";
import {timeParse} from "d3-time-format";
import {axisBottom} from "d3-axis";
import {zoom} from "d3-zoom";



function makeTimeline() {

    // Using mbostock's block as a starting point for migrating timeline to v4:
    // https://bl.ocks.org/mbostock/34f08d5e11952a80609169b7917d4172

    const timelineMargin = {top: 20, right: 20, bottom: 30, left: 20};
    const timelineSize = {
        height: 70 - timelineMargin.top - timelineMargin.bottom,
        width: 900 - timelineMargin.top - timelineMargin.bottom
    };

    const svg = select("svg");

    const parseDate = timeParse("%b %Y");

    const x = scaleTime().range([0, timelineSize.width]),
        x0 = scaleTime().range([0, timelineSize.width]);

    const xAxis = axisBottom(x)
        .tickSize(-timelineSize.height)
        .tickPadding(6);

    const zoomAxis = zoom()
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

    x.domain([parseDate("Jan 2016"), parseDate("Jan 2018")]);
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
        .call(zoomAxis);

    function zoomed() {
        const t = event.transform;
        x.domain(t.rescaleX(x0).domain());
        focus.select(".axis--x").call(xAxis);
    }

}

export default makeTimeline;
