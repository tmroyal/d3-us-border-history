var FeatureFilter = function(){
  var filter = {};
  var features;
  var excludedNames; 

  filter.init = function(data, excluded){
    features = data.features;
    excludedNames = excluded || [];
  };

  filter.getFeaturesAtDate = function(requestedDate){
    return features.filter(function(d){
        var start = new Date(d.properties.START_DATE.replace(/\//g,'-'));
        var end = new Date(d.properties.END_DATE.replace(/\//g,'-'));

        var name = d.properties.NAME;
        var nameIsExcluded = excludedNames.some(function(exName){
          return name === exName;
        });

        return !nameIsExcluded && 
                start <= requestedDate && 
                requestedDate <= end;
    });
  };

  return filter;

}();


//--------------------------

var DatePicker = function(initialIndex){
  var mobileRegex = /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/;
  var isMobile = navigator.userAgent.match(mobileRegex);

  var picker = {};

  var requestedDate;
  var requestedDateIndex = initialIndex || 50;
  var datePoints;

  var rangeSlider = d3.select('#rangeSlider');

  var currentDateDisplay = d3.select('#currentDate');
  var formated = d3.time.format('%B %d %Y');

  var downloadLink;

  var updateCallback;

  function setupDatePoints(data, confederateDates){
    var datePoints = {};

    // filter duplicates
    data.features.forEach(function(data){
      datePoints[data.properties.START_DATE] = true;
    });

    // add confederate dates
    for (var state in confederateDates){
      if (confederateDates.hasOwnProperty(state)){
        datePoints[confederateDates[state].start] = true;
        datePoints[confederateDates[state].end] = true;
      }
    }
    
    // convert strings to date
    datePoints = Object.keys(datePoints).map(function(key){
      return new Date(key);
    });

    
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

    return datePoints;
  }

  function incrementDate(){
    if (requestedDateIndex < datePoints.length - 1){
      updateDate(requestedDateIndex+1, true, true);
      rangeSlider.attr('value', requestedDateIndex);
    }
  }

  function decrementDate(){
    if (requestedDateIndex > 0){
      updateDate(requestedDateIndex-1, true, true);
      rangeSlider.attr('value', requestedDateIndex);
    }
  }

  function updateDate(index, updateMap, updateDataURI){
    var requestedFeatures, downloadData;

    // update display
    requestedDateIndex = index;
    requestedDate = datePoints[requestedDateIndex];

    currentDateDisplay.text(formated(requestedDate));

    if(updateMap){
    
      requestedFeatures = FeatureFilter.getFeaturesAtDate(requestedDate);

      updateCallback( requestedDate, requestedFeatures);
      
    }
    if(updateDataURI){
      downloadData = requestedFeatures.slice(0);
      downloadData = {
        "type": "FeatureCollection",
        "features": downloadData
      };
      
      downloadData = encodeURIComponent(JSON.stringify(downloadData));

      downloadLink.attr('href', 'data:application/csv;charset=utf-8,' + downloadData);
    }
  }

  function setupUI(updateCallback){
    // Make setup more consistent (ie. all here)

    d3.select('#prevButton').on('click', decrementDate); 
    d3.select('#nextButton').on('click', incrementDate);

    downloadLink =  d3.select('#downloadLink');

    currentDateDisplay = d3.select('#currentDate');
    formated = d3.time.format('%B %d %Y');

    rangeSlider.attr("max", datePoints.length - 1)
    .on('input', function(){
      updateDate(parseInt(d3.event.target.value),!isMobile, false);
    })
    .on('change', function(){
      updateDate(parseInt(d3.event.target.value),true, true); 
    });

    updateDate(50, true);    
  }
  
  picker.init = function(data, confederateDates, updateCB){
    updateCallback = updateCB;
    datePoints = setupDatePoints(data, confederateDates);
    setupUI(updateCallback);    
  };

  return picker;

}();

//-------------------------

var Tooltip = function(){
  var tooltip = {};

  var tt_div, tt_title, tt_text, tt_terrtype, tt_cite;

  tooltip.setData = function(properties, date){
    var terrType = TerrTypeUtil.getType(properties, date);

    tt_text.text(properties.CHANGE);
    tt_title.text(properties.NAME_START);
    tt_cite.text(properties.CITATION);

    tt_terrtype.text(terrType);
    tt_terrtype.attr("class", TerrTypeUtil.toCSSName(terrType)+'_color' );
  };

  tooltip.move = function(event){
    var width = window.innerWidth || 
      document.documentElement.clientWidth || 
      document.body.clientWidth;

    var height = window.innerHeight || 
      document.documentElement.clientHeight || 
      document.body.clientHeight;

    var top, left;

    if (event.pageX < width/2){
      left = event.pageX+20+'px';
    } else {
      // this is derived from the current css
      left = event.pageX - 300+'px';
    }

    if (event.pageY < height/2){
      top = event.pageY+'px';
    } else {
      // guestimate
      top = event.pageY-100+'px';
    }

    tt_div.style({
      'left': left,
      'top': top
    });
  };

  tooltip.hide = function(){
    tt_div.transition()
      .style( "opacity", "0" )
      .each('end', function(){
        tt_div.style("visibility", "hidden");
      });
  };

  tooltip.show = function(){
    tt_div.transition().duration(100).style({
      'opacity': 0.9,
      'visibility': 'visible', 
    });
  };

  tt_div = d3.select('#mapTooltip');
  tt_title = d3.select('#tt_title');
  tt_terrtype = d3.select('#tt_terrtype');
  tt_text = d3.select('#tt_text');
  tt_cite = d3.select('#tt_citation');

  tt_div.on('mousemove', function(event){
    tooltip.move(d3.event);
  });

  return tooltip;

}();

//--------------------------

var TerrTypeUtil = function(){
  var util = {};
  var confederateDates;

  util.init = function(cdates){
    confederateDates = cdates;
  };

  util.toCSSName = function(name){
    return name.toLowerCase().split(' ').join('_');
  };

  util.getType = function(properties, date, css){
    var res;
    var cdates = confederateDates[properties.NAME];
    if (cdates && new Date(cdates.start) < date && date < new Date(cdates.end)){ 
      res = 'Confederate State';
    } else {
      res = properties.TERR_TYPE;
    }
    if (css){
      return util.toCSSName(res);
    } else {
      return res;
    }
  };

  return util;

}();


//-------------------------

var MapView = function(){

  var width, height;

  var svg = d3.select('#map');

  var projection = d3.geo.albersUsa();

  var path = d3.geo.path().projection(projection);

  var currentData, currentDate;

  var hiddenRect = svg.append('rect')
     .attr({
       opacity: 0,
     })
     .on('mousemove', function(){
       Tooltip.move(d3.event);
     });

  function setDimensions(){
    width = parseInt(svg.style('width'));
    height = width*0.5;

    svg.style({ height: height});
    projection.translate([width/2, height/2]).scale([width*1.1]);

    hiddenRect.attr({
      width: width, 
      height: height, 
    });

  }
  setDimensions();

  d3.select(window).on('resize', function(){
    setDimensions();
    update(currentDate, currentData);
  });

  function update(requestedDate, requestedFeatures){
    currentData = requestedFeatures;
    currentDate = requestedDate;

    var paths = svg.selectAll('path')
                    .data(requestedFeatures, function(d){
                      // key will be property name
                      return d.properties.NAME;
                    });

    paths.enter()
      .append('path');

    paths.attr('d', path)

      .attr('class', function(d){
        return 'state '+
                TerrTypeUtil.getType(d.properties, requestedDate, true)+'_fill';
      })

      .on('mouseover', function(d){
        d3.select(this).attr('class','state highlight_fill');

        Tooltip.move(d3.event);
        Tooltip.setData(d.properties, requestedDate);
        Tooltip.show();
      })

      .on('mousemove', function(){
         Tooltip.move(d3.event);
      })

      .on("mouseout", function(d){
        d3.select(this).attr('class', function(d){
          return 'state '+
              TerrTypeUtil.getType(d.properties, requestedDate, true)+'_fill';
        });

        Tooltip.hide();
      });

    paths.exit().remove();
  }

  return {
    updateCallback: function(){
      return update;
    },
    getSVGRef: function(){
      return svg;
    }
  };

}();
// --------------------

var Spinner = function(){
  var spinner = {}
  var svg;
  var elem;
  var repeating = false;
  var squareLength = 50;
  var halfPoint = squareLength/2;
  var mid_coords;
  var mid_square = halfPoint+','+halfPoint;

  function spin(){
    elem
      .transition()
      .attr('transform','translate('+mid_coords+') '+'rotate(270,'+mid_square+')')
        .duration(500)
        .each('end', function(){
          d3.select(this).attr('transform', 'translate('+mid_coords+')');
          spin();
        });
  }
  
  spinner.init = function(s){
    svg = s;
    mid_coords = parseInt(svg.style('width'))/2 + ',' + parseInt(svg.style('height'))/4;
    elem = svg.append('rect').
      attr({
        width: 50,
        height: 50,
        transform: 'translate('+mid_coords+')',
      })
      .style({
        'fill':'rgba(0,0,0,0.6)',
        'visibility':'hidden'
      });
  };

  spinner.show = function(){
    elem.style('visibility','visible');
    spin(); 
  };

  spinner.hide = function(){
    elem.style('visibility','hidden');
    repeating = false; 
  };

  return spinner;
}();

// --------------------

var App = function(){
  Spinner.init(MapView.getSVGRef());
  Spinner.show();

  d3.json('Confederate-Dates.json', function(err, confederateDates){
    d3.json('USA-border-data.json', function(mapData){

      TerrTypeUtil.init(confederateDates);

      FeatureFilter.init(mapData, ['Deseret']);

      DatePicker.init(
        mapData, 
        confederateDates, 
        MapView.updateCallback()
      );
      Spinner.hide();

    });
  });

}();

