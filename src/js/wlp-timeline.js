import {select, event} from "d3-selection";
import {scaleTime} from "d3-scale";
import {timeParse} from "d3-time-format";
import {axisBottom} from "d3-axis";
import {zoom} from "d3-zoom";


function makeTimeline() {

    // Using mbostock's block as a starting point for migrating timeline to v4:
    // https://bl.ocks.org/mbostock/34f08d5e11952a80609169b7917d4172

    const timelineMargin = {top: 20, right: 20, bottom: 30, left: 20},
        timelineSize = {
            height: 70 - timelineMargin.top - timelineMargin.bottom,
            width: 900 - timelineMargin.top - timelineMargin.bottom
        },
        x = scaleTime().range([0, timelineSize.width]),
        x0 = scaleTime().range([0, timelineSize.width]),
        parseDate = timeParse("%b %Y");

    x.domain([parseDate("Jan 2016"), parseDate("Jan 2018")]);
    x0.domain(x.domain());

    const xAxis = axisBottom(x)
        .tickSize(-timelineSize.height)
        .tickPadding(6);

    const svgRootTimeline = select("svg");

    const svgAxesTimeline = svgRootTimeline.append("g")
        .attr("id", "timelineAxes")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top + ")");

    svgAxesTimeline.append("g")
        .attr("class", "axis-x")
        .attr("transform", "translate(0," + timelineSize.height + ")")
        .call(xAxis);

    function zoomed() {
        const t = event.transform;
        x.domain(t.rescaleX(x0).domain());
        svgAxesTimeline.select(".axis-x").call(xAxis);
    }

    const zoomAxis = zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [timelineSize.width, timelineSize.height]])
        .extent([[0, 0], [timelineSize.width, timelineSize.height]])
        .on("zoom", zoomed);

    svgRootTimeline.append("rect")
        .attr("class", "zoom")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height)
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top + ")")
        .call(zoomAxis);
}

export default makeTimeline;
