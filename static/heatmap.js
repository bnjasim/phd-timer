/* document.addEventListener('DOMContentLoaded', function() {
    alert("Ready!");
}, false); */

window.onload = function() {
	
	var timer_id = 0; // for cancelling the setInterval
	// The play pause css button
	var icon = d3.select('.play'); // the node
	icon.on('click', function() {
      //icon.toggleClass('active');
	  
	  if (icon.classed('active')) {
		  // Pausing. Set icon as play
		  icon.attr('class', 'play');
		  
		  // clear any existing time intervals
		  // otherwise interesting effects of closure
		  clearInterval(timer_id);
		  
		  // Show the commit button
		  d3.select('#commit-button')
		  			.attr('disabled', null);
		  
		  // Show the edit current streak option
		  d3.select('#current-edit')
		  			.attr('class', null);
					  
		  
	  } // end of if
	  else {
		  // Need to set as playing. Change icon to pause
		  icon.attr('class', 'play active');
		  
		  // hide the commit button
		  d3.select('#commit-button')
		  			.attr('disabled', 'disabled');
		  
		  // hide the edit current streak option
		  d3.select('#current-edit')
		  			.attr('class', 'disabled');
		  
		  var now = moment();
		  var nowh = now.hour();
		  var nowm = now.minute();
		  var date = now.toJSON().substr(0,10); //2017-01-10 
		 
		  // Ajax post request to set the start time and active status
		  var xhr = new XMLHttpRequest();
		  var params = '/?date='+date+'&active='+true+'&nowh='+nowh+'&nowm='+nowm;
		  //console.log(params);
		  xhr.open('POST', params);
		  xhr.send();
		  
		  xhr.onreadystatechange = function () {
				var DONE = 4; // readyState 4 means the request is done.
				var OK = 200; // status 200 is a successful return.
				if (xhr.readyState === DONE) {
				  if (xhr.status === OK) {
					  var response = JSON.parse(xhr.responseText);
					  var totalh = response.totalh; // don't ever change these
					  var totalm = response.totalm;
					  var starth = response.starth;
					  var startm = response.startm;
					  
					  //console.log(totalh+'h '+totalm+'m'); // 'This is the returned text.'
					  // Set the display
					  
					  d3.select('#started-div')
					  			.text('Started at ' + (starth>12?starth-12:starth) + '.'+(startm<10?'0'+startm:startm.toString())+(starth>12?'PM':'AM' ));
					  
					  d3.select('#current-div')
					  			.select('div')
					  			.text('Current: 0m');
					  
					  d3.select('#total-div')
					  			.text('Total Today: ' + format_time_diff(totalh, totalm) );
					  
					  timer_id = setInterval(function(){
						  now = moment();				  
						  // now = now.add(1, 'minute');
						  d3.select('#current-div')
					  			.text('Current streak: ' + format_time_diff((now.hour()-starth), (now.minute()-startm)));
						  
						  d3.select('#total-div')
					  			.text('Total Today: '+ format_time_diff((totalh+now.hour()-starth), (totalm+now.minute()-startm)));
						  
						  //console.log('now: '+now.minute());
						  //console.log('startm: '+startm);
						  
					  }, 1000*60);	
					  
					  
					  d3.select('#prev-div')
					  			.text('Before this: ' + format_time_diff(totalh, totalm) );
					  
					  
				  }
				  else 
					  d3.select('#started-div')
						  		.style('color', 'red')
					  			.text('Error! Connection Failed. Please Retry');
				  
				}
		  };
	  } // end of else
		
      return false;
     });
	

	// First rendering of the calendar heatmap
	var now = moment().endOf('day').toDate();
      var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
      var chartData = d3.time.days(yearAgo, now).map(function (dateElement) {
        return {
          date: dateElement,
          count: (dateElement.getDay() !== 0 && dateElement.getDay() !== 6) ? Math.floor(Math.random() * 60) : Math.floor(Math.random() * 10)
        };
      });
      var heatmap = calendarHeatmap()
                      .data(chartData)
                      .selector('#calendar-viz')
                      .tooltipEnabled(true)
                      .colorRange(['#eee', '#459b2a'])
                      .onClick(function (data) {
                        console.log('data', data);
                      });
      heatmap();  // render the chart
}

