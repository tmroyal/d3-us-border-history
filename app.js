var confederateDates = {
  'South Carolina': {
    start: new Date('December 20, 1860'),
    end: new Date('July 9, 1868')
  },
  'Mississippi': {
    start: new Date('January 9, 1861'),
    end: new Date('February 23, 1870')
  },
  'Florida': {
    start: new Date('January 10, 1861'),
    end: new Date('June 25, 1868')
  },
  'Alabama': {
    start: new Date('January 11, 1861'),
    end: new Date('July 14, 1868')
  },
  'Georgia': {
    start: new Date('January 19, 1861'),
    end: new Date('July 15, 1870')
  },
  'Louisiana': {
    start: new Date('January 26, 1861'),
    end: new Date('July 9, 1868')
  },
  'Texas': {
    start: new Date('February 1, 1861'),
    end: new Date('Mar. 30, 1870')
  },
  'Virginia': {
    start: new Date('April 17, 1861'),
    end: new Date('Jan. 26, 1870')
  },
  'Arkansas': {
    start: new Date('May 6, 1861'),
    end: new Date(' June 22, 1868')
  },
  'North Carolina': {
    start: new Date('May 20, 1861'),
    end: new Date('July 4, 1868')
  },
  'Tennessee': {
    start: new Date('June 8, 1861'),
    end: new Date('July 24, 1866')
  }
};

function isConfederate(date, state){
  var dates = confederateDates[state];
  if (!dates){ return false; }
  return dates.start < date && date < dates.end;
}

var w = 1600, h=800;

var projection = d3.geo
                   .albersUsa()
                   .translate([w/2, h/2])
                   .scale([w]);

var path = d3.geo.path().projection(projection);

var svg = d3.select('body')
            .append('svg')
            .attr({
              width: w,
              height: h,
            });

var tooltip = d3.select('body')
                .append('div')
                .style({
                  'position':'absolute',
                  'z-index': '10',
                  'visibility': 'hidden',
                  'font-family':'"Helvetica"',
                  'background': '#fff',
                  'opacity': 0.9,
                  padding: '20px',
                  border: '1px solid #ddd',
                });

var tooltipTitle = tooltip.append('div').text('title');
tooltip.append('hr');
var tooltipText = tooltip.append('div').text('text');


var requestedDate = new Date(1862,9,1);


var territoryColoring = {
  State: 'hsl(190, 50%, 50%)',
  Territory: 'hsl(190, 20%, 50%)',
  'District of Columbia': 'purple',
  Other: 'hsl(60, 50%, 50%)',
  'Unorganized Territory': '#999'
};

d3.json('USA-border-data.json', function(json){
  var requestedEvents = json.features.filter(function(d){
    var start = new Date(d.properties.START_DATE);
    var end = new Date(d.properties.END_DATE);
    
    return start < requestedDate && requestedDate < end;
  });

  svg.selectAll('path')
     .data(requestedEvents)
     .enter()
     .append('path')
     .attr({
       d: path,
       fill: function(d){ 
         if (isConfederate(requestedDate, d.properties.NAME)){
           return 'hsl(220, 50%, 50%)';
         } else {
           return territoryColoring[d.properties.TERR_TYPE];
         }
       },
       stroke: 'white',
     })
     .on('mouseover', function(d){
       var centroid = path.centroid(d);
       tooltip.style({
         'visibility': 'visible',
         'left': centroid[0]+'px',
         'top': centroid[1]+'px'
       })

       .text(d.properties.NAME+d.properties.CHANGE);
              
       //console.log(d.properties.NAME);
       //console.log(path.centroid(d));
     })
     .append('title')
     .text(function(d){ return d.properties.NAME; });
    
});
