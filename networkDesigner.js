var margin = {
        top: 0,
        right: 100,
        bottom: 150,
        left: 0
    },
    width = window.innerWidth - margin.left - margin.right,
    height = window.innerHeight - margin.top - margin.bottom;


var formatNumber = d3.format(",.2f"),
    format = function(d) {
        return formatNumber(d);
    },
    color = d3.scale.category20();

var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")



var sankey = d3.sankey()
    .nodeWidth(36)
    .nodePadding(50)
    .size([width, height]);

var path = sankey.link();

d3.json("network.json", function(network) {

    sankey
        .nodes(network.nodes)
        .links(network.links)
        .layout(32);

    function setDash(d) {
        var d3this = d3.select(this);
        var totalLength = d3this.node().getTotalLength();
        d3this
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
    }

    function branchAnimate(nodeData) {
        var links = svg.selectAll(".gradient-link")
            .filter(function(gradientD) {
                return nodeData.sourceLinks.indexOf(gradientD) > -1
            });
        var nextLayerNodeData = [];
        links.each(function(d) {
            nextLayerNodeData.push(d.target);
        });

        links
            .style("opacity", null)
            .transition()
            .duration(400)
            .ease('linear')
            .attr('stroke-dashoffset', 0)
            .each("end", function() {
                nextLayerNodeData.forEach(function(d) {
                    branchAnimate(d);
                });
            });
    } //end branchAnimate

    var gradientLink = svg.append("g").selectAll(".gradient-link")
        .data(network.links)
        .enter().append("path")
        .attr("class", "gradient-link")
        .attr("d", path)
        .style("stroke-width", function(d) {
            return Math.max(1, d.dy);
        })
        .sort(function(a, b) {
            return b.dy - a.dy;
        })
        .each(setDash)
        .style('stroke', function(d) {
            var sourceColor = color(d.source.name.replace(/ .*/, "")).replace("#", "");
            var targetColor = color(d.target.name.replace(/ .*/, "")).replace("#", "");
            var id = 'c-' + sourceColor + '-to-' + targetColor;
            if (!svg.select(id)[0][0]) {
                //append the gradient def
                //append a gradient
                var gradient = svg.append('defs')
                    .append('linearGradient')
                    .attr('id', id)
                    .attr('x1', '0%')
                    .attr('y1', '0%')
                    .attr('x2', '100%')
                    .attr('y2', '0%')
                    .attr('spreadMethod', 'pad');

                gradient.append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', "#" + sourceColor)
                    .attr('stop-opacity', 1);

                gradient.append('stop')
                    .attr('offset', '100%')
                    .attr('stop-color', "#" + targetColor)
                    .attr('stop-opacity', 1);
            }
            return "url(#" + id + ")";
        });

    var link = svg.append("g").selectAll(".link")
        .data(network.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", path)
        .style("stroke-width", function(d) {
            return Math.max(1, d.dy);
        })
        .sort(function(a, b) {
            return b.dy - a.dy;
        });

    link.append("title")
        .text(function(d) {
            return d.source.name + " : " + d.target.name + "\n" + format(d.value);
        });


    var node = svg.append("g").selectAll(".node")
        .data(network.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .on("mouseover", branchAnimate)
        .on("mouseout", function() {
            //cancel all transitions by making a new one
            gradientLink.transition();
            gradientLink
                .style("opacity", 0)
                .each(function(d) {
                    setDash.call(this, d);
                });
        })
        .call(d3.behavior.drag()
            .origin(function(d) {
                return d;
            })
            .on("dragstart", function() {
                this.parentNode.appendChild(this);
            })
            .on("drag", dragmove))
        .on('dblclick', collapseNode)

    node.append("rect")
        .attr("height", function(d) {
            return d.dy;
        })
        .attr("width", sankey.nodeWidth())
        .style("fill", function(d) {
            return d.color = color(d.name.replace(/ .*/, ""));
        })
        .append("title")
        .text(function(d) {
            return "# inputs = " + (d.targetLinks.length) + "\n# outputs = " 
            + (d.sourceLinks.length) + "\nWeight = " + format(d.value);
        })


    node.append("text") //node
        .attr("x", function(i) {
            return -i.dy / 2
        })
        .attr("y", function(i) {
            return i.dx / 2 + 9
        })
        .attr("transform", "rotate(270)")
        .attr("text-anchor", "middle")
        .attr("font-size", "23px")
        .text(function(i) {
            return i.name;
        })
        .attr("stroke", function(d) {
            return d3.rgb(d["color"]).darker(2)
        }).attr("stroke-width", "1px");


    // the function for moving the nodes
    function dragmove(d) {

        if (d3.event.sourceEvent.button == 0) { // If left mouse button
            d3.select(this).attr("transform",
                "translate(" + (
                    d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
                ) + "," + (
                    d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
                ) + ")");

            link.attr("d", path);
            gradientLink.attr("d", path);
            sankey.relayout();
        }
    };

    function deleteNode(d) {

        svg.selectAll(".link").filter(function(l) {
            return l.target == d;
        }).remove();
        svg.selectAll("g.node").filter(function(l) {
            return l == d;
        }).remove();
        svg.selectAll(".gradientLink").filter(function(l) {
            return l == d;
        }).remove()
    };


});


function saveGraphJSON() {

    txt = '{\n"nodes":[\n';
    txt1 = '';
    d3.selectAll("g.node").each(function(d) {
        txt1 += '{"node":' + d.node + ', "name":"' + d.name + '"},\n'
    })
    txt1 = txt1.substring(0, txt1.length - 2); // strip last ,
    txt += txt1;
    txt += '\n],\n"links": [\n'

    txt1 = '';
    d3.selectAll(".link").each(function(d) {
        txt1 += '{"source":' + d.source.node + ', "target":' +
            d.target.node + ',"value":' + d.value + '},\n'
    })
    txt1 = txt1.substring(0, txt1.length - 2); // strip last ,
    txt += txt1;
    txt += '\n]}'

    console.log(txt);
};

var addNode = function() {


};

function collapseNode(d) {

    if (d3.event.defaultPrevented) return;
    if (d.collapsible) {
        // If it was visible, it will become collapsed so we should decrement child nodes count
        // If it was collapsed, it will become visible so we should increment child nodes count

        var inc = d.collapsed ? -1 : 1;
        recurse(d);

        function recurse(sourceNode) {
            //check if link is from this node, and if so, collapse
            graph.links.forEach(function(l) {
                if (l.source.name === sourceNode.name) {
                    l.target.collapsing += inc;
                    recurse(l.target);
                }
            });
        }
        d.collapsed = !d.collapsed; // toggle state of node
    }
    update();
};