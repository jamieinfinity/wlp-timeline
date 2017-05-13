import {select, event} from "d3-selection";
import {scaleTime} from "d3-scale";
// import {timeParse} from "d3-time-format";
import {axisBottom} from "d3-axis";
import {zoom} from "d3-zoom";

const minTimelineDate = new Date('2016-01-01');
const maxTimelineDate = new Date('2018-01-02');

const timelineMargin = {top: 20, right: 20, bottom: 30, left: 20},
    timelineSize = {
        height: 70 - timelineMargin.top - timelineMargin.bottom,
        width: 0
    };

function makeTimeline(domElementID, width) {

    timelineSize.width = width - timelineMargin.left - timelineMargin.right;

    const x = scaleTime().domain([minTimelineDate, maxTimelineDate]).range([0, timelineSize.width]),
          x0 = scaleTime().domain([minTimelineDate, maxTimelineDate]).range([0, timelineSize.width]);

    const xAxis = axisBottom(x)
        .tickSize(-timelineSize.height)
        .tickPadding(6);

    let rootMargin = 40;
    const root = select(domElementID).append("div")
        .attr("id", "timelineRootDiv")
        .style("top", rootMargin + "px")
        .style("bottom", rootMargin + "px")
        .style("left", rootMargin + "px")
        .style("right", rootMargin + "px");

    const svgRootTimeline = root.append("svg")
        .attr("background-color", "red")
        .attr("id", "timelineRootSVG")
        .attr("width", timelineSize.width + timelineMargin.left + timelineMargin.right)
        .attr("height", timelineSize.height + timelineMargin.top / 2 + timelineMargin.bottom);

    const svgAxesTimeline = svgRootTimeline.append("g")
        .attr("id", "timelineAxes")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top / 2 + ")");

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

    const svgInnerTimeline = svgRootTimeline.append("svg")
        .attr("id", "timelineInner")
        .attr("vector-effect", "non-scaling-stroke")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height)
        .attr("x", timelineMargin.left)
        .attr("y", timelineMargin.top / 2)
        .attr("viewBox", "0 0 " + timelineSize.width + " " + timelineSize.height)
        .call(zoomAxis);

    svgInnerTimeline.append("rect")
        .attr("id", "innertimelinebackground")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height);

    const svgOuterTimeline = svgRootTimeline.append("g")
        .attr("id", "timelineOuter")
        .attr("pointer-events", "none")
        .attr("transform", "translate(" + timelineMargin.left + "," + timelineMargin.top / 2 + ")");

    svgOuterTimeline.append("rect")
        .attr("id", "outertimelinebackground")
        .attr("width", timelineSize.width)
        .attr("height", timelineSize.height);

}

export default makeTimeline;
