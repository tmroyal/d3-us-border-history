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
        var start = new Date(d.properties.START_DATE);
        var end = new Date(d.properties.END_DATE);

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
  var picker = {};

  var requestedDate;
  var requestedDateIndex = initialIndex || 50;
  var datePoints;
  var slider = document.getElementById('range');
  var currentDateDisplay = d3.select('#currentDate');
  var formated = d3.time.format('%B %d %Y');

  function setupDatePoints(data, confederateDates){
    var datePoints = {};

    // filter duplicates
    data.features.forEach(function(data){
      datePoints[data.properties.START_DATE] = true;
    });

    // add confederate dates
    for (state in confederateDates){
      if (confederateDates.hasOwnProperty(state)){
        datePoints[confederateDates[state].start];
        datePoints[confederateDates[state].end];
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
    if (requestDateIndex > 0){
      requestedDateIndex--;
      slider.noUiSlider.set(requestedDateIndex);
    }
  }

  function decrementDate(){
    if (requestedDateIndex < datePoints.length - 1){
      requestedDateIndex++;
      slider.noUiSlider.set(requestedDateIndex);
    }
  }

  function setupUI(updateCallback){
    // Make setup more consistent (ie. all here)

    d3.select('#prevButton').on('click', decrementDate); 
    d3.select('#nextButton').on('click', incrementDate);

    currentDateDisplay = d3.select('#currentDate');
    formated = d3.time.format('%B %d %Y');

    slider = document.getElementById('range');

    noUiSlider.create(slider, {
      start: [requestedDateIndex],
      step: 1,
      range: {
        'min': 0,
        'max': datePoints.length-1
      }
    });

    slider.noUiSlider.on('update', function(val){ 
      requestedDateIndex = Math.floor(val);
      requestedDate = datePoints[requestedDateIndex];

      currentDateDisplay.text(formated(requestedDate));
      updateCallback(
        requestedDate, 
        FeatureFilter.getFeaturesAtDate(requestedDate)
      );
    });
  };
  
  picker.init = function(data, confederateDates, updateCallback){
    datePoints = setupDatePoints(data, confederateDates)
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
    console.log(terrType);

    tt_text.text(properties.CHANGE);
    tt_title.text(properties.NAME_START);
    tt_cite.text(properties.CITATION);

    tt_terrtype.text(terrType);
    tt_terrtype.attr("class", TerrTypeUtil.toCSSName(terrType)+'_color' );
  };

  tooltip.move = function(event){
    if (!tt_div.style('visibility') === 'hidden'){
      tt_div.style({
        'left': event.pageX+20+'px',
        'top': event.pageY-50+'px'
      });
    }
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

  return tooltip;
}();

//--------------------------

var TerrTypeUtil = function(){
  var util = {};
  var confederateDates = undefined;

  util.init = function(cdates){
    confederateDates = cdates;
  };

  util.toCSSName = function(name){
    return name.toLowerCase().split(' ').join('_');
  };

  util.getType = function(properties, date, css){
    var res;
    var cdates = confederateDates[properties.NAME];
    if (cdates && cdates.start < date && date < cdates.end){ 
      res = 'Confederate State';
    } else {
      res = properties.TERR_TYPE;
    }
    if (css){
      return util.toCSSName(res);
    } else {
      return res;
    }
  }

  return util;
}();


//-------------------------

var MapView = function(){

  var w = 1000, h = 600;

  var projection = d3.geo.albersUsa()
                          .translate([w/2, h/2])
                          .scale([w]);

  var path = d3.geo.path().projection(projection);

  var svg = d3.select('body').append('svg')

  svg.attr({ width: w, height: h, });

  svg.on('movemove', function(){
     Tooltip.move(event);
  });

  function update(requestedDate, requestedEvents){
    var paths = svg.selectAll('path')
                    .data(requestedEvents, function(d){
                      // key will be property name
                      return d.properties.NAME;
                    });

    paths.enter()
      .append('path');

    paths.attr('d', path)

      .attr('class', function(d){
        console.log(d);
        return 'state '+
                TerrTypeUtil.getType(d.properties, requestedDate, true)+'_fill';
      })

      .on('mouseover', function(d){
        d3.select(this).attr('class','state highlight_fill');

        Tooltip.move(event);
        Tooltip.setData(d.properties, requestedDate);
        Tooltip.show();
      })

      .on('click', Tooltip.hide)

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
    }
  }

}();

// --------------------

var App = function(){

  d3.json('Confederate-Dates.json', function(err, confederateDates){
    d3.json('USA-border-data.json', function(mapData){

      TerrTypeUtil.init(confederateDates);

      FeatureFilter.init(mapData, ['Deseret']);

      DatePicker.init(
        mapData, 
        confederateDates, 
        MapView.updateCallback()
      );

    });
  })

}();

