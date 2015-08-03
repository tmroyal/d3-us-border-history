var w = 800, h=600;

var projection = d3.geo.albersUsa().translate([w/2, h/2]).scale([w]);
var path = d3.geo.path().projection(projection);
var svg = d3.select('body')
            .append('svg')
            .attr({
              width: w,
              height: h,
            });

var requestedDate = new Date(1868,1,1);

d3.json('USA-border-data.json', function(json){
  svg.selectAll('path')
     .data(json.features.filter(function(d){
        var start = new Date(d.properties.START_DATE);
        var end = new Date(d.properties.END_DATE);
        
        return start < requestedDate && requestedDate < end;
     }))
     .enter()
     .append('path')
     .attr({
       d: path,
       fill: 'hsl(200,50%,50%)',
       stroke: 'white',
     });
});