// 1h-45m should be formatted as 15m
function format_time_diff(h, m) {
	if (m < 0) {
		m = 60 + m;
		h = h - 1;
	}
	
	return (h>0 ? h+'h ' : '') + m+'m';
}

// calendar code
function calendarHeatmap() {
  // defaults
  var width = 720;
  var height = 110;
  var legendWidth = 150;
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var selector = 'body';
  var SQUARE_LENGTH = 11;
  var SQUARE_PADDING = 2;
  var MONTH_LABEL_PADDING = 6;
  var now = moment().endOf('day').toDate();
  var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
  var data = [];
  var colorRange = ['#D8E6E7', '#218380'];
  var tooltipEnabled = true;
  var tooltipUnit = 'contribution';
  var legendEnabled = true;
  var onClick = null;
  var weekStart = 0; //0 for Sunday, 1 for Monday

  // setters and getters
  chart.data = function (value) {
    if (!arguments.length) { return data; }
    data = value;
    return chart;
  };

  chart.selector = function (value) {
    if (!arguments.length) { return selector; }
    selector = value;
    return chart;
  };

  chart.colorRange = function (value) {
    if (!arguments.length) { return colorRange; }
    colorRange = value;
    return chart;
  };

  chart.tooltipEnabled = function (value) {
    if (!arguments.length) { return tooltipEnabled; }
    tooltipEnabled = value;
    return chart;
  };

  chart.tooltipUnit = function (value) {
    if (!arguments.length) { return tooltipUnit; }
    tooltipUnit = value;
    return chart;
  };

  chart.legendEnabled = function (value) {
    if (!arguments.length) { return legendEnabled; }
    legendEnabled = value;
    return chart;
  };

  chart.onClick = function (value) {
    if (!arguments.length) { return onClick(); }
    onClick = value;
    return chart;
  };

  function chart() {

    d3.select(chart.selector()).selectAll('svg.calendar-heatmap').remove(); // remove the existing chart, if it exists

    var dateRange = d3.time.days(yearAgo, now); // generates an array of date objects within the specified range
    var monthRange = d3.time.months(moment(yearAgo).startOf('month').toDate(), now); // it ignores the first month if the 1st date is after the start of the month
    var firstDate = moment(dateRange[0]);
    var max = d3.max(chart.data(), function (d) { return d.count; }); // max data value

    // color range
    var color = d3.scale.linear()
      .range(chart.colorRange())
      .domain([0, max]);

    var tooltip;
    var dayRects;

    drawChart();

    function drawChart() {
      var svg = d3.select(chart.selector())
        .append('svg')
        .attr('width', width)
        .attr('class', 'calendar-heatmap')
        .attr('height', height)
        .style('padding', '36px');

      dayRects = svg.selectAll('.day-cell')
        .data(dateRange);  //  array of days for the last yr

      dayRects.enter().append('rect')
        .attr('class', 'day-cell')
        .attr('width', SQUARE_LENGTH)
        .attr('height', SQUARE_LENGTH)
        .attr('fill', function(d) { return color(countForDate(d)); })
        .attr('x', function (d, i) {
          var cellDate = moment(d);
          var result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
          return result * (SQUARE_LENGTH + SQUARE_PADDING);
        })
        .attr('y', function (d, i) {
          return MONTH_LABEL_PADDING + formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING);
        });

      if (typeof onClick === 'function') {
        dayRects.on('click', function (d) {
          var count = countForDate(d);
          onClick({ date: d, count: count});
        });
      }

      if (chart.tooltipEnabled()) {
        dayRects.on('mouseover', function (d, i) {
          tooltip = d3.select(chart.selector())
            .append('div')
            .attr('class', 'day-cell-tooltip')
            .html(tooltipHTMLForDate(d))
            .style('left', function () { return Math.floor(i / 7) * SQUARE_LENGTH + 'px'; })
            .style('top', function () {
              return formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING) + MONTH_LABEL_PADDING * 3 + 'px';
            });
        })
        .on('mouseout', function (d, i) {
          tooltip.remove();
        });
      }

      if (chart.legendEnabled()) {
        var colorRange = [color(0)];
        for (var i = 3; i > 0; i--) {
          colorRange.push(color(max / i));
        }

        var legendGroup = svg.append('g');
        legendGroup.selectAll('.calendar-heatmap-legend')
            .data(colorRange)
            .enter()
          .append('rect')
            .attr('class', 'calendar-heatmap-legend')
            .attr('width', SQUARE_LENGTH)
            .attr('height', SQUARE_LENGTH)
            .attr('x', function (d, i) { return (width - legendWidth) + (i + 1) * 13; })
            .attr('y', height + SQUARE_PADDING)
            .attr('fill', function (d) { return d; });

        legendGroup.append('text')
          .attr('class', 'calendar-heatmap-legend-text')
          .attr('x', width - legendWidth - 13)
          .attr('y', height + SQUARE_LENGTH)
          .text('Less');

        legendGroup.append('text')
          .attr('class', 'calendar-heatmap-legend-text')
          .attr('x', (width - legendWidth + SQUARE_PADDING) + (colorRange.length + 1) * 13)
          .attr('y', height + SQUARE_LENGTH)
          .text('More');
      }

      dayRects.exit().remove();
      var monthLabels = svg.selectAll('.month')
          .data(monthRange)
          .enter().append('text')
          .attr('class', 'month-name')
          .style()
          .text(function (d) {
            return months[d.getMonth()];
          })
          .attr('x', function (d, i) {
            var matchIndex = 0;
            dateRange.find(function (element, index) {
              matchIndex = index;
              return moment(d).isSame(element, 'month') && moment(d).isSame(element, 'year');
            });

            return Math.floor(matchIndex / 7) * (SQUARE_LENGTH + SQUARE_PADDING);
          })
          .attr('y', 0);  // fix these to the top

      days.forEach(function (day, index) {
        index = formatWeekday(index);
        if (index % 2) {
          svg.append('text')
            .attr('class', 'day-initial')
            .attr('transform', 'translate(-8,' + (SQUARE_LENGTH + SQUARE_PADDING) * (index + 1) + ')')
            .style('text-anchor', 'middle')
            .attr('dy', '2')
            .text(day);
        }
      });
    }

    function tooltipHTMLForDate(d) {
      var dateStr = moment(d).format('ddd, MMM Do YYYY');
      var count = countForDate(d);
      return '<span><strong>' + (count ? count : 'No') + ' ' + tooltipUnit + (count === 1 ? '' : 's') + '</strong> on ' + dateStr + '</span>';
    }

    function countForDate(d) {
      var count = 0;
      var match = chart.data().find(function (element, index) {
        return moment(element.date).isSame(d, 'day');
      });
      if (match) {
        count = match.count;
      }
      return count;
    }

    function formatWeekday(weekDay) {
      if (weekStart === 1) {
        if (weekDay === 0) {
          return 6;
        } else {
          return weekDay - 1;
        }
      }
      return weekDay;
    }

    var daysOfChart = chart.data().map(function (day) {
      return day.date.toDateString();
    });

    dayRects.filter(function (d) {
      return daysOfChart.indexOf(d.toDateString()) > -1;
    }).attr('fill', function (d, i) {
      return color(chart.data()[i].count);
    });
  }

  return chart;
}


// polyfill for Array.find() method
/* jshint ignore:start */
if (!Array.prototype.find) {
  Array.prototype.find = function (predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}