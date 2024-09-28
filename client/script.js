// JSON 파일에서 데이터를 불러와서 차트를 생성
fetch('data/emotion_data.json')
    .then(response => response.json())
    .then(data => {
        createChart(data);
    })
    .catch(error => console.error('Error loading the data:', error));

// 차트 생성 함수
function createChart(data) {
    // SVG 설정
    const margin = { top: 30, right: 20, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // x, y 스케일 설정
    const x = d3.scaleLinear()
        .domain([0, data.length - 1])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 1])
        .range([height, 0]);

    // 감정별 색상 설정
    const color = d3.scaleOrdinal()
        .domain(["joy", "sadeness", "love", "anger", "fear", "surprise"])
        .range(d3.schemeSet2);

    // line 함수 정의
    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d.accuracy))
        .curve(d3.curveMonotoneX); // 부드러운 곡선

    // SVG 요소 생성
    const svg = d3.select("#emotion-chart")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // x축 생성 (x축 숨김 처리)
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(data.length).tickFormat(() => ''))
        .selectAll("text")
        .remove();

    // y축 생성
    svg.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d * 100}%`));

    // 데이터 포인트별 감정 라인 그리기
    const emotions = d3.groups(data, d => d.label);
    emotions.forEach(([emotion, values]) => {
        svg.append("path")
            .datum(values)
            .attr("fill", "none")
            .attr("stroke", color(emotion))
            .attr("stroke-width", 2)
            .attr("d", line);

        // 데이터 포인트에 원(circle) 추가
        svg.selectAll(`.dot-${emotion}`)
            .data(values)
            .enter()
            .append("circle")
            .attr("class", `dot-${emotion}`)
            .attr("cx", (d, i) => x(data.indexOf(d)))
            .attr("cy", d => y(d.accuracy))
            .attr("r", 5)
            .attr("fill", color(emotion))
            .on("mouseover", (event, d) => {
                d3.select(event.target).transition()
                    .duration(100)
                    .attr("r", 8);

                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                tooltip.html(`Emotion: ${d.label}<br/>Accuracy: ${d.accuracy}<br/>${d.paragraph}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", (event, d) => {
                d3.select(event.target).transition()
                    .duration(100)
                    .attr("r", 5);

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", (event, d) => {
                d3.select(".paragraph p").text(d.paragraph); // 클릭 시 paragraph 변경
            });
    });

    // Tooltip 생성
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "#f4f4f4")
        .style("border", "1px solid #ccc")
        .style("padding", "10px")
        .style("border-radius", "5px");
}
