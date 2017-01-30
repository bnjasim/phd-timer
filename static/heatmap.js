/* document.addEventListener('DOMContentLoaded', function() {
    alert("Ready!");
}, false); */

window.onload = function() {
	
	// TODO
	// 1. On page reload, and the last time timer was running, and it was started some day back, what to do?
	//    - Discard if continuous work is > 23h. 
	// 2. Edit button action: textarea for changing h & m. Also Date picker. Error if totalh > 23h or < 0h in a day 
	// 3. Add Notes
	// 4. When paused/stopped, check if date crosses two days, then if submit make two commits. Otherwise user can edit 
	//    If manually editing, give instruction that you have to make two separate submits. default date to yesterday if manually edit.
	// 5. When paused datastore write to Entry also
	// 6. 
	// 7. Server Error handling: If clicked on play, the icon changes. But if server error, reset the icon as well as the variables
	// 8. The HeatMap
	
	// momentjs toJSON gives Greewich date
	moment.fn.toJSON = function() { return this.format(); }
	// define toggleClass fn
	d3.selection.prototype.toggleClass = function(className) {  
      this.classed(className, !this.classed(className));
      return this;
	}
	// Activate the alerts d3-bootstrap
	d3.selectAll("div.alert").call(bootstrap.alert());

	
	var totalh = 0; 
    var totalm = 0;
    var starth = 0; 
    var startm = 0;
	
	var timer_id = 0; // for cancelling the setInterval
	var timer_set_interval = 10; // should be set to 60 for 1 minute. Set to 1 for testing purposes
	var now = moment(); // now will be upto date if timer is running, otherwise not
	var date_today = now.toJSON().substr(0,10); //2017-01-13 
	var date_yesterday = now.clone().subtract(1, 'day').toJSON().substr(0,10); // can't say today.subtract(1,'day') as today is mutable
	var start_date = date_today; // date of starth and startm
	
	var max_allowed_working_hours = 16; // You can't work more than 16 hours a day
	var careless = false; // true means the timer is running for so long, but user is not working 
	
	var commit_button = d3.select('#commit-button');
	var previous_div = d3.select('#prev-div')
	var started_div = d3.select('#started-div');
	var curent_div = d3.select('#current-div');			  
	var total_div = d3.select('#total-div'); // BE_CAREFUL - HTML may change
	var date_div = d3.select('#date-div'); // .select('div'); // BE_CAREFUL - HTML may change
	var ic_play = d3.select('.play');	
	
	
	// This is timer running only for Testing
	// Simulate a clock outsid
	d3.select('#current-time').text('Current Time: '+ now.hour() +'h'+now.minute()+'m' );
	setInterval(function(){
		  //now = moment();				  
		  now = now.add(1, 'hour');
	      // Code for Testing purposes		
		  d3.select('#current-time').text('Current Time: '+ now.hour() +'h'+now.minute()+'m' );

	}, 1000*timer_set_interval);
	
	
	
	
	// shouldn't be repeated in playing state as well as reload of playing state
	// called from display_divs_and_set_timer() function
	function timer_ticked() {
		//now = moment();
		date_today = now.toJSON().substr(0,10); //2017-01-13 
		date_yesterday = now.clone().subtract(1, 'day').toJSON().substr(0,10); // can't say today.subtract(1,'day') as today is mutable
		
		// Very Important! If time crosses 11.59PM to 00AM, do a db write of last day's work
		if (start_date !== date_today) {
			// Find out the number of hours of work in the last day
			var total_yh = totalh + 24 - starth;
			var total_ym = totalm - startm;
			
			if (total_ym < 0) {
				total_yh -= 1;
				total_ym += 60;
			}
			
			// If the timer has been running for more than 16h? Simply ignore it!
			if (start_date !== date_yesterday || (total_yh+total_ym/60 > max_allowed_working_hours)) {
				careless = true;
			}
			
			// If eligible, yesterday's work has to be written to the datastore
			if(!careless) {
				
				var xhr = new XMLHttpRequest();
				// We are stopping. Set start to 0 - not very important, but for symmetry with the other xhr
				var params = '/ajax?date='+date_yesterday+'&totalh='+total_yh+'&totalm='+total_ym;
				//console.log(params);
				xhr.open('POST', params);
				xhr.send();
				xhr.onreadystatechange = function () {
					var DONE = 4; // readyState 4 means the request is done.
					var OK = 200; // status 200 is a successful return.
					if (xhr.readyState === DONE) {
						if (xhr.status === OK) {
							 


						}
						else 
							started_div.style('color', 'red').text("Server Error - Yesterday's work was not committed!");

					}
				};
				
			}
			
			// After committing yesterday's work, reset all variables to today
			// Even if the user was careless yesterday, after ignoring that work, we have to reset the variables
			start_date = date_today;
			starth = 0; // We are restarting at 12.00AM which is 00
			startm = 0;
			totalh = 0;
			totalm = 0;
				
		} // End of yesterday
		
		// If start_date is today and it has been running for so long (>16h) , we will not do anything about it here!
		// But when paused, we will discard it
		
		
		started_div.text('Started at ' + (starth>12?starth-12:starth) + ':'+(startm<10?'0'+startm:startm.toString())+(starth>12?'PM':'AM' ));
		
		curent_div.text('Current Session: ' + format_time_diff((now.hour()-starth), (now.minute()-startm)));

	    total_div.text('Total Today: ' + format_time_diff( totalh+now.hour()-starth, totalm+now.minute()-startm ));
		
		previous_div.text('Before the Current Session: ' + format_time_diff(totalh, totalm) );
		
		date_div.text('Date: ' + format_date(date_today));
		
	}
	
	// Common things like setting current streak, total today etc.	
	function display_divs_and_set_timer() {
		// It will be wise to stop any existing timers if running coz like double click on play button etc.
		clearInterval(timer_id);
		// Call the inner function once before timer ticks 1 minute
		timer_ticked();
		
	    timer_id = setInterval(function(){
		  
			timer_ticked();

	    }, 1000*timer_set_interval);	    
				  
	};
	
	
	// Send an AJAX GET request for the state of the timer
	var xhr = new XMLHttpRequest();
	var params = '/ajax';
	xhr.open('GET', params);
	xhr.send();
	
	// Ajax Get request for initial timer data load
	xhr.onreadystatechange = function () {
		var DONE = 4; // readyState 4 means the request is done.
		var OK = 200; // status 200 is a successful return.
		if (xhr.readyState === DONE) {
		  if (xhr.status === OK) {
			  //console.log(xhr.responseText)
			  var response = JSON.parse(xhr.responseText);
			  
			  var start_date = response.date;
			  // date_today = now.toJSON.substr(0,10); - not needed as they are already set. Look above
			  // But if the start date is yesterday,
			  // If it has been playing, cut it off till 24.00, commit it and start playing from 00AM
			  // If it was already paused, make sure totalh and totalm are both 0
			  starth = response.starth;
			  startm = response.startm;
			  totalh = response.totalh;
			  totalm = response.totalm;
			  
			  // if previous state was not playing or if it was playing but started two days back then we will set as paused
			  // Even if started yesterday, if yesterday's work > 16h, we ignore it and set as paused.
			  // bool variable
			  var started_yesterday = (start_date === date_yesterday) && ((totalh + totalm/60 + 24-starth-(startm/60)) <= max_allowed_working_hours);
			  // Even if started today, if has been playing for more than 16 hours, ignore it
			  var started_today = (start_date === date_today) && ((totalh + totalm/60 + now.hour()-starth + ((now.minute()-startm)/60)) <= max_allowed_working_hours);
			  
			  var continue_play = response.active && (started_today || started_yesterday);
			  
			  // Playing
			  if (continue_play) {		      
				  // Change icon to pause
		  	  	  ic_play.attr('class', 'play active');					  
			      // The crossing of dates will be taken cared in timer_ticked function
			      display_divs_and_set_timer();			 
				 
			  }
			  
			  // Paused
			  else {
				  // no need to change the play icon
				  // But in case, the user clicks on the play button before initial ajax response, reest it.
				  ic_play.attr('class', 'play');
				  // It will be wise to stop any existing timers if running, like the play was clicked before initial ajax load
				  clearInterval(timer_id);
				  // Only consider total work of today. Not someday's before
				  // If first time access and work doesn't exist in server, start_date field will be null
				  // Also if total refers to yesterday's, set it to 0
				  if (start_date !== date_today) {
					  
					  totalh = 0;
					  totalm = 0;
				  }
				  
				  started_div.text('Click to Start');
				  
				  curent_div.text('Current Session: --:--')
				  
				  previous_div.text('Before the Current Session: ' + format_time_diff(totalh, totalm) );
				  
				  total_div.text('Total Today: ' + format_time_diff(totalh, totalm) );
				  
				  date_div.text('Date: ' + format_date(date_today));
			  }
			
			  
		  }
		  else 
			  d3.select('#started-div')
						.style('color', 'red')
						.text('Server Error! Please Refresh Page');

		}
	  };	// End of Ajax GET request  
	
	
	ic_play.on('click', function() {
      //ic_play.toggleClass('active');
	  //now = moment();
	  date_today = now.toJSON().substr(0,10); //2017-01-13 
	  date_yesterday = now.clone().subtract(1, 'day').toJSON().substr(0,10); // now is mutable
	
	  // clicked to pause. Set icon as play
	  if (ic_play.classed('active')) {
		  
		  //ic_play.attr('class', 'play');
		  ic_play.classed('active', false);
		  
		  // clear any existing time intervals
		  clearInterval(timer_id);
		  
		  // Paused/Stopped. So compute the totalh and totalm now!
		  totalh = totalh + now.hour() - starth;
		  totalm = totalm + now.minute() - startm;
		  
		  // Avoid negative in totalm
		  if (totalm < 0) {
			  totalm += 60;
			  totalh -= 1;
		  }
		  // Also avoid minute >= 60
		  if (totalm >= 60) {
			  totalm -= 60;
			  totalh += 1;
		  }
		  
		  // Sumit automatically when paused itself
		  // But do only so if the person is not careless. i.e. timer is not running continuously for so long
		  // It could be that today is continuation of yesterday's careless (>16h) session, so don't write today's as well
		  if (totalh + totalm/60 > max_allowed_working_hours)
			  careless = true; // careless could be already true from timer_ticked()
		  	  
		  if (careless) {
			  totalh = 0;
			  totalm = 0;
		  }
		  
		  // Only commit if valid work
		  else {
		  // Ajax Post request for PAUSE
			  var xhr = new XMLHttpRequest();
			  // We are stopping. Set start to 0 - not very important, but for symmetry with the other xhr
		  	  var params = '/?date='+date_today+'&active='+0+'&totalh='+totalh+'&totalm='+totalm+'&starth='+0+'&startm='+0;
		  	  //console.log(params);
			  xhr.open('POST', params);
			  xhr.send();

			  xhr.onreadystatechange = function () {
					var DONE = 4; // readyState 4 means the request is done.
					var OK = 200; // status 200 is a successful return.
					if (xhr.readyState === DONE) {
					  if (xhr.status === OK) {
						  // var response = JSON.parse(xhr.responseText); // no response from server
						  // Set the commit button as Done! (and fade it - optional)
						  // commit_button.text('Done!');
						  // commit_button.attr('disabled', 'disabled');
						  
						  
						  
					  }
					  else 
						  started_div.style('color', 'red').text('Server Error!');

					}
			  };	
		  
		  }
		  
		  // Show the commit button
		  commit_button.text('Commit');
		  commit_button.attr('disabled', null);
		  
		  // Show the edit total streak option
		  d3.select('#total-edit-button').classed('disabled', false);
		  			//.attr('class', null);
		  
		  // When commit button is clicked
		  commit_button.on('click', function() {
			  // Ajax Post request
			  var xhr = new XMLHttpRequest();
			  // We are stopping. Set start to 0 - not very important, but for symmetry with the other xhr
		  	  var params = '/?date='+date_today+'&active='+0+'&totalh='+totalh+'&totalm='+totalm+'&starth='+0+'&startm='+0;
		  	  //console.log(params);
			  xhr.open('POST', params);
			  xhr.send();

			  xhr.onreadystatechange = function () {
					var DONE = 4; // readyState 4 means the request is done.
					var OK = 200; // status 200 is a successful return.
					if (xhr.readyState === DONE) {
					  if (xhr.status === OK) {
						  // var response = JSON.parse(xhr.responseText); // no response from server
						  // Set the commit button as Done! (and fade it - optional)
						  commit_button.text('Done!');
						  commit_button.attr('disabled', 'disabled');
						  
						  started_div.text('Click to Start');
						  
					  }
					  else 
						  started_div.style('color', 'red').text('Server Error! Please Retry');

					}
			  };	  

		  }); // end of commit button submit				  
		  
	  } 
		
	  // clicked to play. Change icon to pause	
	  else {
		  
		  //ic_play.attr('class', 'play active');
		  ic_play.classed('active', true);
		  
		  careless = false; // Once user starts playing, they are no more careless
		  
		  // hide the commit button
		  commit_button.attr('disabled', 'disabled');
		  
		  // hide the edit total streak option
		  d3.select('#total-edit-button').classed('disabled', true);
		  			//.attr('class', 'disabled');
		  
		  // We have to make sure that totalh is 0 if played on a new day!
		  // totalh and totalm may persist from the previous day
		  if(start_date !== date_today) {
			  totalh = 0;
			  totalm = 0;
			  // Also once played, consider that as a page load with fresh values for variables
			  start_date = date_today;
		  }
		 
		  // Moved the starting from inside of ajax success to outside of ajax request
		  // so as to start the timer immediately without waiting for response
		  // Cancel the play state if ajax fails!
		  starth = now.hour(); //response.starth; // duplicate of nowh - but ok!
		  startm = now.minute();//response.startm; // duplicate of nowm - but ok! we may change nowm
		  // Set the display
		  // Set all the divs: started-div, current-div, total-div and prev-div
		  display_divs_and_set_timer();

		  // Ajax post request to set the start time and active status
		  var xhr = new XMLHttpRequest();
		  // we send total time as well which will be available when the page is loaded
		  var params = '/?date='+date_today+'&active='+1+'&starth='+now.hour()+'&startm='+now.minute()+'&totalh='+totalh+'&totalm='+totalm;
		  //console.log(params);
		  xhr.open('POST', params);
		  xhr.send();
		  
		  xhr.onreadystatechange = function () {
				var DONE = 4; // readyState 4 means the request is done.
				var OK = 200; // status 200 is a successful return.
				if (xhr.readyState === DONE) {
				  if (xhr.status === OK) {
					  // No response from server for POST
					  // console.log('success');
					  // console.log(ic_play.classed('active'));
					  
				  }
				  else {
					d3.select('#started-div').style('color', 'red').text('Server Error! Please Retry');
					  
					// Reset to paused state
					//ic_play.attr('class', 'play');
					ic_play.classed('active', false);
					// stop timer
					clearInterval(timer_id);
				  }
					
				}
		  }; // End of Ajax POST
	  } // end of else
		
      return false;
     });
	

	  // First rendering of the calendar heatmap
	  var today_end = moment().endOf('day').toDate();
      var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
      var chartData = d3.time.days(yearAgo, today_end).map(function (dateElement) {
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

} // End window.onload

// 1h-45m should be formatted as 15m
function format_time_diff(h, m) {
	if (m < 0) {
		m += 60;
		h -= 1;
	}
	
	if (m >= 60) {
		h += 1;
		m -= 60;
	}
	return (h>0 ? h+'h ' : '') + m+'m';
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


// Format date as Jan-27-2017
function format_date(date_string) {
	// date_string 2017-01-29
	var year = parseInt(date_string.substr(0, 4), 10);
	var month = parseInt(date_string.substr(5,2), 10);
	var day = parseInt(date_string.substr(8,2), 10);
	
	out_string = day + '-' + months[month-1] + '-' + year;
	return out_string;
}



// calendar code
function calendarHeatmap() {
  // defaults
  var width = 720;
  var height = 110;
  var legendWidth = 150;
  // var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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



// Alerts from d3-bootstrap github
(function(exports) {

  var bootstrap = (typeof exports.bootstrap === "object")
    ? exports.bootstrap
    : (exports.bootstrap = {});

  var dismiss = '[data-dismiss="alert"]';

  bootstrap.alert = function() {
	//console.log('alert set');
    var alert = function(selection) {
      selection.select(dismiss)
        .on("click", close);
    };

    alert.close = function(selection) {
      selection.each(close);
    };

    function close() {
	
	  // sel is the close button
      sel = d3.select(this);
		
      if (d3.event) 
		  d3.event.preventDefault();

      target = sel.classed("alert") ? sel : d3.select(sel.node().parentNode);


      // TODO trigger?

      target.classed("in", false);
      if (target.classed("fade")) {
        // TODO prefixed events?
        target.on("transitionEnd", function() {
          target.remove();
        });
      } else {
        target.remove();
      }
    }

    return alert;
  };

  // TODO automatic delegation of alert closing?

})(this);