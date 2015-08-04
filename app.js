var requestedDate = new Date(1862,9,1);
var data;
var datePoints;

var slider = document.getElementById('range');

var currentDateDisplay = d3.select('body')
                           .append('div');

var formated = d3.time.format('%B %d %Y');

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

function setupDatePoints(data){
  datePoints = {};

  // filter duplicates
  data.features.forEach(function(data){
    datePoints[data.properties.START_DATE] = true;
  });


  datePoints = Object.keys(datePoints).map(function(key){
    return new Date(key);
  });

  for (state in confederateDates){
    if (confederateDates.hasOwnProperty(state)){
      datePoints.push(confederateDates[state].start);
      datePoints.push(confederateDates[state].end);
    }
  }
  
  // javascript has issues with sorting 
  // old dates
  datePoints.sort(function(a,b){
    var yc, mc;
    yc = a.getFullYear()-b.getFullYear();
    if (yc === 0){
      mc = a.getMonth()-b.getMonth();
      if (mc === 0){
        return a.getDate()-b.getDate();
      } else {
        return mc;
      }
    } else {
      return yc;
    }
  });
}

var w = 1000, h=600;

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
                  'font-family':'"Helvetica"',
                  'background': '#fff',
                  'opacity': 0,
                  'visibility': 'hidden',
                  width: '330px',
                  padding: '40px',
                  border: '1px solid #ddd',
                  'border-radius': '5px'
                });


var tooltipTitle = tooltip.append('div').text('title');
tooltip.append('hr');
var tooltipTerrType = tooltip.append('div')
                             .style({
                               'color': '#aaa',
                               'font-size': 14+'px',
                               'font-style': 'italic'
                             });

var tooltipText = tooltip.append('div').text('text');

var tooltipCitation = tooltip.append('div')
    .style({
      'font-size': 12+'px',
      'color': '#aaa'
    });

var territoryColoring = {
  State: 'hsl(190, 50%, 50%)',
  Territory: 'hsl(190, 20%, 50%)',
  'District of Columbia': 'purple',
  Other: 'hsl(60, 50%, 50%)',
  'Unorganized Territory': '#999'
};


d3.json('USA-border-data.json', function(json){
  data = json;
  setupDatePoints(data);

  noUiSlider.create(slider, {
    start: [50],
    step: 1,
    range: {
      'min': 0,
      'max': datePoints.length-1
    },
  })

  slider.noUiSlider.on('update', function(val){ 
    var requestedDate = datePoints[Math.floor(val)];
    var requestedEvents = data.features.filter(function(d){
      var start = new Date(d.properties.START_DATE);
      var end = new Date(d.properties.END_DATE);
      var name = d.properties.NAME;

      return name !== 'Deseret' && start <= requestedDate && requestedDate <= end;
    });
    currentDateDisplay.text(formated(requestedDate));
    
    update(requestedDate, requestedEvents);
  });
    
});

function update(requestedDate, requestedEvents){
  var paths = svg.selectAll('path')
                  .data(requestedEvents, function(d){
                    return d.properties.NAME;
                  });

  paths.enter()
     .append('path');

  paths.attr({
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
       d3.select(this).attr('fill','#a89');
       var centroid = path.centroid(d);
       var terrType = isConfederate(requestedDate, d.properties.NAME) ? 'Confederate State' : d.properties.TERR_TYPE;
       tooltip.transition().duration(100).style({
         'opacity': 0.9,
         'visibility': 'visible', 
         'left': event.pageX+20+'px',
         'top': event.pageY-50+'px'
       })
       tooltipText.text(d.properties.CHANGE);
       tooltipTitle.text(d.properties.NAME_START);

       tooltipTerrType.text(terrType);
       
       tooltipTerrType.style({
         color: terrType === 'Confederate State' ? 
                          'hsl(200, 50%, 50%)' :
                          territoryColoring[terrType]
       });

       tooltipCitation.text(d.properties.CITATION);
     })
     .on('mousemove', function(d){
       tooltip.style({
         'left': event.pageX+20+'px',
         'top': event.pageY-50+'px'
       })
     })
     .on('click', function(){
       tooltip.transition().style({
         'opacity':'0',
       }).transition().style('visibility', 'hidden');
     })
    .on("mouseout", function(d){
      d3.select(this).attr({
       fill: function(d){ 
         if (isConfederate(requestedDate, d.properties.NAME)){
           return 'hsl(220, 50%, 50%)';
         } else {
           return territoryColoring[d.properties.TERR_TYPE];
         }
       }
    });
    tooltip.transition().style({
      "opacity": "0",
    }).transition().style({
      "visibility": "hidden"
    });
  })


  paths.exit().remove();
}

