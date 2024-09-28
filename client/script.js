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
    const margin = { top: 30, right: 20, bottom: 60, left: 50 }; // bottom margin 증가
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

    // SVG 요소 생성
    const svg = d3.select("#emotion-chart")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom + 40}`) // 여분 공간 추가
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

    // 데이터 포인트별 감정 원(circle) 그리기
    const emotions = d3.groups(data, d => d.label);
    emotions.forEach(([emotion, values]) => {
        svg.selectAll(`.dot-${emotion}`)
            .data(values)
            .enter()
            .append("circle")
            .attr("class", `dot-${emotion}`)
            .attr("cx", (d, i) => x(data.indexOf(d)))
            .attr("cy", d => y(d.accuracy))
            .attr("r", 5)
            .attr("fill", color(emotion))
            .attr("opacity", 0.8)
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

                // 마우스 오버 시 paragraph 내용 변경
                d3.select(".paragraph p").text(d.paragraph);
            })
            .on("mouseout", (event, d) => {
                d3.select(event.target).transition()
                    .duration(100)
                    .attr("r", 5);

                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    });

    // 범례 추가 (그래프 아래에 표시)
    const legend = svg.append("g")
        .attr("transform", `translate(0,${height + 30})`) // 그래프 아래에 위치
        .selectAll("g")
        .data(color.domain())
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(${i * 100},0)`); // 각 항목 간 간격 설정

    // 범례 사각형
    legend.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", color)
        .attr("opacity", 0.8);

    // 범례 텍스트
    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .style("text-anchor", "start")
        .style("font-size", "12px")
        .text(d => d);

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
