// Fetch data
const mobyDickJson = await d3.json("data/moby_dick.json")
const chunk = 1; // 1 ~ 1000
const chunkedData = _.chunk(mobyDickJson, chunk);

await createChart(chunkedData);

async function createChart(chunkedData) {
  const chunkedSize = chunkedData.length;
  const emotionToDomainIndex = {
    "anger": 0,
    "fear": 1,
    "sadness": 2,
    "surprise": 3,
    "joy": 4,
    "love": 5
  };
  
  const sizeOfDomain = Object.keys(emotionToDomainIndex).length;

  // Draw area
  const margin = {top: 40, right: 40, bottom: 120, left: 40};

  // Make the chart responsive and bigger
  const containerWidth = document.getElementById('emotion-chart').clientWidth;
  const containerHeight = document.getElementById('emotion-chart').clientHeight;

  const width = containerWidth;
  const height = containerHeight || 600; // Increased default height

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const x = d3.scaleLinear([0, chunkedSize - 1], [0, innerWidth]);
  const y = d3.scaleLinear([0, 1], [innerHeight, 0]);
  
  // color
  const z = d3.scaleSequential(d3.interpolateCool).domain([0, sizeOfDomain - 1]);
  
  const area = d3.area()
    .x((d, i) => x(i))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

  const stack = d3.stack()
    .keys(d3.range(sizeOfDomain))
    .order(d3.stackOrderNone);

  const svg = d3.select("#emotion-chart")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("width", "100%")
    .style("height", "auto")
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function getLayers(emotionJson) {
    const domainSize = sizeOfDomain;
    const maxLayers = Array.from({length: chunkedSize});
    maxLayers.fill(0);
    const layers = stack(Array.from({length: chunkedSize}, (_, i) => toPaddedArray(chunkedData[i], i)));
    function toPaddedArray(emotions, i) {
      // accumulate accuracy by the index of emotion
      const layer = Array.from({length: domainSize});
      layer.fill(0);
      // find the label that has max count number of each emotion label
      const counts = _.countBy(emotions, 'label');
      const maxLabel = _.maxBy(_.keys(counts), label => counts[label]);

      // find the emotion with max accuracy for the max label
      const maxAccuracy = _.maxBy(emotions.filter(emotion => emotion.label === maxLabel), 'accuracy');
      
      maxLayers[i] = maxAccuracy;

      emotions.forEach((emotion) => {
        layer[emotionToDomainIndex[emotion.label]] += emotion.accuracy;
      });

      return layer;
    }
    
    y.domain([
      d3.min(layers, l => d3.min(l, d => d[0])),
      d3.max(layers, l => d3.max(l, d => d[1]))
    ]);
    
    return {
      layers,
      maxLayers
    }
  }

  const { layers, maxLayers } = getLayers(chunkedData)

  const path = g
    .selectAll("path")
    .data(layers)
    .join("path")
    .attr("d", area)
    .attr("fill", (_, i) => z(i));

  // Add legends below the chart
  const legendGroup = svg
    .append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${margin.left}, ${height - margin.bottom + 40})`);

  function updateLegend() {
    const legendItemWidth = innerWidth / sizeOfDomain;
    const legendItemHeight = 25; // Increased legend item height
    const minWidthForHorizontal = 600; // Increased minimum width for horizontal layout

    legendGroup.selectAll("*").remove(); // Clear existing legend

    Object.entries(emotionToDomainIndex).forEach(([emotion, index], i) => {
      const legendItem = legendGroup
        .append("g")
        .attr("class", "legend-item");
      
      if (innerWidth < minWidthForHorizontal) {
        // Vertical layout
        legendItem.attr("transform", `translate(0, ${i * legendItemHeight})`);
      } else {
        // Horizontal layout
        legendItem.attr("transform", `translate(${i * legendItemWidth}, 0)`);
      }
      
      legendItem.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", z(index));
      
      legendItem.append("text")
        .attr("x", 25)
        .attr("y", 15)
        .text(emotion)
        .style("font-size", "14px");
    });

    // Adjust SVG height if legend is vertical
    if (innerWidth < minWidthForHorizontal) {
      const newHeight = height + (sizeOfDomain * legendItemHeight);
      svg.attr("viewBox", [0, 0, width, newHeight]);
    }
  }

  updateLegend(); // Initial legend creation

  // Add hover effect and tooltip
  const hoverLine = g.append("line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .style("opacity", 0);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "15px")
    .style("font-size", "14px");

  function updateHoverEffects(event) {
    const [mouseX, mouseY] = d3.pointer(event, svg.node());
    const adjustedX = mouseX - margin.left;
    const adjustedY = mouseY - margin.top;
    const dataIndex = Math.round(x.invert(adjustedX));
    
    hoverLine.attr("x1", adjustedX).attr("x2", adjustedX)
      .style("opacity", 1);

    const currentData = layers.map(layer => layer[dataIndex]);
    if (currentData) {
      const yValue = y.invert(adjustedY);
      let selectedEmotion = "";
      let accumulatedValue = 0;
      
      for (let i = 0; i < currentData.length; i++) {
        const layerStart = currentData[i][0];
        const layerEnd = currentData[i][1];
        if (yValue >= layerStart && yValue <= layerEnd) {
          selectedEmotion = Object.keys(emotionToDomainIndex).find(key => emotionToDomainIndex[key] === i);
          accumulatedValue = layerEnd - layerStart;
          break;
        }
      }

      tooltip.style("opacity", 1)
        .html(`<strong>Emotion:</strong> ${selectedEmotion}<br><strong>Accumulated Value:</strong> ${accumulatedValue.toFixed(4)}`)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 15) + "px");

      d3.select(".paragraph p").text(maxLayers[dataIndex].paragraph);
    }
  }

  function hideHoverEffects() {
    hoverLine.style("opacity", 0);
    tooltip.style("opacity", 0);
  }

  // Add event listeners for both mouse and touch events
  svg.on("mousemove touchmove", function(event) {
    event.preventDefault();
    updateHoverEffects(event.type === 'touchmove' ? event.touches[0] : event);
  });

  svg.on("mouseleave touchend", hideHoverEffects);
}

async function updateChart(chunk) {
  // Recalculate chunked data with new chunk
  const newChunkedData = _.chunk(mobyDickJson, chunk);

  // Clear existing chart
  d3.select("#emotion-chart").selectAll("*").remove();

  // Recreate chart with new data
  await createChart(newChunkedData);

  // Update chunk display if you have one
  d3.select("#chunk-display").text(`Chunk: ${chunk}`);
}

document.getElementById('chunk-slider').addEventListener('change', function(event) {
  const newChunk = parseInt(event.target.value);
  updateChart(newChunk);
});
